import { useState } from 'react'
import { api } from '../api'
import type { Tela } from '../App'
import Campo from '../components/Campo'
import LayoutAuth from '../components/LayoutAuth'
import { esqueciSchema, mascararCpf } from '../schemas'
import { useFormulario } from '../useFormulario'

type Props = {
  irPara: (tela: Tela, mensagem?: string) => void
}

export default function EsqueciSenha({ irPara }: Props) {
  const [confirmacao, setConfirmacao] = useState('')
  const form = useFormulario(esqueciSchema, { cpf: '' }, async (dados) => {
    const resposta = await api.pedirRedefinicao(dados)
    if (resposta.ok) setConfirmacao(resposta.mensagem)
    return resposta
  })

  return (
    <LayoutAuth titulo="Esqueci minha senha" subtitulo="O administrador redefine a senha para você">
      {confirmacao ? (
        <p className="alerta alerta-sucesso" role="status">
          {confirmacao}
        </p>
      ) : (
        <form onSubmit={form.submeter} noValidate>
          <Campo
            rotulo="CPF"
            {...form.campo('cpf')}
            placeholder="000.000.000-00"
            inputMode="numeric"
            autoComplete="username"
            formatar={mascararCpf}
          />
          {form.mensagem && (
            <p className="alerta alerta-erro" role="alert">
              {form.mensagem}
            </p>
          )}
          <button className="botao" type="submit" disabled={form.enviando}>
            {form.enviando ? 'Enviando…' : 'Solicitar redefinição'}
          </button>
        </form>
      )}
      <div className="auth-links">
        <button className="link" type="button" onClick={() => irPara('login')}>
          Voltar para o login
        </button>
      </div>
    </LayoutAuth>
  )
}
