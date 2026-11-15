import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { api } from '../api'
import { CPF, CPF_DIGITOS, USUARIO, falha, sucesso } from '../apoioTestes'
import Login from './Login'

vi.mock('../api', () => ({ api: { entrar: vi.fn() } }))

function montar() {
  const aoEntrar = vi.fn()
  const irPara = vi.fn()
  render(<Login aviso="" aoEntrar={aoEntrar} irPara={irPara} />)
  return { aoEntrar, irPara, usuario: userEvent.setup() }
}

async function preencher(usuario: ReturnType<typeof userEvent.setup>, cpf: string, senha: string) {
  if (cpf) await usuario.type(screen.getByLabelText('CPF'), cpf)
  if (senha) await usuario.type(screen.getByLabelText('Senha'), senha)
  await usuario.click(screen.getByRole('button', { name: 'Entrar' }))
}

it('AC-2 não chama a API com CPF inválido ou senha vazia', async () => {
  const { usuario } = montar()
  await preencher(usuario, '111.111.111-11', '')
  expect(screen.getByText('CPF inválido.')).toBeInTheDocument()
  expect(screen.getByText('Informe a senha.')).toBeInTheDocument()
  expect(api.entrar).not.toHaveBeenCalled()
})

it('AC-4 envia o CPF só com dígitos e entrega o usuário', async () => {
  vi.mocked(api.entrar).mockResolvedValue(sucesso({ usuario: USUARIO }))
  const { usuario, aoEntrar } = montar()
  await usuario.type(screen.getByLabelText('CPF'), CPF_DIGITOS)
  expect(screen.getByLabelText('CPF')).toHaveValue(CPF)
  await preencher(usuario, '', 'abc123')
  expect(api.entrar).toHaveBeenCalledWith({ cpf: CPF_DIGITOS, senha: 'abc123' })
  expect(aoEntrar).toHaveBeenCalledWith(USUARIO)
})

it.each([
  ['AC-5', 401, 'CPF ou senha inválidos.'],
  ['AC-6', 429, 'Muitas tentativas. Tente novamente em alguns minutos.'],
])('%s mostra a mensagem da API no status %i', async (_ac, status, mensagem) => {
  vi.mocked(api.entrar).mockResolvedValue(falha(status, mensagem))
  const { usuario, aoEntrar } = montar()
  await preencher(usuario, CPF, 'errada1')
  expect(await screen.findByText(mensagem)).toBeInTheDocument()
  expect(aoEntrar).not.toHaveBeenCalled()
})

it('leva para o cadastro e para a redefinição', async () => {
  const { usuario, irPara } = montar()
  await usuario.click(screen.getByRole('button', { name: 'Criar conta' }))
  await usuario.click(screen.getByRole('button', { name: 'Esqueci minha senha' }))
  expect(irPara).toHaveBeenNthCalledWith(1, 'cadastro')
  expect(irPara).toHaveBeenNthCalledWith(2, 'esqueci')
})
