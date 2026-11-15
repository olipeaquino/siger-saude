import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { api } from '../api'
import { CPF, CPF_DIGITOS, falha, sucesso } from '../apoioTestes'
import Cadastro from './Cadastro'

vi.mock('../api', () => ({ api: { cadastrar: vi.fn() } }))

const GENERICA = 'Não foi possível concluir o cadastro. Verifique os dados informados.'

function montar() {
  const irPara = vi.fn()
  render(<Cadastro irPara={irPara} />)
  return { irPara, usuario: userEvent.setup() }
}

async function preencherValido(usuario: ReturnType<typeof userEvent.setup>) {
  await usuario.type(screen.getByLabelText('Nome'), 'Maria')
  await usuario.type(screen.getByLabelText('Sobrenome'), 'Silva')
  await usuario.type(screen.getByLabelText('CPF'), CPF)
  await usuario.type(screen.getByLabelText('Email'), 'maria@exemplo.com')
  await usuario.type(screen.getByLabelText('Senha'), 'abc123')
  await usuario.type(screen.getByLabelText('Confirmar senha'), 'abc123')
  await usuario.click(screen.getByRole('button', { name: 'Cadastrar' }))
}

it('AC-2 mostra o erro em cada campo sem chamar a API', async () => {
  const { usuario } = montar()
  await usuario.type(screen.getByLabelText('Senha'), 'abc')
  await usuario.click(screen.getByRole('button', { name: 'Cadastrar' }))
  expect(screen.getAllByText('Informe de 2 a 60 caracteres.')).toHaveLength(2)
  expect(screen.getByText('CPF inválido.')).toBeInTheDocument()
  expect(screen.getByText('Email inválido.')).toBeInTheDocument()
  expect(screen.getByText('A senha deve ter de 6 a 16 caracteres.')).toBeInTheDocument()
  expect(screen.getByText('As senhas não conferem.')).toBeInTheDocument()
  expect(api.cadastrar).not.toHaveBeenCalled()
})

it('AC-1 envia os dados válidos e volta ao login com a mensagem', async () => {
  vi.mocked(api.cadastrar).mockResolvedValue(sucesso({}, 'Cadastro realizado. Faça seu login.'))
  const { usuario, irPara } = montar()
  await preencherValido(usuario)
  expect(api.cadastrar).toHaveBeenCalledWith({
    nome: 'Maria',
    sobrenome: 'Silva',
    cpf: CPF_DIGITOS,
    email: 'maria@exemplo.com',
    senha: 'abc123',
  })
  expect(irPara).toHaveBeenCalledWith('login', 'Cadastro realizado. Faça seu login.')
})

it('AC-3 mostra a mensagem genérica quando CPF ou email já existem', async () => {
  vi.mocked(api.cadastrar).mockResolvedValue(falha(409, GENERICA))
  const { usuario, irPara } = montar()
  await preencherValido(usuario)
  expect(await screen.findByText(GENERICA)).toBeInTheDocument()
  expect(irPara).not.toHaveBeenCalled()
})
