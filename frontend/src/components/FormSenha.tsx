import { useState } from 'react'
import { api } from '../api'
import { senhaSchema } from '../schemas'
import { useFormulario } from '../useFormulario'
import Campo from './Campo'

type Props = {
  rotuloAtual?: string
  aoAlterar: () => void
}

const INICIAL = { senha_atual: '', nova_senha: '', confirmar: '' }

export default function FormSenha({ rotuloAtual = 'Senha atual', aoAlterar }: Props) {
  const [sucesso, setSucesso] = useState('')
  const form = useFormulario(senhaSchema, INICIAL, async ({ senha_atual, nova_senha }) => {
    setSucesso('')
    const resposta = await api.alterarSenha({ senha_atual, nova_senha })
    if (resposta.ok) {
      setSucesso(resposta.mensagem)
      aoAlterar()
    }
    return resposta
  })

  return (
    <form onSubmit={form.submeter} noValidate>
      <Campo
        rotulo={rotuloAtual}
        {...form.campo('senha_atual')}
        tipo="password"
        autoComplete="current-password"
      />
      <div className="campos-lado">
        <Campo
          rotulo="Nova senha"
          {...form.campo('nova_senha')}
          tipo="password"
          placeholder="6 a 16 caracteres"
          autoComplete="new-password"
        />
        <Campo
          rotulo="Confirmar nova senha"
          {...form.campo('confirmar')}
          tipo="password"
          autoComplete="new-password"
        />
      </div>
      {form.mensagem && (
        <p className="alerta alerta-erro" role="alert">
          {form.mensagem}
        </p>
      )}
      {sucesso && (
        <p className="alerta alerta-sucesso" role="status">
          {sucesso}
        </p>
      )}
      <button className="botao" type="submit" disabled={form.enviando}>
        {form.enviando ? 'Salvando…' : 'Salvar nova senha'}
      </button>
    </form>
  )
}
