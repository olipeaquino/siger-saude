CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  sobrenome TEXT NOT NULL,
  cpf TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  senha_hash TEXT NOT NULL,
  senha_salt TEXT NOT NULL,
  senha_iteracoes INTEGER NOT NULL,
  is_admin INTEGER NOT NULL DEFAULT 0,
  deve_trocar_senha INTEGER NOT NULL DEFAULT 0,
  criado_em TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tentativas_login (
  chave TEXT PRIMARY KEY,
  tentativas INTEGER NOT NULL,
  bloqueado_ate TEXT NOT NULL DEFAULT '',
  atualizado_em TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessoes (
  token_hash TEXT PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
  expira_em TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pedidos_redefinicao (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
  criado_em TEXT NOT NULL,
  atendido_em TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS auditoria (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER NOT NULL DEFAULT 0,
  evento TEXT NOT NULL,
  criado_em TEXT NOT NULL
);
