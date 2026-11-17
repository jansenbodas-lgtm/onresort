// Integração com a API de Conversões da Meta (Facebook/Instagram Ads)
//
// - Evento padrão "Lead" em todo lead (site e cadastro manual). Leads do site usam
//   o mesmo event_id do Pixel do navegador, então a Meta conta uma vez só.
// - Evento personalizado a cada etapa do CRM (inclusive a etapa inicial).
//
// Configuração (Workers > onresort > Settings > Variables and Secrets):
//   META_PIXEL_ID         ID do pixel (já definido no wrangler.jsonc)
//   META_CAPI_TOKEN       token da API de Conversões (tipo Secret — nunca no código)
//   META_TEST_EVENT_CODE  opcional: código de teste do Gerenciador de Eventos
//   META_API_VERSION      opcional: versão da Graph API (padrão v23.0)

export const STAGE_EVENT = {
  novo: "CRM_NovoLead",
  tentando_contato: "CRM_TentandoContato",
  consegui_falar: "CRM_ConseguiFalar",
  visita_marcada: "CRM_MarcouVisita",
  visitou: "CRM_Visitou",
  proposta: "CRM_FezProposta",
  venda: "CRM_VendaFechada",
  perdido: "CRM_Perdido"
};

const enc = new TextEncoder();
async function sha256(value) {
  const buf = await crypto.subtle.digest("SHA-256", enc.encode(value));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
const norm = (s) => String(s || "").trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

// Dados do cliente no formato da Meta (dados pessoais com hash SHA-256)
export async function userData(lead) {
  const u = {};
  const email = norm(lead.email);
  if (email) u.em = [await sha256(email)];
  let ph = String(lead.telefone_digitos || lead.telefone || "").replace(/\D/g, "");
  if (ph.length === 10 || ph.length === 11) ph = "55" + ph;
  if (ph) u.ph = [await sha256(ph)];
  const partes = norm(lead.nome).replace(/[^a-z\s]/g, "").split(/\s+/).filter(Boolean);
  if (partes[0]) u.fn = [await sha256(partes[0])];
  if (partes.length > 1) u.ln = [await sha256(partes[partes.length - 1])];
  if (lead.id) u.external_id = [await sha256("onresort-" + lead.id)];
  u.country = [await sha256("br")];
  if (lead.client_ip) u.client_ip_address = lead.client_ip;
  if (lead.user_agent) u.client_user_agent = lead.user_agent;
  if (lead.fbp) u.fbp = lead.fbp;
  if (lead.fbc) u.fbc = lead.fbc;
  return u;
}

function customData(lead, extra) {
  const c = { content_name: "ON Resort Cidade Jardim", content_category: "Imóvel - lançamento" };
  if (lead.interesse) c.interesse = lead.interesse;
  if (lead.objetivo) c.objetivo = lead.objetivo;
  if (lead.origem) c.origem = String(lead.origem).slice(0, 120);
  if (lead.stage) c.etapa = lead.stage;
  return Object.assign(c, extra || {});
}

export function metaEnabled(env) {
  return !!(env.META_PIXEL_ID && env.META_CAPI_TOKEN);
}

async function send(env, events) {
  if (!metaEnabled(env)) return { ok: false, skipped: true };
  const version = env.META_API_VERSION || "v23.0";
  const base = env.META_ENDPOINT || "https://graph.facebook.com"; // META_ENDPOINT só para testes locais
  const url = `${base}/${version}/${env.META_PIXEL_ID}/events?access_token=${encodeURIComponent(env.META_CAPI_TOKEN)}`;
  const body = { data: events };
  if (env.META_TEST_EVENT_CODE) body.test_event_code = env.META_TEST_EVENT_CODE;
  try {
    const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) return { ok: false, error: (d.error && d.error.message) || `HTTP ${r.status}` };
    return { ok: true, received: d.events_received };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * Evento padrão Lead (+ evento personalizado da etapa inicial, se for um lead novo).
 * opts: { eventId, novo, manual, sourceUrl }
 */
export async function sendLead(env, lead, opts) {
  const t = Math.floor(Date.now() / 1000);
  const ud = await userData(lead);
  const fromSite = !opts.manual;
  const base = fromSite
    ? { action_source: "website", event_source_url: opts.sourceUrl || undefined }
    : { action_source: "system_generated" };
  const events = [{
    event_name: "Lead",
    event_time: t,
    event_id: opts.eventId || `lead_${lead.id}_${t}`,
    ...base,
    user_data: ud,
    custom_data: customData(lead)
  }];
  if (opts.novo) {
    const stage = lead.stage || "novo";
    events.push({
      event_name: STAGE_EVENT[stage] || "CRM_" + stage,
      event_time: t,
      event_id: `etapa_${lead.id}_${stage}_${t}`,
      action_source: "system_generated",
      user_data: ud,
      custom_data: customData(lead)
    });
  }
  return { names: events.map((e) => e.event_name), ...(await send(env, events)) };
}

/** Evento personalizado quando o lead muda de etapa no CRM. */
export async function sendStage(env, lead) {
  const t = Math.floor(Date.now() / 1000);
  const name = STAGE_EVENT[lead.stage] || "CRM_" + lead.stage;
  const extra = {};
  if (lead.valor && (lead.stage === "proposta" || lead.stage === "venda")) {
    extra.value = Number(lead.valor);
    extra.currency = "BRL";
  }
  if (lead.stage === "perdido" && lead.motivo_perda) extra.motivo_perda = lead.motivo_perda;
  const ev = {
    event_name: name,
    event_time: t,
    event_id: `etapa_${lead.id}_${lead.stage}_${t}`,
    action_source: "system_generated",
    user_data: await userData(lead),
    custom_data: customData(lead, extra)
  };
  return { names: [name], ...(await send(env, [ev])) };
}
