import { useEffect, useState } from 'react'
import { api, type Pedido } from '../api'

type Gerada = { nome: string; senha: string }

export default function Pedidos() {
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [gerada, setGerada] = useState<Gerada | null>(null)
  const [erro, setErro] = useState('')

  useEffect(() => {
    api.pedidos().then((resposta) => {
      if (resposta.ok) setPedidos(resposta.dados.pedidos)
      else setErro(resposta.mensagem)
    })
  }, [])

  async function redefinir(pedido: Pedido) {
    setErro('')
    const resposta = await api.redefinir(pedido.id)
    if (!resposta.ok) {
      setErro(resposta.mensagem)
      return
    }
    setGerada({ nome: `${pedido.nome} ${pedido.sobrenome}`, senha: resposta.dados.senha_temporaria })
    setPedidos((atuais) => atuais.filter((item) => item.id !== pedido.id))
  }

  return (
    <section className="inicio-cartao" aria-labelledby="titulo-pedidos">
      <h2 id="titulo-pedidos">Pedidos de redefinição de senha</h2>
      {gerada && (
        <div className="alerta alerta-sucesso" role="status">
          <p>
            Senha temporária de {gerada.nome}: <strong className="senha-temporaria">{gerada.senha}</strong>
          </p>
          <p>Anote e repasse agora. Ela não será exibida novamente.</p>
        </div>
      )}
      {erro && (
        <p className="alerta alerta-erro" role="alert">
          {erro}
        </p>
      )}
      {pedidos.length === 0 ? (
        <p className="texto-suave">Nenhum pedido pendente.</p>
      ) : (
        <ul className="pedidos">
          {pedidos.map((pedido) => (
            <li key={pedido.id}>
              <div>
                <p className="pedido-nome">
                  {pedido.nome} {pedido.sobrenome}
                </p>
                <p className="texto-suave">
                  {pedido.cpf} · {pedido.email} · {new Date(pedido.criado_em).toLocaleString('pt-BR')}
                </p>
              </div>
              <button className="botao botao-secundario" type="button" onClick={() => redefinir(pedido)}>
                Gerar senha temporária
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
