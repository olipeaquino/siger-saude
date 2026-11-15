import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { api } from '../api'
import { CPF, CPF_DIGITOS, sucesso } from '../apoioTestes'
import EsqueciSenha from './EsqueciSenha'

vi.mock('../api', () => ({ api: { pedirRedefinicao: vi.fn() } }))

const ENVIADO = 'Solicitação enviada ao administrador. Ele vai redefinir sua senha e entrar em contato.'

it('AC-11 envia o CPF e mostra que o administrador vai redefinir', async () => {
  vi.mocked(api.pedirRedefinicao).mockResolvedValue(sucesso({}, ENVIADO))
  const usuario = userEvent.setup()
  render(<EsqueciSenha irPara={vi.fn()} />)
  await usuario.type(screen.getByLabelText('CPF'), CPF)
  await usuario.click(screen.getByRole('button', { name: 'Solicitar redefinição' }))
  expect(api.pedirRedefinicao).toHaveBeenCalledWith({ cpf: CPF_DIGITOS })
  expect(await screen.findByText(ENVIADO)).toBeInTheDocument()
  expect(screen.queryByLabelText('CPF')).not.toBeInTheDocument()
})

it('AC-2 não envia CPF inválido', async () => {
  const usuario = userEvent.setup()
  render(<EsqueciSenha irPara={vi.fn()} />)
  await usuario.type(screen.getByLabelText('CPF'), '123')
  await usuario.click(screen.getByRole('button', { name: 'Solicitar redefinição' }))
  expect(screen.getByText('CPF inválido.')).toBeInTheDocument()
  expect(api.pedirRedefinicao).not.toHaveBeenCalled()
})
