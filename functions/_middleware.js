// Protege o painel /crm e a API /api/admin com usuário e senha (HTTP Basic).
// Configure no Cloudflare Pages > Settings > Variables and Secrets:
//   CRM_SENHA   (obrigatório, tipo Secret)
//   CRM_USUARIO (opcional, padrão "admin")
const PROTEGIDO = /^\/(crm(\/|$)|api\/admin(\/|$))/;

function igual(a, b) {
  const ea = new TextEncoder().encode(a), eb = new TextEncoder().encode(b);
  let diff = ea.length ^ eb.length;
  for (let i = 0; i < Math.max(ea.length, eb.length); i++) diff |= (ea[i] || 0) ^ (eb[i] || 0);
  return diff === 0;
}

export async function onRequest({ request, env, next }) {
  const url = new URL(request.url);
  if (!PROTEGIDO.test(url.pathname)) return next();

  if (!env.CRM_SENHA) {
    return new Response("CRM bloqueado: defina a variável secreta CRM_SENHA no projeto do Cloudflare Pages.", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
  const usuario = env.CRM_USUARIO || "admin";
  const auth = request.headers.get("Authorization") || "";
  if (auth.startsWith("Basic ")) {
    let dec = "";
    try { dec = atob(auth.slice(6)); } catch (_) {}
    const i = dec.indexOf(":");
    if (i > -1 && igual(dec.slice(0, i), usuario) && igual(dec.slice(i + 1), env.CRM_SENHA)) {
      const res = await next();
      const out = new Response(res.body, res);
      out.headers.set("Cache-Control", "no-store");
      out.headers.set("X-Robots-Tag", "noindex, nofollow");
      return out;
    }
  }
  return new Response("Acesso restrito", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="CRM ON Resort", charset="UTF-8"', "Content-Type": "text/plain; charset=utf-8" }
  });
}
