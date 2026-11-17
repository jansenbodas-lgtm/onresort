CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now')),
  nome TEXT,
  email TEXT,
  telefone TEXT,
  telefone_digitos TEXT,
  interesse TEXT,
  objetivo TEXT,
  origem TEXT,
  pagina TEXT,
  utm_source TEXT, utm_medium TEXT, utm_campaign TEXT, utm_term TEXT, utm_content TEXT,
  gclid TEXT, fbclid TEXT,
  status TEXT NOT NULL DEFAULT 'novo',
  notas TEXT,
  interacoes INTEGER NOT NULL DEFAULT 1,
  cidade TEXT,
  user_agent TEXT
);
CREATE INDEX IF NOT EXISTS idx_leads_tel ON leads(telefone_digitos);
CREATE INDEX IF NOT EXISTS idx_leads_criado ON leads(criado_em);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
