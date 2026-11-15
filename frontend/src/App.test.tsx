import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { api } from './api'
import App from './App'
import { USUARIO, falha, sucesso } from './apoioTestes'

vi.mock('./api', () => ({
  api: { sessao: vi.fn(), sair: vi.fn(), entrar: vi.fn(), alterarSenha: vi.fn() },
}))

it('AC-8 sem sessão mostra o login', async () => {
  vi.mocked(api.sessao).mockResolvedValue(falha(401, 'Sessão inválida ou expirada.'))
  render(<App />)
  expect(await screen.findByRole('heading', { name: 'Acesso institucional' })).toBeInTheDocument()
  expect(screen.queryByText('Login realizado!')).not.toBeInTheDocument()
})

it('AC-7 com sessão mostra a tela pós-login', async () => {
  vi.mocked(api.sessao).mockResolvedValue(sucesso({ usuario: USUARIO }))
  render(<App />)
  expect(await screen.findByRole('heading', { name: 'Login realizado!' })).toBeInTheDocument()
})

it('AC-9 depois de sair volta ao login com aviso', async () => {
  vi.mocked(api.sessao).mockResolvedValue(sucesso({ usuario: USUARIO }))
  vi.mocked(api.sair).mockResolvedValue(sucesso({}))
  render(<App />)
  await userEvent.click(await screen.findByRole('button', { name: 'Sair' }))
  expect(await screen.findByText('Você saiu do sistema.')).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Acesso institucional' })).toBeInTheDocument()
})

it('navega entre login, cadastro e redefinição', async () => {
  vi.mocked(api.sessao).mockResolvedValue(falha(401, ''))
  render(<App />)
  await userEvent.click(await screen.findByRole('button', { name: 'Criar conta' }))
  expect(screen.getByRole('heading', { name: 'Criar conta' })).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Já tenho conta' }))
  await userEvent.click(screen.getByRole('button', { name: 'Esqueci minha senha' }))
  expect(screen.getByRole('heading', { name: 'Esqueci minha senha' })).toBeInTheDocument()
})
