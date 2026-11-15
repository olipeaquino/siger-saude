# SIGER – Sistema Inteligente de Gestão de Dados da Regulação em Saúde

Módulo de autenticação do SIGER, desenvolvido na disciplina Big Data em Python
(Estácio – Sistemas de Informação, Rio Branco – AC, 2026).

**Aplicação:** https://siger-saude.pages.dev

> Nenhuma informação real de pacientes, servidores ou planilhas institucionais deve ser
> versionada neste repositório.

## Sumário

- [Funcionalidades](#funcionalidades)
- [Como usar a aplicação](#como-usar-a-aplicação)
- [Arquitetura](#arquitetura)
- [Tecnologias](#tecnologias)
- [Estrutura do repositório](#estrutura-do-repositório)
- [Executando localmente](#executando-localmente)
- [Testes](#testes)
- [API](#api)
- [Segurança](#segurança)
- [Deploy](#deploy)

## Funcionalidades

- Cadastro de usuário com nome, sobrenome, CPF, email e senha
- Login por CPF e senha
- Bloqueio de 4 minutos após 3 tentativas de login erradas
- Sessão de 3 horas, encerrada no logout
- Tela inicial após o login, com alteração de senha
- Pedido de redefinição de senha, atendido pelo administrador com uma senha temporária
- Troca obrigatória da senha temporária no primeiro acesso
- Registro de auditoria dos eventos de acesso

## Como usar a aplicação

### Criar uma conta

1. Na tela de login, clique em **Criar conta**.
2. Informe nome, sobrenome, CPF, email e uma senha de 6 a 16 caracteres com pelo menos uma letra
   e um número.
3. Após a confirmação, entre com o CPF e a senha cadastrados.

### Entrar e sair

- Informe CPF e senha e clique em **Entrar**.
- Depois de 3 senhas erradas seguidas, o CPF fica bloqueado por 4 minutos.
- A sessão dura 3 horas. Para encerrar antes, clique em **Sair**.

### Alterar a senha

Na tela inicial, preencha a senha atual e a nova senha em **Alterar senha**. As demais sessões
abertas da conta são encerradas.

### Esqueci minha senha

1. Na tela de login, clique em **Esqueci minha senha** e informe o CPF.
2. O pedido é enviado ao administrador.
3. O administrador gera uma senha temporária e a repassa a você.
4. No primeiro acesso com a senha temporária, o sistema exige a definição de uma nova senha.

### Administrador

O administrador é criado na carga inicial do banco. Na tela inicial dele aparece a lista
**Pedidos de redefinição de senha**, com nome, CPF mascarado, email e data de cada pedido. O
botão **Gerar senha temporária** exibe a senha uma única vez.

## Arquitetura

```
Navegador
   │  HTTPS
   ▼
Cloudflare Pages  (siger-saude.pages.dev)
   ├── arquivos estáticos (React)
   └── /api/*  ──service binding──▶  Cloudflare Worker em Python  ──▶  Cloudflare D1 (SQLite)
```

- O frontend e a API são servidos na mesma origem, sem CORS.
- O Worker da API não possui URL pública: só é alcançado pelo Pages.
- O banco D1 guarda usuários, sessões, tentativas de login, pedidos de redefinição e auditoria.

## Tecnologias

| Camada | Tecnologia |
|---|---|
| Backend | Python (somente biblioteca padrão) em Cloudflare Workers |
| Banco de dados | Cloudflare D1 |
| Frontend | React, Vite, TypeScript, Zod |
| Testes | `unittest`, Vitest, Testing Library, Playwright |
| Hospedagem | Cloudflare Pages e Workers |

## Estrutura do repositório

```
backend/
  src/
    entry.py          rotas e respostas HTTP
    validacao.py      validação de CPF, senha, nome e email
    senha.py          hash e verificação de senha
    regras.py         prazos, bloqueio e utilitários
    repositorio.py    consultas ao D1
  tests/              testes unitários
  schema.sql          tabelas
  seed.py             carga do administrador
  wrangler.toml       configuração do Worker
frontend/
  src/
    pages/            Login, Cadastro, EsqueciSenha, Inicio
    components/       Campo, LayoutAuth, FormSenha, Pedidos
    schemas.ts        validação com Zod
    api.ts            chamadas à API
  e2e/                testes ponta a ponta
  functions/          repasse de /api ao Worker
  public/_headers     cabeçalhos de segurança
.env.example          variáveis da carga do administrador
```

## Executando localmente

### Pré-requisitos

- Python 3.12 ou superior
- Node.js 20 ou superior
- Conta Cloudflare, necessária apenas para o deploy

### 1. Configuração

```sh
git clone https://github.com/olipeaquino/siger-saude.git
cd siger-saude
cp .env.example .env
```

Preencha o `.env` com os dados do administrador inicial. O CPF precisa ser válido e a senha
segue a mesma regra dos demais usuários.

| Variável | Descrição |
|---|---|
| `ADMIN_NOME` | Nome do administrador |
| `ADMIN_SOBRENOME` | Sobrenome do administrador |
| `ADMIN_CPF` | CPF (11 dígitos) |
| `ADMIN_EMAIL` | Email |
| `ADMIN_SENHA` | Senha de 6 a 16 caracteres, com letra e número |

### 2. Dependências

```sh
npm --prefix frontend install
```

O backend não possui dependências.

### 3. Banco de dados local

```sh
cd backend
npx wrangler d1 execute siger-saude --local --file schema.sql
python seed.py > .wrangler/carga.sql.tmp
npx wrangler d1 execute siger-saude --local --file .wrangler/carga.sql.tmp
```

### 4. Subir a aplicação

Em um terminal, a API:

```sh
cd backend
npx wrangler dev --port 8787
```

Em outro terminal, o frontend:

```sh
cd frontend
npm run build
npm run preview
```

A aplicação fica disponível em http://localhost:8788.

## Testes

| Comando (na raiz) | O que verifica |
|---|---|
| `python -m unittest discover -s backend/tests` | Validações, hash de senha e regras do backend |
| `npm --prefix frontend test` | Schemas Zod e telas, com a API simulada |
| `npm --prefix frontend run lint` | Tipos e padrões de código |
| `npm --prefix frontend run e2e` | Fluxos completos no navegador, com API e banco locais |
| `npm --prefix frontend run e2e:prod` | Cenários sem criação de usuários, contra a aplicação publicada |

A suíte ponta a ponta sobe a API e o frontend sozinha e recria o banco local a cada execução.
Na primeira vez, instale o navegador de teste:

```sh
cd frontend
npx playwright install chromium
```

Para acompanhar os testes em uma janela do Chrome, em ritmo mais lento (PowerShell):

```powershell
cd frontend
$env:PW_CHANNEL = 'chrome'; $env:PW_SLOWMO = '450'
npx playwright test --headed
```

## API

Todas as rotas ficam em `/api` e respondem JSON. Rotas `POST` exigem o cabeçalho `Origin` igual
à origem da aplicação.

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| POST | `/cadastro` | público | Cria um usuário |
| POST | `/login` | público | Autentica e cria a sessão |
| POST | `/logout` | autenticado | Encerra a sessão |
| GET | `/sessao` | autenticado | Dados do usuário da sessão |
| POST | `/senha` | autenticado | Altera a senha |
| POST | `/redefinicao` | público | Registra um pedido de redefinição |
| GET | `/admin/pedidos` | administrador | Lista os pedidos pendentes |
| POST | `/admin/pedidos/{id}/redefinir` | administrador | Gera a senha temporária |

Códigos de resposta: `200`/`201` sucesso, `400` dados inválidos, `401` não autenticado, `403`
sem permissão ou origem inválida, `409` cadastro recusado, `429` bloqueio ou limite excedido.

## Segurança

- **Senhas:** PBKDF2-HMAC-SHA256 com 100.000 iterações e salt por usuário; nunca gravadas ou
  registradas em texto.
- **Sessão:** token aleatório em cookie `__Host-`, `HttpOnly`, `Secure` e `SameSite=Strict`; o
  banco guarda apenas o SHA-256 do token.
- **Força bruta:** as tentativas são contadas por CPF informado, exista ou não a conta, de modo
  que o bloqueio não revela quem está cadastrado. A reserva da tentativa é atômica.
- **Cadastro:** limite de requisições por IP com o Rate Limiting do Cloudflare.
- **Validação:** feita no frontend com Zod e repetida no backend, que é a autoridade.
- **Banco:** somente consultas parametrizadas.
- **Navegador:** CSP restritiva e demais cabeçalhos em `frontend/public/_headers`.
- **Segredos:** apenas no `.env` local, ignorado pelo Git, e nos segredos do Cloudflare.
- **Dados pessoais:** CPF, email e senha não aparecem em logs; a auditoria registra somente o
  identificador do usuário e o tipo do evento.

Limitação conhecida: o cadastro informa quando não pôde ser concluído por CPF ou email já
existente, sem dizer qual dos dois. Sem verificação por email não há como ocultar essa
informação; o limite por IP impede a consulta em massa.

## Deploy

```sh
cd backend
npx wrangler login
npx wrangler d1 execute siger-saude --remote --file schema.sql
python seed.py > .wrangler/carga.sql.tmp
npx wrangler d1 execute siger-saude --remote --file .wrangler/carga.sql.tmp
npx wrangler deploy

cd ../frontend
npm run deploy
```

Em uma conta Cloudflare diferente, crie antes o banco com `npx wrangler d1 create siger-saude`
e atualize o `database_id` em `backend/wrangler.toml`.
