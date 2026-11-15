# SIGER – Gestão de Dados da Regulação em Saúde

Protótipo acadêmico da disciplina Big Data em Python (Estácio, Rio Branco – AC, 2026).
Esta etapa entrega a autenticação do sistema. **Use apenas dados fictícios.**

Aplicação: https://siger-saude.pages.dev

## O que faz

- Cadastro com nome, sobrenome, CPF, email e senha
- Login por CPF e senha, com bloqueio de 4 minutos após 3 tentativas erradas
- Sessão de 3 horas em cookie `HttpOnly`, `Secure` e `SameSite=Strict`
- Tela pós-login com logout e alteração de senha
- Pedido de redefinição de senha atendido pelo administrador com senha temporária
- Registro de auditoria dos eventos de acesso

## Estrutura

```
backend/    API em Python puro (biblioteca padrão) para Cloudflare Workers + D1
frontend/   React + Vite + TypeScript + Zod, publicado no Cloudflare Pages
```

O Worker da API não tem URL pública: o Pages repassa `/api/*` a ele por service binding.

## Segurança

- Senhas com PBKDF2-HMAC-SHA256 (100.000 iterações) e salt por usuário
- Token de sessão aleatório; o banco guarda apenas o SHA-256 dele
- Validação no frontend (Zod) e novamente no backend
- Conferência do cabeçalho `Origin` em toda escrita e consultas parametrizadas
- Mensagens que não revelam se um CPF ou email está cadastrado
- CSP e demais cabeçalhos de segurança em `frontend/public/_headers`
- Segredos apenas em `.env` (ignorado pelo Git) e nos segredos do Cloudflare

## Como rodar

Requisitos: Python 3.12+, Node 20+ e uma conta Cloudflare.

```sh
cp .env.example .env
cd frontend && npm install && cd ..

cd backend
npx wrangler d1 execute siger-saude --local --file schema.sql
python seed.py > .wrangler/carga.sql.tmp
npx wrangler d1 execute siger-saude --local --file .wrangler/carga.sql.tmp
npx wrangler dev --port 8787
```

Em outro terminal:

```sh
cd frontend
npm run build
npm run preview
```

A aplicação fica em http://localhost:8788.

## Testes

```sh
python -m unittest discover -s backend/tests
npm --prefix frontend test
npm --prefix frontend run lint
npm --prefix frontend run e2e
```

`npm --prefix frontend run e2e:prod` roda contra a aplicação publicada apenas os cenários que não criam usuários.

## Deploy

```sh
cd backend
npx wrangler d1 execute siger-saude --remote --file schema.sql
npx wrangler deploy
cd ../frontend
npm run deploy
```
