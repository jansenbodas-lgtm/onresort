// Build sem dependências: copia o site estático para dist/ e versiona CSS/JS
// (adiciona ?v=<hash do conteúdo> nas referências do index.html para que o
// navegador sempre baixe a versão nova depois de cada deploy).
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const root = path.join(__dirname, "..");
const out = path.join(root, "dist");
const items = ["index.html", "assets", "_headers", "robots.txt", "sitemap.xml"];

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
for (const item of items) {
  const src = path.join(root, item);
  if (fs.existsSync(src)) fs.cpSync(src, path.join(out, item), { recursive: true });
}

const indexPath = path.join(out, "index.html");
let html = fs.readFileSync(indexPath, "utf8");
html = html.replace(/(href|src)="(assets\/(?:css|js)\/[^"?]+\.(?:css|js))"/g, (m, attr, ref) => {
  const file = path.join(out, ref);
  if (!fs.existsSync(file)) return m;
  const hash = crypto.createHash("sha1").update(fs.readFileSync(file)).digest("hex").slice(0, 10);
  return `${attr}="${ref}?v=${hash}"`;
});
fs.writeFileSync(indexPath, html);
console.log("Build concluído em dist/ (CSS/JS versionados)");
