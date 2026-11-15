import { expect, test } from '@playwright/test'
import { ADMIN, cadastrarPelaApi, entrar, gerarCpf, novoUsuario, sair, sql } from './apoio'

const INVALIDAS = 'CPF ou senha inválidos.'
const BLOQUEADO = 'Muitas tentativas. Tente novamente em alguns minutos.'
const CADASTRO_RECUSADO = 'Não foi possível concluir o cadastro. Verifique os dados informados.'
const PEDIDO_ENVIADO = 'Solicitação enviada ao administrador. Ele vai redefinir sua senha e entrar em contato.'
const PASSADO = '2000-01-01T00:00:00+00:00'

test('@leitura AC-8 sem sessão a aplicação mostra o login e a API responde 401', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Acesso institucional' })).toBeVisible()
  await expect(page.getByText('Login realizado!')).toHaveCount(0)
  expect((await page.request.get('/api/sessao')).status()).toBe(401)
  expect((await page.request.get('/api/admin/pedidos')).status()).toBe(401)
})

test('@leitura AC-5 CPF inexistente mostra a mensagem genérica', async ({ page }) => {
  await entrar(page, gerarCpf(), 'abc123')
  await expect(page.getByText(INVALIDAS)).toBeVisible()
})

test('@leitura AC-2 campos inválidos mostram erro e não chamam a API', async ({ page }) => {
  const chamadas: string[] = []
  page.on('request', (requisicao) => {
    if (requisicao.url().includes('/api/cadastro')) chamadas.push(requisicao.url())
  })
  await page.goto('/')
  await page.getByRole('button', { name: 'Criar conta' }).click()
  await page.getByLabel('CPF').fill('111.111.111-11')
  await page.getByLabel('Senha', { exact: true }).fill('abc')
  await page.getByRole('button', { name: 'Cadastrar' }).click()
  await expect(page.getByText('Informe de 2 a 60 caracteres.')).toHaveCount(2)
  await expect(page.getByText('CPF inválido.')).toBeVisible()
  await expect(page.getByText('Email inválido.')).toBeVisible()
  await expect(page.getByText('A senha deve ter de 6 a 16 caracteres.')).toBeVisible()
  expect(chamadas).toEqual([])
})

test('AC-2 a API recusa dados inválidos enviados diretamente', async ({ request, baseURL }) => {
  const resposta = await request.post('/api/cadastro', {
    data: { ...novoUsuario(), cpf: '11111111111', senha: 'semnumero' },
    headers: { Origin: baseURL! },
  })
  expect(resposta.status()).toBe(400)
  expect(Object.keys((await resposta.json()).erros).sort()).toEqual(['cpf', 'senha'])
  const semOrigem = await request.post('/api/cadastro', { data: novoUsuario(), headers: { Origin: 'https://outro.example' } })
  expect(semOrigem.status()).toBe(403)
})

test('AC-1 AC-3 AC-4 AC-7 AC-9 cadastro, login, tela pós-login e logout', async ({ page, context }) => {
  const usuario = novoUsuario()
  const preencher = async () => {
    await page.getByRole('button', { name: 'Criar conta' }).click()
    await page.getByLabel('Nome', { exact: true }).fill(usuario.nome)
    await page.getByLabel('Sobrenome').fill(usuario.sobrenome)
    await page.getByLabel('CPF').fill(usuario.cpf)
    await page.getByLabel('Email').fill(usuario.email)
    await page.getByLabel('Senha', { exact: true }).fill(usuario.senha)
    await page.getByLabel('Confirmar senha').fill(usuario.senha)
    await page.getByRole('button', { name: 'Cadastrar' }).click()
  }

  await page.goto('/')
  await preencher()
  await expect(page.getByText('Cadastro realizado. Faça seu login.')).toBeVisible()
  const [gravado] = sql<{ senha_hash: string }>(`SELECT senha_hash FROM usuarios WHERE cpf = '${usuario.cpf}'`)
  expect(gravado.senha_hash).toMatch(/^[0-9a-f]{64}$/)

  await preencher()
  await expect(page.getByText(CADASTRO_RECUSADO)).toBeVisible()

  await entrar(page, usuario.cpf, usuario.senha)
  await expect(page.getByRole('heading', { name: 'Login realizado!' })).toBeVisible()
  await expect(page.getByText(`Olá, ${usuario.nome} ${usuario.sobrenome}`)).toBeVisible()
  await expect(page.getByText('Pedidos de redefinição de senha')).toHaveCount(0)

  const cookies = await context.cookies()
  const sessao = cookies.find((cookie) => cookie.name === '__Host-sessao')!
  expect(sessao).toMatchObject({ httpOnly: true, secure: true, sameSite: 'Strict' })
  expect(sessao.expires - Date.now() / 1000).toBeGreaterThan(3 * 3600 - 120)
  expect(sessao.expires - Date.now() / 1000).toBeLessThanOrEqual(3 * 3600)

  await page.reload()
  await expect(page.getByRole('heading', { name: 'Login realizado!' })).toBeVisible()

  await sair(page)
  expect((await context.cookies()).find((cookie) => cookie.name === '__Host-sessao')).toBeUndefined()
  await context.addCookies([sessao])
  expect((await page.request.get('/api/sessao')).status()).toBe(401)
})

