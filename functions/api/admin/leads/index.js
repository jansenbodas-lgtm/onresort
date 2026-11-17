// GET /api/admin/leads — lista leads (JSON ou ?formato=csv). Protegido por senha (_middleware.js)
import { ensureSchema, getDb, json, handleError } from "../../../../lib/crm.js";

const COLS = ["id", "criado_em", "atualizado_em", "nome", "email", "telefone", "interesse", "objetivo", "origem", "status", "interacoes", "notas", "cidade", "pagina", "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "fbclid"];

export async function onRequestGet({ request, env }) {
  try {
    const db = getDb(env);
    await ensureSchema(db);
    const url = new URL(request.url);
    const where = [], params = [];
    const q = (url.searchParams.get("q") || "").trim();
    if (q) {
      where.push("(nome LIKE ? OR email LIKE ? OR telefone_digitos LIKE ? OR notas LIKE ?)");
      const like = `%${q}%`; params.push(like, like, `%${q.replace(/\D/g, "") || q}%`, like);
    }
    const status = url.searchParams.get("status");
    if (status) { where.push("status = ?"); params.push(status); }
    const interesse = url.searchParams.get("interesse");
    if (interesse) { where.push("interesse = ?"); params.push(interesse); }
    const sql = `SELECT ${COLS.join(",")} FROM leads ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY atualizado_em DESC LIMIT 2000`;
    const { results } = await db.prepare(sql).bind(...params).all();

    if (url.searchParams.get("formato") === "csv") {
      const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
      const csv = "﻿" + [COLS.join(";"), ...results.map((r) => COLS.map((c) => esc(r[c])).join(";"))].join("\r\n");
      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="leads-onresort-${new Date().toISOString().slice(0, 10)}.csv"`,
          "Cache-Control": "no-store"
        }
      });
    }

    const resumo = await db.prepare(`SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN date(criado_em) = date('now') THEN 1 ELSE 0 END) AS hoje,
        SUM(CASE WHEN criado_em >= datetime('now','-7 days') THEN 1 ELSE 0 END) AS semana,
        SUM(CASE WHEN status = 'novo' THEN 1 ELSE 0 END) AS novos,
        SUM(CASE WHEN objetivo = 'Investir' THEN 1 ELSE 0 END) AS investidores
      FROM leads`).first();
    return json({ ok: true, leads: results, resumo });
  } catch (err) {
    return handleError(err);
  }
}
