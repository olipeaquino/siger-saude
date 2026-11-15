import { api, type Usuario } from '../api'
import FormSenha from '../components/FormSenha'
import Pedidos from '../components/Pedidos'

type Props = {
  usuario: Usuario
  aoSair: () => void
  aoAtualizar: () => void
}

export default function Inicio({ usuario, aoSair, aoAtualizar }: Props) {
  async function sair() {
    await api.sair()
    aoSair()
  }

  return (
    <main className="inicio">
      <header className="inicio-topo">
        <div>
          <p className="inicio-sigla">SIGER</p>
          <p className="inicio-area">Gestão de Dados da Regulação em Saúde</p>
        </div>
        <button className="botao botao-claro" type="button" onClick={sair}>
          Sair
        </button>
      </header>

      {usuario.deve_trocar_senha ? (
        <section className="inicio-cartao">
          <h1>Defina uma nova senha</h1>
          <p className="texto-suave">
            Você entrou com uma senha temporária. Para continuar, crie uma nova senha.
          </p>
          <FormSenha rotuloAtual="Senha temporária" aoAlterar={aoAtualizar} />
        </section>
      ) : (
        <>
          <section className="inicio-cartao inicio-boas-vindas">
            <svg className="inicio-icone" viewBox="0 0 48 48" aria-hidden="true">
              <circle cx="24" cy="24" r="24" />
              <path d="M14 24.5l7 7 13-14" />
            </svg>
            <h1>Login realizado!</h1>
            <p>
              Olá, {usuario.nome} {usuario.sobrenome}. Que bom ter você por aqui — seu acesso ao SIGER
              está ativo.
            </p>
            {usuario.is_admin && <p className="selo">Administrador</p>}
          </section>
          {usuario.is_admin && <Pedidos />}
          <section className="inicio-cartao">
            <h2>Alterar senha</h2>
            <FormSenha aoAlterar={aoAtualizar} />
          </section>
        </>
      )}
    </main>
  )
}
