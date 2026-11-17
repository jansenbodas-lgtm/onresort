// PATCH/DELETE /api/admin/leads/:id — atualiza status e notas ou exclui. Protegido por senha
import { getDb, json, handleError, HttpError, STATUS, clean } from "../../../../lib/crm.js";

function idDe(params) {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id < 1) throw new HttpError(400, "ID inválido");
  return id;
}

export async function onRequestPatch({ request, env, params }) {
  try {
    const id = idDe(params);
    const body = await request.json();
    const sets = [], vals = [];
    if (body.status !== undefined) {
      if (!STATUS.includes(body.status)) throw new HttpError(400, "Status inválido");
      sets.push("status = ?"); vals.push(body.status);
    }
    if (body.notas !== undefined) { sets.push("notas = ?"); vals.push(clean(body.notas, 5000)); }
    ["nome", "email", "telefone", "interesse", "objetivo"].forEach((c) => {
      if (body[c] !== undefined) { sets.push(`${c} = ?`); vals.push(clean(body[c], 160)); }
    });
    if (body.telefone !== undefined) { sets.push("telefone_digitos = ?"); vals.push(clean(body.telefone).replace(/\D/g, "")); }
    if (!sets.length) throw new HttpError(400, "Nada para atualizar");
    sets.push("atualizado_em = datetime('now')");
    const r = await getDb(env).prepare(`UPDATE leads SET ${sets.join(", ")} WHERE id = ?`).bind(...vals, id).run();
    if (!r.meta.changes) throw new HttpError(404, "Lead não encontrado");
    return json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}

export async function onRequestDelete({ env, params }) {
  try {
    const r = await getDb(env).prepare("DELETE FROM leads WHERE id = ?").bind(idDe(params)).run();
    if (!r.meta.changes) throw new HttpError(404, "Lead não encontrado");
    return json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
