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
Qualquer hospedagem estática serve: Netlify, Vercel, Cloudflare Pages, GitHub Pages ou a hospedagem atual do site (basta subir os arquivos para a pasta `/onresort`).