test('AC-5 AC-6 mensagem idêntica, bloqueio na terceira tentativa e liberação após o prazo', async ({
  page,
  request,
  baseURL,
}) => {
  const usuario = await cadastrarPelaApi(request, baseURL!)
  for (let tentativa = 1; tentativa <= 3; tentativa++) {
    await entrar(page, usuario.cpf, 'errada1')
    await expect(page.getByText(INVALIDAS)).toBeVisible()
  }
  await entrar(page, usuario.cpf, usuario.senha)
  await expect(page.getByText(BLOQUEADO)).toBeVisible()

  const [bloqueio] = sql<{ bloqueado_ate: string }>(`SELECT bloqueado_ate FROM usuarios WHERE cpf = '${usuario.cpf}'`)
  const minutos = (new Date(bloqueio.bloqueado_ate).getTime() - Date.now()) / 60000
  expect(minutos).toBeGreaterThan(3)
  expect(minutos).toBeLessThanOrEqual(4)

  sql(`UPDATE usuarios SET bloqueado_ate = '${PASSADO}' WHERE cpf = '${usuario.cpf}'`)
  await entrar(page, usuario.cpf, usuario.senha)
  await expect(page.getByRole('heading', { name: 'Login realizado!' })).toBeVisible()
})

test('AC-8 sessão expirada volta ao login', async ({ page, request, baseURL }) => {
  const usuario = await cadastrarPelaApi(request, baseURL!)
  await entrar(page, usuario.cpf, usuario.senha)
  await expect(page.getByRole('heading', { name: 'Login realizado!' })).toBeVisible()
  sql(
    `UPDATE sessoes SET expira_em = '${PASSADO}' WHERE usuario_id = (SELECT id FROM usuarios WHERE cpf = '${usuario.cpf}')`,
  )
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Acesso institucional' })).toBeVisible()
  expect((await page.request.get('/api/sessao')).status()).toBe(401)
})

test('AC-10 alterar senha: a antiga deixa de entrar e a nova entra', async ({ page, request, baseURL }) => {
  const usuario = await cadastrarPelaApi(request, baseURL!)
  await entrar(page, usuario.cpf, usuario.senha)
  const trocar = async (atual: string, nova: string) => {
    await page.getByLabel('Senha atual').fill(atual)
    await page.getByLabel('Nova senha', { exact: true }).fill(nova)
    await page.getByLabel('Confirmar nova senha').fill(nova)
    await page.getByRole('button', { name: 'Salvar nova senha' }).click()
  }
  await trocar('errada1', 'nova1234')
  await expect(page.getByText('Senha atual incorreta.')).toBeVisible()
  await trocar(usuario.senha, usuario.senha)
  await expect(page.getByText('A nova senha deve ser diferente da atual.')).toBeVisible()
  await trocar(usuario.senha, 'nova1234')
  await expect(page.getByText('Senha alterada com sucesso.')).toBeVisible()

  await sair(page)
  await entrar(page, usuario.cpf, usuario.senha)
  await expect(page.getByText(INVALIDAS)).toBeVisible()
  await entrar(page, usuario.cpf, 'nova1234')
  await expect(page.getByRole('heading', { name: 'Login realizado!' })).toBeVisible()
})

