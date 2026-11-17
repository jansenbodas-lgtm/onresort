// Worker do ON Resort Cidade Jardim
// - Serve a landing page (arquivos estáticos em dist/)
// - POST /api/leads: recebe leads do site (formulários e popup do WhatsApp)
// - /admin: CRM com pipeline (login padrão admin/admin; CRM_SENHA substitui a senha)
// - /api/leads (GET/PATCH/DELETE) e /api/leads/:id/notas: API do CRM, protegida
import ADMIN_HTML from "./admin.html";
import { sendLead as metaLead, sendStage as metaStage, metaEnabled } from "./meta.js";

export const STAGES = ["novo", "tentando_contato", "consegui_falar", "visita_marcada", "visitou", "proposta", "venda", "perdido"];
export const STAGE_LABEL = {
  novo: "Novo lead",
  tentando_contato: "Tentando contato",
  consegui_falar: "Consegui falar",
  visita_marcada: "Marcou visita",
  visitou: "Visitou",
  proposta: "Fez proposta",
  venda: "Venda fechada",
  perdido: "Perdido"
};
const EDITABLE = ["nome", "telefone", "email", "interesse", "objetivo", "origem", "cta", "unidade", "valor", "visita_em", "proxima_acao", "motivo_perda", "observacoes"];
const TIPOS_ATIVIDADE = ["nota", "ligacao", "whatsapp", "email", "visita"];
const UTM = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "fbclid"];

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS leads (id INTEGER PRIMARY KEY AUTOINCREMENT, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), nome TEXT NOT NULL, telefone TEXT NOT NULL, telefone_digitos TEXT, email TEXT, interesse TEXT, objetivo TEXT, stage TEXT NOT NULL DEFAULT 'novo', origem TEXT, cta TEXT, unidade TEXT, valor REAL, visita_em TEXT, proxima_acao TEXT, motivo_perda TEXT, observacoes TEXT, utm_source TEXT, utm_medium TEXT, utm_campaign TEXT, utm_term TEXT, utm_content TEXT, gclid TEXT, fbclid TEXT, referrer TEXT, pagina TEXT, cidade TEXT, user_agent TEXT, fbp TEXT, fbc TEXT, client_ip TEXT)`,
  `CREATE INDEX IF NOT EXISTS idx_leads_tel ON leads(telefone_digitos)`,
  `CREATE INDEX IF NOT EXISTS idx_leads_stage ON leads(stage)`,
  `CREATE INDEX IF NOT EXISTS idx_leads_updated ON leads(updated_at)`,
  `CREATE TABLE IF NOT EXISTS atividades (id INTEGER PRIMARY KEY AUTOINCREMENT, lead_id INTEGER NOT NULL, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), tipo TEXT NOT NULL DEFAULT 'nota', texto TEXT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_ativ_lead ON atividades(lead_id)`
];
let schemaOk = false;
async function ensureSchema(db) {
  if (schemaOk) return;
  await db.batch(SCHEMA.map((s) => db.prepare(s)));
  // migração: colunas adicionadas depois (integração Meta)
  const { results } = await db.prepare("PRAGMA table_info(leads)").all();
  const existentes = new Set(results.map((c) => c.name));
  for (const col of ["fbp", "fbc", "client_ip"]) {
    if (!existentes.has(col)) await db.prepare(`ALTER TABLE leads ADD COLUMN ${col} TEXT`).run();
  }
  schemaOk = true;
}

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
});
const clean = (v, max = 500) => (v == null ? null : String(v).trim().slice(0, max) || null);
const now = () => new Date().toISOString();
const digitsOf = (t) => String(t || "").replace(/\D/g, "");

async function readBody(request) {
  const type = request.headers.get("content-type") || "";
  if (type.includes("application/json")) return request.json();
  if (type.includes("form")) return Object.fromEntries(await request.formData());
  try { return JSON.parse(await request.text()); } catch { return {}; }
}

/* ---------- Autenticação (HTTP Basic) ---------- */
function same(a, b) {
  const ea = new TextEncoder().encode(a), eb = new TextEncoder().encode(b);
  let diff = ea.length ^ eb.length;
  for (let i = 0; i < Math.max(ea.length, eb.length); i++) diff |= (ea[i] || 0) ^ (eb[i] || 0);
  return diff === 0;
}
function isAdmin(request, env) {
  const auth = request.headers.get("authorization") || "";
  if (!auth.startsWith("Basic ")) return false;
  let dec = "";
  try { dec = atob(auth.slice(6)); } catch { return false; }
  const i = dec.indexOf(":");
  return i > -1 && same(dec.slice(0, i), env.CRM_USUARIO || "admin") && same(dec.slice(i + 1), env.CRM_SENHA || "admin");
}
const unauthorized = () => new Response("Acesso restrito ao CRM", {
  status: 401,
  headers: { "www-authenticate": 'Basic realm="CRM ON Resort", charset="UTF-8"', "content-type": "text/plain; charset=utf-8" }
});

/* ---------- Leads ---------- */
async function logActivity(db, leadId, tipo, texto) {
  await db.prepare("INSERT INTO atividades (lead_id, tipo, texto) VALUES (?, ?, ?)").bind(leadId, tipo, texto).run();
}

async function getLead(db, id) {
  const lead = await db.prepare("SELECT * FROM leads WHERE id = ?").bind(id).first();
  if (!lead) return null;
  const { results } = await db.prepare("SELECT * FROM atividades WHERE lead_id = ? ORDER BY created_at DESC, id DESC").bind(id).all();
  return { ...lead, atividades: results };
}

async function createLead(request, env, admin, ctx) {
  const b = await readBody(request);
  if (clean(b.website)) return json({ ok: true }); // honeypot
  const nome = clean(b.nome, 120);
  const telefone = clean(b.telefone, 40);
  const digits = digitsOf(telefone);
  if (!nome || nome.length < 2 || digits.length < 10) return json({ ok: false, error: "Informe nome e telefone válidos." }, 400);
  const email = clean(b.email, 160);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return json({ ok: false, error: "E-mail inválido." }, 400);

  // cadastro manual pelo CRM (só com login): marca "manual" e permite campos extras
  const manual = admin && (b.manual === true || b.manual === "1" || b.manual === "true");
  const origem = clean(b.origem, 160) || (manual ? "Cadastro manual" : "site");
  const cta = clean(b.cta, 120);
  const interesse = clean(b.interesse, 80);
  const via = manual ? `cadastro manual (${origem})` : `site · ${origem}`;

  // identificadores para a Meta (só faz sentido em leads vindos do site)
  const fbp = manual ? null : clean(b.fbp, 200);
  const fbc = manual ? null : clean(b.fbc, 300);
  const clientIp = manual ? null : clean(request.headers.get("cf-connecting-ip"), 64);
  const eventId = clean(b.event_id, 80);
  const sourceUrl = clean(b.pagina, 400);

  const dup = await env.DB.prepare("SELECT id FROM leads WHERE telefone_digitos = ? ORDER BY id DESC LIMIT 1").bind(digits).first();
  if (dup) {
    await env.DB.prepare(`UPDATE leads SET nome = COALESCE(?, nome), email = COALESCE(?, email), interesse = COALESCE(?, interesse),
        objetivo = COALESCE(?, objetivo), fbp = COALESCE(?, fbp), fbc = COALESCE(?, fbc), client_ip = COALESCE(?, client_ip),
        user_agent = COALESCE(?, user_agent), updated_at = ? WHERE id = ?`)
      .bind(manual ? null : nome, email, interesse, clean(b.objetivo, 40), fbp, fbc, clientIp,
        manual ? null : clean(request.headers.get("user-agent"), 300), now(), dup.id).run();
    await logActivity(env.DB, dup.id, "sistema", `Novo contato pelo ${via}${interesse ? ` (${interesse})` : ""}`);
    notify(env, ctx, { id: dup.id, duplicado: true, nome, telefone, email, interesse, origem, cta });
    metaInBackground(env, ctx, dup.id, (lead) => metaLead(env, lead, { eventId, novo: false, manual, sourceUrl }));
    return json({ ok: true, id: dup.id, duplicado: true });
  }

  const cf = request.cf || {};
  const row = {
    nome, telefone, telefone_digitos: digits, email, interesse,
    objetivo: clean(b.objetivo, 40),
    stage: admin && STAGES.includes(b.stage) ? b.stage : "novo",
    origem, cta,
    observacoes: admin ? clean(b.observacoes, 4000) : null,
    unidade: manual ? clean(b.unidade, 120) : null,
    proxima_acao: manual ? clean(b.proxima_acao, 300) : null,
    visita_em: manual ? clean(b.visita_em, 40) : null,
    referrer: manual ? null : clean(b.referrer, 300),
    pagina: manual ? null : clean(b.pagina, 400),
    // em cadastro manual a localização/navegador seriam os do corretor, não do cliente
    cidade: manual ? null : [cf.city, cf.region].filter(Boolean).join(" / ") || null,
    user_agent: manual ? null : clean(request.headers.get("user-agent"), 300),
    fbp, fbc, client_ip: clientIp
  };
  UTM.forEach((k) => (row[k] = clean(b[k], 160)));
  const cols = Object.keys(row);
  const r = await env.DB.prepare(`INSERT INTO leads (${cols.join(",")}) VALUES (${cols.map(() => "?").join(",")})`)
    .bind(...cols.map((c) => row[c])).run();
  const id = r.meta.last_row_id;
  await logActivity(env.DB, id, "sistema", manual ? `Lead cadastrado manualmente · origem: ${origem}` : `Lead recebido pelo ${via}`);
  notify(env, ctx, { id, duplicado: false, nome, telefone, email, interesse, objetivo: row.objetivo, origem, cta });
  metaInBackground(env, ctx, id, (lead) => metaLead(env, lead, { eventId, novo: true, manual, sourceUrl }));
  return json({ ok: true, id }, 201);
}

// Envia eventos à Meta sem atrasar a resposta e registra o resultado no histórico do lead
function metaInBackground(env, ctx, leadId, fn) {
  if (!metaEnabled(env)) return;
  ctx.waitUntil((async () => {
    try {
      const lead = await env.DB.prepare("SELECT * FROM leads WHERE id = ?").bind(leadId).first();
      if (!lead) return;
      const r = await fn(lead);
      const nomes = (r.names || []).join(" + ");
      await logActivity(env.DB, leadId, "meta", r.ok ? `Meta Ads: ${nomes} enviado` : `Meta Ads: falha ao enviar ${nomes} (${r.error})`);
    } catch (err) {
      console.error("meta", err);
    }
  })());
}

// Aviso opcional a cada lead (Make, Zapier, n8n, Slack…): variável LEAD_WEBHOOK_URL
function notify(env, ctx, data) {
  if (!env.LEAD_WEBHOOK_URL) return;
  ctx.waitUntil(fetch(env.LEAD_WEBHOOK_URL, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ empreendimento: "ON Resort Cidade Jardim", ...data })
  }).catch(() => {}));
}

async function listLeads(url, env) {
  const { results } = await env.DB.prepare(
    `SELECT l.*, (SELECT texto FROM atividades a WHERE a.lead_id = l.id AND a.tipo NOT IN ('sistema','etapa','meta') ORDER BY a.id DESC LIMIT 1) AS ultima_nota,
            (SELECT COUNT(*) FROM atividades a WHERE a.lead_id = l.id AND a.tipo = 'sistema') AS contatos
     FROM leads l ORDER BY l.updated_at DESC LIMIT 3000`
  ).all();
  if (url.searchParams.get("formato") === "csv") {
    const cols = ["id", "created_at", "updated_at", "nome", "telefone", "email", "interesse", "objetivo", "stage", "origem", "cta", "unidade", "valor", "visita_em", "proxima_acao", "motivo_perda", "observacoes", "ultima_nota", "cidade", ...UTM, "pagina"];
    const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = "﻿" + [cols.join(";"), ...results.map((r) => cols.map((c) => esc(c === "stage" ? STAGE_LABEL[r[c]] || r[c] : r[c])).join(";"))].join("\r\n");
    return new Response(csv, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="leads-onresort-${now().slice(0, 10)}.csv"`,
        "cache-control": "no-store"
      }
    });
  }
  return json({ ok: true, stages: STAGES.map((s) => ({ id: s, label: STAGE_LABEL[s] })), leads: results });
}

