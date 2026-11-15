import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { api, type Usuario } from '../api'
import { USUARIO, falha, sucesso } from '../apoioTestes'
import Inicio from './Inicio'

vi.mock('../api', () => ({
  api: { sair: vi.fn(), alterarSenha: vi.fn(), pedidos: vi.fn(), redefinir: vi.fn() },
}))

const PEDIDO = {
  id: 7,
  criado_em: '2026-11-14T12:00:00+00:00',
  nome: 'João',
  sobrenome: 'Souza',
  cpf: '***.982.247-**',
  email: 'joao@exemplo.com',
}

function montar(usuario: Usuario = USUARIO) {
  const aoSair = vi.fn()
  const aoAtualizar = vi.fn()
  render(<Inicio usuario={usuario} aoSair={aoSair} aoAtualizar={aoAtualizar} />)
  return { aoSair, aoAtualizar, teclado: userEvent.setup() }
}

it('AC-7 mostra a saudação com o nome e não mostra pedidos a usuário comum', () => {
  montar()
  expect(screen.getByRole('heading', { name: 'Login realizado!' })).toBeInTheDocument()
  expect(screen.getByText(/Olá, Maria Silva/)).toBeInTheDocument()
  expect(screen.queryByText('Pedidos de redefinição de senha')).not.toBeInTheDocument()
  expect(api.pedidos).not.toHaveBeenCalled()
})

it('AC-9 sair chama a API e avisa o App', async () => {
  vi.mocked(api.sair).mockResolvedValue(sucesso({}))
  const { teclado, aoSair } = montar()
  await teclado.click(screen.getByRole('button', { name: 'Sair' }))
  expect(api.sair).toHaveBeenCalled()
  expect(aoSair).toHaveBeenCalled()
})

it('AC-10 altera a senha e mostra a confirmação', async () => {
  vi.mocked(api.alterarSenha).mockResolvedValue(sucesso({}, 'Senha alterada com sucesso.'))
  const { teclado, aoAtualizar } = montar()
  await teclado.type(screen.getByLabelText('Senha atual'), 'abc123')
  await teclado.type(screen.getByLabelText('Nova senha'), 'nova123')
  await teclado.type(screen.getByLabelText('Confirmar nova senha'), 'nova123')
  await teclado.click(screen.getByRole('button', { name: 'Salvar nova senha' }))
  expect(api.alterarSenha).toHaveBeenCalledWith({ senha_atual: 'abc123', nova_senha: 'nova123' })
  expect(await screen.findByText('Senha alterada com sucesso.')).toBeInTheDocument()
  expect(aoAtualizar).toHaveBeenCalled()
})

it('AC-10 mostra o erro quando a senha atual está incorreta', async () => {
  vi.mocked(api.alterarSenha).mockResolvedValue(
    falha(400, 'Verifique os campos informados.', { senha_atual: 'Senha atual incorreta.' }),
  )
  const { teclado, aoAtualizar } = montar()
  await teclado.type(screen.getByLabelText('Senha atual'), 'errada1')
  await teclado.type(screen.getByLabelText('Nova senha'), 'nova123')
  await teclado.type(screen.getByLabelText('Confirmar nova senha'), 'nova123')
  await teclado.click(screen.getByRole('button', { name: 'Salvar nova senha' }))
  expect(await screen.findByText('Senha atual incorreta.')).toBeInTheDocument()
  expect(aoAtualizar).not.toHaveBeenCalled()
})

it('AC-12 e AC-13 administrador vê o pedido mascarado e gera a senha temporária', async () => {
  vi.mocked(api.pedidos).mockResolvedValue(sucesso({ pedidos: [PEDIDO] }))
  vi.mocked(api.redefinir).mockResolvedValue(sucesso({ senha_temporaria: 'aB3dE5fG7h' }))
  const { teclado } = montar({ ...USUARIO, is_admin: true })
  expect(await screen.findByText('João Souza')).toBeInTheDocument()
  expect(screen.getByText(/\*\*\*\.982\.247-\*\*/)).toBeInTheDocument()
  await teclado.click(screen.getByRole('button', { name: 'Gerar senha temporária' }))
  expect(api.redefinir).toHaveBeenCalledWith(7)
  expect(await screen.findByText('aB3dE5fG7h')).toBeInTheDocument()
  expect(screen.getByText('Nenhum pedido pendente.')).toBeInTheDocument()
})

it('AC-14 com senha temporária só mostra a troca obrigatória', () => {
  montar({ ...USUARIO, is_admin: true, deve_trocar_senha: true })
  expect(screen.getByRole('heading', { name: 'Defina uma nova senha' })).toBeInTheDocument()
  expect(screen.getByLabelText('Senha temporária')).toBeInTheDocument()
  expect(screen.queryByText('Login realizado!')).not.toBeInTheDocument()
  expect(screen.queryByText('Pedidos de redefinição de senha')).not.toBeInTheDocument()
  expect(api.pedidos).not.toHaveBeenCalled()
})
