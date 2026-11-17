-- Estrutura do CRM (o Worker também cria as tabelas automaticamente se não existirem)
CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  nome TEXT NOT NULL,
  telefone TEXT NOT NULL,
  telefone_digitos TEXT,
  email TEXT,
  interesse TEXT,
  objetivo TEXT,
  stage TEXT NOT NULL DEFAULT 'novo',
  origem TEXT,
  cta TEXT,
  unidade TEXT,
  valor REAL,
  visita_em TEXT,
  proxima_acao TEXT,
  motivo_perda TEXT,
  observacoes TEXT,
  utm_source TEXT, utm_medium TEXT, utm_campaign TEXT, utm_term TEXT, utm_content TEXT,
  gclid TEXT, fbclid TEXT,
  referrer TEXT,
  pagina TEXT,
  cidade TEXT,
  user_agent TEXT
);
CREATE INDEX IF NOT EXISTS idx_leads_tel ON leads(telefone_digitos);
CREATE INDEX IF NOT EXISTS idx_leads_stage ON leads(stage);
CREATE INDEX IF NOT EXISTS idx_leads_updated ON leads(updated_at);

CREATE TABLE IF NOT EXISTS atividades (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  tipo TEXT NOT NULL DEFAULT 'nota',
  texto TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ativ_lead ON atividades(lead_id);
