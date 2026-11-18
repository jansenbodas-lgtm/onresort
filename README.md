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

- **Painel:** `https://onresort.lancamentobarra.com.br/admin` · login padrão **admin / admin**.
- **Pipeline:** Novo lead → Tentando contato → Consegui falar → Marcou visita → Visitou → Fez proposta → Venda fechada / Perdido. Arraste os cards entre as etapas.
- **Ficha do lead:** dados, unidade, valor, visita agendada, próxima ação, motivo de perda, observações, histórico (ligação, WhatsApp, e-mail, visita, nota) e atalhos de WhatsApp/ligar/e-mail.
- **Lista e CSV:** visão em tabela, busca, filtros e exportação.
- **Banco:** Cloudflare D1 `onresort-crm` (binding `DB`, já declarado no `wrangler.jsonc`). Estrutura em `migrations/0001_leads.sql`; o Worker cria as tabelas se faltarem.
- **API:** `POST /api/leads` é público (usado pelo site, deduplica pelo telefone). Leitura, edição, exclusão e notas em `/api/leads` exigem o login.

### Meta Ads (Pixel + API de Conversões)
- **Pixel** `650460263189144` no site: PageView em toda visita e **Lead** a cada envio de formulário/popup.
- **API de Conversões** (servidor, `src/meta.js`):
  - **Lead** (evento padrão) em todo lead, do site e cadastrado manualmente. Leads do site usam o mesmo `event_id` do Pixel, então a Meta deduplica.
  - **Eventos personalizados por etapa** do CRM: `CRM_NovoLead`, `CRM_TentandoContato`, `CRM_ConseguiFalar`, `CRM_MarcouVisita`, `CRM_Visitou`, `CRM_FezProposta`, `CRM_VendaFechada` e `CRM_Perdido`. Proposta e venda levam `value` e `currency` (BRL) quando o valor está preenchido.
  - Dados do cliente (e-mail, telefone, nome) vão com hash SHA-256, além de `fbp`, `fbc`, IP e navegador quando o lead veio do site.
  - Cada envio fica registrado no histórico do lead no CRM (📣 Meta Ads).
- **Configuração obrigatória:** Secret `META_CAPI_TOKEN` com o token da API de Conversões. Sem ele, só o Pixel do navegador funciona.
- Opcional: `META_TEST_EVENT_CODE` para ver os eventos na aba *Testar eventos* do Gerenciador de Eventos (remova depois do teste).

### Google Ads
- Tag do Google `AW-10894823435` em todas as páginas (visitas e remarketing), com conversões otimizadas (e-mail, telefone e nome do lead; o Google aplica o hash).
- Em todo lead do site: evento `generate_lead` e, quando o rótulo estiver preenchido em `assets/js/config.js` (`googleAdsLeadLabel`), a conversão `AW-10894823435/<rótulo>`.

### Bloqueadores de anúncio
- **Meta:** a página passa pelo Worker (`run_worker_first`), que grava os cookies `_fbp`/`_fbc` no próprio domínio e envia o **PageView** pela API de Conversões. Lead e etapas já saem do servidor. Com o Pixel bloqueado, nada se perde; sem bloqueio, o Pixel usa o mesmo `event_id` e a Meta deduplica.
- **Google Ads:** a tag só roda no navegador. O CRM guarda o `gclid` e o botão **CSV Google Ads** no `/admin` gera o arquivo de conversões off-line (CRM_NovoLead e cada etapa, com valor em proposta/venda) para enviar em *Metas > Conversões > Uploads*. Crie no Google Ads ações de conversão do tipo "Importar > Cliques" com esses mesmos nomes.
- Os botões de contato não usam classes nem links `wa.me` no HTML, que filtros de "incômodos" costumam esconder.

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
