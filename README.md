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

## CRM de leads (Worker `onresort`)

O site roda como Cloudflare Worker com arquivos estáticos (`wrangler.jsonc` + `src/worker.js`).
Todo lead (formulários e popup do WhatsApp) é gravado no CRM, mesmo que a pessoa não conclua a conversa no WhatsApp.

- **Painel:** `https://onresort.jansenbodas.workers.dev/admin` · login padrão **admin / admin**.
- **Pipeline:** Novo lead → Tentando contato → Consegui falar → Marcou visita → Visitou → Fez proposta → Venda fechada / Perdido. Arraste os cards entre as etapas.
- **Ficha do lead:** dados, unidade, valor, visita agendada, próxima ação, motivo de perda, observações, histórico (ligação, WhatsApp, e-mail, visita, nota) e atalhos de WhatsApp/ligar/e-mail.
- **Lista e CSV:** visão em tabela, busca, filtros e exportação.
- **Banco:** Cloudflare D1 `onresort-crm` (binding `DB`, já declarado no `wrangler.jsonc`). Estrutura em `migrations/0001_leads.sql`; o Worker cria as tabelas se faltarem.
- **API:** `POST /api/leads` é público (usado pelo site, deduplica pelo telefone). Leitura, edição, exclusão e notas em `/api/leads` exigem o login.

### Variáveis opcionais (Workers > onresort > Settings > Variables and Secrets)
- `CRM_SENHA` (Secret): troca a senha padrão `admin`. `CRM_USUARIO` troca o usuário.
- `LEAD_WEBHOOK_URL`: recebe cada lead em JSON (Make, Zapier, n8n, Slack).

### Deploy
Workers Builds: comando de build `npm run build`, comando de deploy `npx wrangler deploy`.

### Testar localmente
```bash
npm run build
npx wrangler dev --local
```
Acesse http://localhost:8787 e http://localhost:8787/admin (admin/admin).