test('AC-11 AC-12 AC-13 AC-14 pedido de redefinição atendido pelo administrador', async ({
  page,
  request,
  baseURL,
}) => {
  const usuario = await cadastrarPelaApi(request, baseURL!)
  const pedir = async (cpf: string) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Esqueci minha senha' }).click()
    await page.getByLabel('CPF').fill(cpf)
    await page.getByRole('button', { name: 'Solicitar redefinição' }).click()
    await expect(page.getByText(PEDIDO_ENVIADO)).toBeVisible()
  }
  await pedir(usuario.cpf)
  await pedir(usuario.cpf)
  await pedir(gerarCpf())
  const pedidos = sql(
    `SELECT p.id FROM pedidos_redefinicao p JOIN usuarios u ON u.id = p.usuario_id WHERE u.cpf = '${usuario.cpf}'`,
  )
  expect(pedidos).toHaveLength(1)

  await entrar(page, usuario.cpf, usuario.senha)
  await expect(page.getByRole('heading', { name: 'Login realizado!' })).toBeVisible()
  expect((await page.request.get('/api/admin/pedidos')).status()).toBe(403)
  await sair(page)

  await entrar(page, ADMIN.ADMIN_CPF, ADMIN.ADMIN_SENHA)
  await expect(page.getByText('Pedidos de redefinição de senha')).toBeVisible()
  const linha = page.getByRole('listitem').filter({ hasText: `${usuario.nome} ${usuario.sobrenome}` })
  await expect(linha).toContainText(`***.${usuario.cpf.slice(3, 6)}.${usuario.cpf.slice(6, 9)}-**`)
  await expect(linha).not.toContainText(usuario.cpf)
  await linha.getByRole('button', { name: 'Gerar senha temporária' }).click()
  const temporaria = (await page.locator('.senha-temporaria').textContent())!
  expect(temporaria).toMatch(/^[A-Za-z0-9]{10}$/)
  await expect(linha).toHaveCount(0)
  await sair(page)

  await entrar(page, usuario.cpf, usuario.senha)
  await expect(page.getByText(INVALIDAS)).toBeVisible()
  await entrar(page, usuario.cpf, temporaria)
  await expect(page.getByRole('heading', { name: 'Defina uma nova senha' })).toBeVisible()
  await expect(page.getByText('Login realizado!')).toHaveCount(0)
  await page.getByLabel('Senha temporária').fill(temporaria)
  await page.getByLabel('Nova senha', { exact: true }).fill('final123')
  await page.getByLabel('Confirmar nova senha').fill('final123')
  await page.getByRole('button', { name: 'Salvar nova senha' }).click()
  await expect(page.getByRole('heading', { name: 'Login realizado!' })).toBeVisible()
})

test('AC-15 AC-16 auditoria registrada e administrador inicial sem senha em texto', async () => {
  const eventos = sql<{ evento: string }>('SELECT DISTINCT evento FROM auditoria').map((linha) => linha.evento)
  expect(eventos.sort()).toEqual(
    [
      'bloqueio',
      'cadastro',
      'login_bloqueado',
      'login_ok',
      'login_recusado',
      'logout',
      'pedido_redefinicao',
      'senha_alterada',
      'senha_redefinida',
    ].sort(),
  )
  const [admin] = sql<{ is_admin: number; senha_hash: string; nome: string }>(
    `SELECT is_admin, senha_hash, nome FROM usuarios WHERE cpf = '${ADMIN.ADMIN_CPF}'`,
  )
  expect(admin).toMatchObject({ is_admin: 1, nome: ADMIN.ADMIN_NOME })
  expect(admin.senha_hash).toMatch(/^[0-9a-f]{64}$/)
  expect(admin.senha_hash).not.toContain(ADMIN.ADMIN_SENHA)
})
