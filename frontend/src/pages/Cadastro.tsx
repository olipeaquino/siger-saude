import { api } from '../api'
import type { Tela } from '../App'
import Campo from '../components/Campo'
import LayoutAuth from '../components/LayoutAuth'
import { cadastroSchema, mascararCpf } from '../schemas'
import { useFormulario } from '../useFormulario'

type Props = {
  irPara: (tela: Tela, mensagem?: string) => void
}

const INICIAL = { nome: '', sobrenome: '', cpf: '', email: '', senha: '', confirmar: '' }

export default function Cadastro({ irPara }: Props) {
  const form = useFormulario(cadastroSchema, INICIAL, async ({ nome, sobrenome, cpf, email, senha }) => {
    const resposta = await api.cadastrar({ nome, sobrenome, cpf, email, senha })
    if (resposta.ok) irPara('login', resposta.mensagem)
    return resposta
  })

  return (
    <LayoutAuth titulo="Criar conta" subtitulo="Preencha seus dados para acessar o sistema">
      <form onSubmit={form.submeter} noValidate>
        <div className="campos-lado">
          <Campo rotulo="Nome" {...form.campo('nome')} autoComplete="given-name" />
          <Campo rotulo="Sobrenome" {...form.campo('sobrenome')} autoComplete="family-name" />
        </div>
        <Campo
          rotulo="CPF"
          {...form.campo('cpf')}
          placeholder="000.000.000-00"
          inputMode="numeric"
          autoComplete="off"
          formatar={mascararCpf}
        />
        <Campo
          rotulo="Email"
          {...form.campo('email')}
          tipo="email"
          inputMode="email"
          placeholder="voce@exemplo.com"
          autoComplete="email"
        />
        <div className="campos-lado">
          <Campo
            rotulo="Senha"
            {...form.campo('senha')}
            tipo="password"
            placeholder="6 a 16 caracteres"
            autoComplete="new-password"
          />
          <Campo
            rotulo="Confirmar senha"
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
        <button className="botao" type="submit" disabled={form.enviando}>
          {form.enviando ? 'Enviando…' : 'Cadastrar'}
        </button>
      </form>
      <div className="auth-links">
        <button className="link" type="button" onClick={() => irPara('login')}>
          Já tenho conta
        </button>
      </div>
    </LayoutAuth>
  )
}
