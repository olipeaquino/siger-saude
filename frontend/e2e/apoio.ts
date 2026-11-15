import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { expect, type APIRequestContext, type Page } from '@playwright/test'

export const BACKEND = fileURLToPath(new URL('../../backend', import.meta.url))

export const ADMIN = {
  ADMIN_NOME: 'Administrador',
  ADMIN_SOBRENOME: 'Teste',
  ADMIN_CPF: '52998224725',
  ADMIN_EMAIL: 'admin.teste@example.com',
  ADMIN_SENHA: 'Admin@teste1',
}

export function sql<T = Record<string, unknown>>(comando: string): T[] {
  const saida = execSync(`npx wrangler d1 execute siger-saude --local --json --command "${comando}"`, {
    cwd: BACKEND,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  })
  return JSON.parse(saida.slice(saida.indexOf('[')))[0].results
}

export function gerarCpf() {
  const digitos = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10))
  for (const tamanho of [9, 10]) {
    const soma = digitos.reduce((total, digito, i) => total + digito * (tamanho + 1 - i), 0)
    digitos.push(((soma * 10) % 11) % 10)
  }
  return digitos.join('')
}

export function novoUsuario() {
  const cpf = gerarCpf()
  const sufixo = Math.random().toString(36).slice(2, 10)
  return { nome: 'Teste', sobrenome: `Fulano ${sufixo}`, cpf, email: `${sufixo}@example.com`, senha: 'abc123' }
}

export async function cadastrarPelaApi(request: APIRequestContext, baseURL: string) {
  const usuario = novoUsuario()
  const resposta = await request.post('/api/cadastro', { data: usuario, headers: { Origin: baseURL } })
  expect(resposta.status()).toBe(201)
  return usuario
}

export async function entrar(page: Page, cpf: string, senha: string) {
  await page.goto('/')
  await page.getByLabel('CPF').fill(cpf)
  await page.getByLabel('Senha').fill(senha)
  await page.getByRole('button', { name: 'Entrar' }).click()
}

export async function sair(page: Page) {
  await page.getByRole('button', { name: 'Sair' }).click()
  await expect(page.getByRole('heading', { name: 'Acesso institucional' })).toBeVisible()
}
