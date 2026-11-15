import { api, type Usuario } from '../api'
import type { Tela } from '../App'
import Campo from '../components/Campo'
import LayoutAuth from '../components/LayoutAuth'
import { loginSchema, mascararCpf } from '../schemas'
import { useFormulario } from '../useFormulario'

type Props = {
  aviso: string
  aoEntrar: (usuario: Usuario) => void
  irPara: (tela: Tela, mensagem?: string) => void
}

export default function Login({ aviso, aoEntrar, irPara }: Props) {
  const form = useFormulario(loginSchema, { cpf: '', senha: '' }, async (dados) => {
    const resposta = await api.entrar(dados)
    if (resposta.ok) aoEntrar(resposta.dados.usuario)
    return resposta
  })

  return (
    <LayoutAuth titulo="Acesso institucional" subtitulo="Entre com suas credenciais">
      {aviso && (
        <p className="alerta alerta-sucesso" role="status">
          {aviso}
        </p>
      )}
      <form onSubmit={form.submeter} noValidate>
        <Campo
          rotulo="CPF"
          {...form.campo('cpf')}
          placeholder="000.000.000-00"
          inputMode="numeric"
          autoComplete="username"
          formatar={mascararCpf}
        />
        <Campo
          rotulo="Senha"
          {...form.campo('senha')}
          tipo="password"
          placeholder="Digite sua senha"
          autoComplete="current-password"
        />
        {form.mensagem && (
          <p className="alerta alerta-erro" role="alert">
            {form.mensagem}
          </p>
        )}
        <button className="botao" type="submit" disabled={form.enviando}>
          {form.enviando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
      <div className="auth-links">
        <button className="link" type="button" onClick={() => irPara('esqueci')}>
          Esqueci minha senha
        </button>
        <button className="link" type="button" onClick={() => irPara('cadastro')}>
          Criar conta
        </button>
      </div>
    </LayoutAuth>
  )
}
