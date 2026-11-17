// POST /api/leads — recebe leads da landing page (formulários e popup do WhatsApp)
import { ensureSchema, getDb, json, handleError, HttpError, clean } from "../../lib/crm.js";

const CAMPOS_UTM = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "fbclid"];

export async function onRequestPost({ request, env, waitUntil }) {
  try {
    const len = Number(request.headers.get("content-length") || 0);
    if (len > 10000) throw new HttpError(413, "Payload muito grande");
    let body;
    const ct = request.headers.get("content-type") || "";
    if (ct.includes("application/json") || ct.includes("text/plain")) body = JSON.parse(await request.text());
    else body = Object.fromEntries(await request.formData());

    if (clean(body.website)) return json({ ok: true }); // honeypot anti-spam

    const lead = {
      nome: clean(body.nome, 120),
      email: clean(body.email, 160).toLowerCase(),
      telefone: clean(body.telefone, 30),
      interesse: clean(body.interesse, 80),
      objetivo: clean(body.objetivo, 40),
      origem: clean(body.origem, 60) || "site",
      pagina: clean(body.pagina, 400)
    };
    lead.telefone_digitos = lead.telefone.replace(/\D/g, "");
    if (lead.nome.length < 2) throw new HttpError(400, "Informe o nome");
    if (lead.telefone_digitos.length < 10) throw new HttpError(400, "Telefone inválido");
    if (lead.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(lead.email)) throw new HttpError(400, "E-mail inválido");
    CAMPOS_UTM.forEach((k) => (lead[k] = clean(body[k], 200)));
    const cf = request.cf || {};
    lead.cidade = [cf.city, cf.region].filter(Boolean).join(" / ");
    lead.user_agent = clean(request.headers.get("user-agent"), 300);

    const db = getDb(env);
    await ensureSchema(db);

    const existente = await db.prepare("SELECT id, notas FROM leads WHERE telefone_digitos = ? ORDER BY id DESC LIMIT 1")
      .bind(lead.telefone_digitos).first();

    let id, novo;
    const agora = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
    if (existente) {
      id = existente.id; novo = false;
      const nota = `[${agora}] Novo contato pelo site (${lead.origem})${lead.interesse ? " · interesse: " + lead.interesse : ""}`;
      await db.prepare(`UPDATE leads SET
          nome = COALESCE(NULLIF(?, ''), nome), email = COALESCE(NULLIF(?, ''), email), telefone = ?,
          interesse = COALESCE(NULLIF(?, ''), interesse), objetivo = COALESCE(NULLIF(?, ''), objetivo),
          origem = ?, interacoes = interacoes + 1, atualizado_em = datetime('now'),
          notas = TRIM(COALESCE(notas, '') || char(10) || ?, char(10))
        WHERE id = ?`)
        .bind(lead.nome, lead.email, lead.telefone, lead.interesse, lead.objetivo, lead.origem, nota, id).run();
    } else {
      novo = true;
      const cols = ["nome", "email", "telefone", "telefone_digitos", "interesse", "objetivo", "origem", "pagina", ...CAMPOS_UTM, "cidade", "user_agent"];
      const r = await db.prepare(`INSERT INTO leads (${cols.join(",")}) VALUES (${cols.map(() => "?").join(",")})`)
        .bind(...cols.map((c) => lead[c] || null)).run();
      id = r.meta.last_row_id;
    }

    // Notificação opcional (Make, Zapier, n8n, Slack...): defina LEAD_WEBHOOK_URL nas variáveis do projeto
    if (env.LEAD_WEBHOOK_URL) {
      waitUntil(fetch(env.LEAD_WEBHOOK_URL, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, novo, empreendimento: "ON Resort Cidade Jardim", ...lead, user_agent: undefined })
      }).catch(() => {}));
    }
    return json({ ok: true, id, novo });
  } catch (err) {
    if (err instanceof SyntaxError) return json({ ok: false, erro: "JSON inválido" }, 400);
    return handleError(err);
  }
}

export function onRequest() {
  return json({ ok: false, erro: "Método não permitido" }, 405, { Allow: "POST" });
}
