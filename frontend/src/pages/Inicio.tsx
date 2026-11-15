import { useEffect, useState } from 'react'
import { api, type Pedido, type Usuario } from '../api'
import FormSenha from '../components/FormSenha'
import Pedidos from '../components/Pedidos'

type Props = {
  usuario: Usuario
  aoSair: () => void
  aoAtualizar: () => void
}

type Area = 'inicio' | 'pedidos' | 'conta'

const ICONES: Record<Area, string> = {
  inicio: 'M3 11l9-8 9 8M5 10v10h14V10',
  pedidos: 'M4 6h16v12H4zM4 7l8 6 8-6',
  conta: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 20c1.5-4 4.5-5 8-5s6.5 1 8 5',
}

const ROTULOS: Record<Area, string> = { inicio: 'Início', pedidos: 'Pedidos', conta: 'Conta' }

function areaAtual(admin: boolean): Area {
  const destino = window.location.hash.slice(1)
  if (destino === 'conta' || (destino === 'pedidos' && admin)) return destino
  return 'inicio'
}

export default function Inicio({ usuario, aoSair, aoAtualizar }: Props) {
  const admin = usuario.is_admin
  const trocaObrigatoria = usuario.deve_trocar_senha
  const carregarPedidos = admin && !trocaObrigatoria
  const [area, setArea] = useState<Area>(() => areaAtual(admin))
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [erroPedidos, setErroPedidos] = useState('')

  useEffect(() => {
    const aoNavegar = () => setArea(areaAtual(admin))
    window.addEventListener('hashchange', aoNavegar)
    return () => window.removeEventListener('hashchange', aoNavegar)
  }, [admin])

  useEffect(() => {
    if (!carregarPedidos) return
    api.pedidos().then((resposta) => {
      if (resposta.ok) setPedidos(resposta.dados.pedidos)
      else setErroPedidos(resposta.mensagem)
    })
  }, [carregarPedidos])

  async function sair() {
    await api.sair()
    window.history.replaceState(null, '', window.location.pathname)
    aoSair()
  }

  const areas: Area[] = admin ? ['inicio', 'pedidos', 'conta'] : ['inicio', 'conta']

  return (
    <main className="inicio">
      <header className="inicio-topo">
        <div>
          <p className="inicio-sigla">SIGER</p>
          <p className="inicio-area">Gestão de Dados da Regulação em Saúde</p>
        </div>
        {!trocaObrigatoria && (
          <nav className="abas" aria-label="Áreas do sistema">
            {areas.map((item) => (
              <a key={item} href={`#${item}`} aria-current={item === area ? 'page' : undefined}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d={ICONES[item]} />
                </svg>
                {ROTULOS[item]}
                {item === 'pedidos' && pedidos.length > 0 && (
                  <span className="abas-contagem" aria-label={`${pedidos.length} pendentes`}>
                    {pedidos.length}
                  </span>
                )}
              </a>
            ))}
          </nav>
        )}
        <button
          className={`botao botao-claro${trocaObrigatoria ? '' : ' so-web'}`}
          type="button"
          onClick={sair}
        >
          Sair
        </button>
      </header>

      {trocaObrigatoria ? (
        <section className="cartao">
          <h1>Defina uma nova senha</h1>
          <p className="texto-suave">
            Você entrou com uma senha temporária. Para continuar, crie uma nova senha.
          </p>
          <FormSenha rotuloAtual="Senha temporária" aoAlterar={aoAtualizar} />
        </section>
      ) : (
        <>
          {area === 'inicio' && (
            <section className="cartao boas-vindas">
              <svg className="boas-vindas-icone" viewBox="0 0 48 48" aria-hidden="true">
                <circle cx="24" cy="24" r="24" />
                <path d="M14 24.5l7 7 13-14" />
              </svg>
              <h1>Login realizado!</h1>
              <p>
                Olá, {usuario.nome} {usuario.sobrenome}. Que bom ter você por aqui — seu acesso ao
                SIGER está ativo.
              </p>
              {admin && <p className="selo">Administrador</p>}
            </section>
          )}
          {area === 'pedidos' && (
            <Pedidos
              pedidos={pedidos}
              erroCarga={erroPedidos}
              aoAtender={(id) => setPedidos((atuais) => atuais.filter((pedido) => pedido.id !== id))}
            />
          )}
          {area === 'conta' && (
            <div className="conta">
              <h1 className="conta-titulo">Minha conta</h1>
              <section className="cartao">
                <h2>Meus dados</h2>
                <dl className="dados">
                  <dt>Nome</dt>
                  <dd>
                    {usuario.nome} {usuario.sobrenome}
                  </dd>
                  <dt>CPF</dt>
                  <dd>{usuario.cpf}</dd>
                  <dt>Email</dt>
                  <dd>{usuario.email}</dd>
                </dl>
              </section>
              <section className="cartao">
                <h2>Alterar senha</h2>
                <FormSenha aoAlterar={aoAtualizar} />
              </section>
              <button className="botao botao-secundario so-celular" type="button" onClick={sair}>
                Sair
              </button>
            </div>
          )}
        </>
      )}
    </main>
  )
}
