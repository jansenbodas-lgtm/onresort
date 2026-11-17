# ON Resort Cidade Jardim — Landing page

Landing page estática (HTML + CSS + JS puro, sem build) do lançamento **ON Resort Cidade Jardim** (RJZ Cyrela e Leblon Realty), na Barra Olímpica, RJ. Conteúdo e imagens extraídos do book digital do empreendimento.

## Estrutura
```
index.html            página única
assets/css/style.css  estilos (responsivo)
assets/js/config.js   ⚙️ configurações editáveis (WhatsApp, CRECI, webhook de leads)
assets/js/main.js     interações (modo Viver/Investir, abas, lightbox, formulários)
assets/img/           imagens recortadas do book
```

## Antes de publicar
1. Edite `assets/js/config.js`: número de WhatsApp, nome/CRECI e, se tiver, `formEndpoint` (webhook do CRM, RD Station, Zapier, Make, Apps Script, Formspree…). Sem endpoint, o lead é enviado direto para o WhatsApp.
2. Ajuste o `canonical` em `index.html` para o domínio final.
3. Cole o Google Tag Manager / Meta Pixel no `<head>` (o JS já envia os eventos `lead_submit` e `whatsapp_click` para o `dataLayer` e `fbq('track','Lead')`).

## Rodar localmente
```bash
python3 -m http.server 8000
```
Acesse http://localhost:8000.

## Publicação
No **Cloudflare Pages**: comando de build `npm run build` e diretório de saída `dist`. Também funciona sem comando de build, com diretório de saída `/`.

Qualquer hospedagem estática serve: Netlify, Vercel, Cloudflare Pages, GitHub Pages ou a hospedagem atual do site (basta subir os arquivos para a pasta `/onresort`).

## CRM de leads

Todo lead (formulários da página e popup do WhatsApp) é gravado no CRM próprio, mesmo que a pessoa não conclua a conversa no WhatsApp.

- **Banco:** Cloudflare D1 `onresort-crm` (tabela `leads`, ver `migrations/0001_leads.sql`).
- **API pública:** `POST /api/leads` (`functions/api/leads.js`). Deduplica pelo telefone e registra cada novo contato nas notas.
- **Painel:** `/crm`, com usuário e senha. Lista, busca, filtros, status do funil, notas, botão de WhatsApp para o lead e exportação CSV.
- **API do painel:** `/api/admin/leads` (protegida pelo mesmo login).

### Configuração no Cloudflare Pages (uma vez)
1. **Settings → Bindings → Add → D1 database**: nome da variável `DB`, banco `onresort-crm`.
2. **Settings → Variables and Secrets**: adicione `CRM_SENHA` (tipo *Secret*). Opcional: `CRM_USUARIO` (padrão `admin`) e `LEAD_WEBHOOK_URL` (recebe cada lead em JSON, para avisar no Make/Zapier/n8n/Slack).
3. Faça um novo deploy. O painel fica em `https://SEU-DOMINIO/crm`.

### Testar localmente
```bash
npm run build
npx wrangler pages dev dist --d1 DB=onresort-crm-local
```
Crie um arquivo `.dev.vars` com `CRM_SENHA=uma-senha` (já ignorado pelo git).
