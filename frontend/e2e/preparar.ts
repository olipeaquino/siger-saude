import { execSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { ADMIN, BACKEND, sql } from './apoio'

export default function preparar() {
  const opcoes = { cwd: BACKEND, encoding: 'utf8' as const }
  execSync('npx wrangler d1 execute siger-saude --local --file schema.sql', { ...opcoes, stdio: 'ignore' })
  for (const tabela of ['sessoes', 'pedidos_redefinicao', 'auditoria', 'tentativas_login', 'usuarios']) {
    sql(`DELETE FROM ${tabela}`)
  }
  const carga = execSync('python seed.py', { ...opcoes, env: { ...process.env, ...ADMIN } })
  mkdirSync(join(BACKEND, '.wrangler'), { recursive: true })
  writeFileSync(join(BACKEND, '.wrangler', 'carga-teste.sql.tmp'), carga)
  execSync('npx wrangler d1 execute siger-saude --local --file .wrangler/carga-teste.sql.tmp', {
    ...opcoes,
    stdio: 'ignore',
  })
}