async function updateLead(id, request, env, ctx) {
  const current = await env.DB.prepare("SELECT * FROM leads WHERE id = ?").bind(id).first();
  if (!current) return json({ ok: false, error: "Lead não encontrado." }, 404);
  const b = await readBody(request);
  const sets = [], vals = [];
  for (const k of EDITABLE) {
    if (!(k in b)) continue;
    let v;
    if (k === "valor") {
      v = b[k] === "" || b[k] == null ? null : Number(String(b[k]).replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", "."));
      if (Number.isNaN(v)) v = null;
    } else v = clean(b[k], k === "observacoes" ? 4000 : 300);
    if ((k === "nome" || k === "telefone") && !v) continue;
    sets.push(`${k} = ?`); vals.push(v);
    if (k === "telefone") { sets.push("telefone_digitos = ?"); vals.push(digitsOf(v)); }
  }
  const mudouEtapa = b.stage && STAGES.includes(b.stage) && b.stage !== current.stage;
  if (mudouEtapa) {
    sets.push("stage = ?"); vals.push(b.stage);
    await logActivity(env.DB, id, "etapa", `${STAGE_LABEL[current.stage] || current.stage} → ${STAGE_LABEL[b.stage]}`);
  }
  if (sets.length) {
    sets.push("updated_at = ?"); vals.push(now());
    await env.DB.prepare(`UPDATE leads SET ${sets.join(", ")} WHERE id = ?`).bind(...vals, id).run();
  }
  if (mudouEtapa) metaInBackground(env, ctx, id, (lead) => metaStage(env, lead));
  return json({ ok: true, lead: await getLead(env.DB, id) });
}

async function addNote(id, request, env) {
  const b = await readBody(request);
  const texto = clean(b.texto, 4000);
  if (!texto) return json({ ok: false, error: "Escreva a anotação." }, 400);
  const exists = await env.DB.prepare("SELECT id FROM leads WHERE id = ?").bind(id).first();
  if (!exists) return json({ ok: false, error: "Lead não encontrado." }, 404);
  const tipo = TIPOS_ATIVIDADE.includes(b.tipo) ? b.tipo : "nota";
  await logActivity(env.DB, id, tipo, texto);
  await env.DB.prepare("UPDATE leads SET updated_at = ? WHERE id = ?").bind(now(), id).run();
  return json({ ok: true, lead: await getLead(env.DB, id) }, 201);
}

async function handleApi(request, env, url, ctx) {
  if (!env.DB) return json({ ok: false, error: "Banco de dados não configurado (binding DB)." }, 500);
  await ensureSchema(env.DB);
  const parts = url.pathname.replace(/\/+$/, "").split("/").slice(2);
  const m = request.method;
  if (parts[0] !== "leads") return json({ ok: false, error: "Rota não encontrada." }, 404);
  const admin = isAdmin(request, env);

  if (parts.length === 1 && m === "POST") return createLead(request, env, admin, ctx); // público
  if (!admin) return unauthorized();
  if (parts.length === 1 && m === "GET") return listLeads(url, env);

  const id = Number(parts[1]);
  if (!Number.isInteger(id) || id <= 0) return json({ ok: false, error: "ID inválido." }, 400);
  if (parts.length === 2) {
    if (m === "GET") {
      const l = await getLead(env.DB, id);
      return l ? json({ ok: true, lead: l }) : json({ ok: false, error: "Lead não encontrado." }, 404);
    }
    if (m === "PATCH") return updateLead(id, request, env, ctx);
    if (m === "DELETE") {
      await env.DB.batch([
        env.DB.prepare("DELETE FROM atividades WHERE lead_id = ?").bind(id),
        env.DB.prepare("DELETE FROM leads WHERE id = ?").bind(id)
      ]);
      return json({ ok: true });
    }
  }
  if (parts.length === 3 && parts[2] === "notas" && m === "POST") return addNote(id, request, env);
  return json({ ok: false, error: "Método não permitido." }, 405);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      try {
        return await handleApi(request, env, url, ctx);
      } catch (err) {
        console.error(err);
        return json({ ok: false, error: "Erro interno." }, 500);
      }
    }
    if (url.pathname === "/admin" || url.pathname.startsWith("/admin/")) {
      if (!isAdmin(request, env)) return unauthorized();
      return new Response(ADMIN_HTML, {
        headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex, nofollow" }
      });
    }
    return env.ASSETS.fetch(request);
  }
};
