// Utilitários compartilhados do CRM (Cloudflare Pages Functions + D1)
export const STATUS = ["novo", "em_contato", "visita", "proposta", "vendido", "perdido"];

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS leads (id INTEGER PRIMARY KEY AUTOINCREMENT, criado_em TEXT NOT NULL DEFAULT (datetime('now')), atualizado_em TEXT NOT NULL DEFAULT (datetime('now')), nome TEXT, email TEXT, telefone TEXT, telefone_digitos TEXT, interesse TEXT, objetivo TEXT, origem TEXT, pagina TEXT, utm_source TEXT, utm_medium TEXT, utm_campaign TEXT, utm_term TEXT, utm_content TEXT, gclid TEXT, fbclid TEXT, status TEXT NOT NULL DEFAULT 'novo', notas TEXT, interacoes INTEGER NOT NULL DEFAULT 1, cidade TEXT, user_agent TEXT)`,
  `CREATE INDEX IF NOT EXISTS idx_leads_tel ON leads(telefone_digitos)`,
  `CREATE INDEX IF NOT EXISTS idx_leads_criado ON leads(criado_em)`,
  `CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status)`
];
let schemaOk = false;
export async function ensureSchema(db) {
  if (schemaOk) return;
  await db.batch(SCHEMA.map((s) => db.prepare(s)));
  schemaOk = true;
}

export function getDb(env) {
  if (!env.DB) throw new HttpError(500, "Banco não configurado: adicione o binding D1 com o nome DB no projeto do Cloudflare Pages.");
  return env.DB;
}

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers }
  });
}

export function handleError(err) {
  const status = err instanceof HttpError ? err.status : 500;
  if (status === 500) console.error(err);
  return json({ ok: false, erro: err.message || "Erro interno" }, status);
}

export const clean = (v, max = 300) => (typeof v === "string" ? v.trim().slice(0, max) : v == null ? "" : String(v).trim().slice(0, max));
