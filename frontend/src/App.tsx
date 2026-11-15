import { useEffect, useState } from 'react'
import { api, type Usuario } from './api'
import Cadastro from './pages/Cadastro'
import EsqueciSenha from './pages/EsqueciSenha'
import Inicio from './pages/Inicio'
import Login from './pages/Login'

export type Tela = 'login' | 'cadastro' | 'esqueci'

export default function App() {
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [tela, setTela] = useState<Tela>('login')
  const [aviso, setAviso] = useState('')

  useEffect(() => {
    api.sessao().then((resposta) => {
      setUsuario(resposta.ok ? resposta.dados.usuario : null)
      setCarregando(false)
    })
  }, [])

  async function atualizarSessao() {
    const resposta = await api.sessao()
    setUsuario(resposta.ok ? resposta.dados.usuario : null)
  }

  function irPara(destino: Tela, mensagem = '') {
    setAviso(mensagem)
    setTela(destino)
  }

  if (carregando) {
    return (
      <main className="carregando" role="status">
        Carregando…
      </main>
    )
  }

  if (usuario) {
    return (
      <Inicio
        usuario={usuario}
        aoAtualizar={atualizarSessao}
        aoSair={() => {
          setUsuario(null)
          irPara('login', 'Você saiu do sistema.')
        }}
      />
    )
  }

  if (tela === 'cadastro') {
    return <Cadastro irPara={irPara} />
  }
  if (tela === 'esqueci') {
    return <EsqueciSenha irPara={irPara} />
  }
  return <Login aviso={aviso} aoEntrar={setUsuario} irPara={irPara} />
}
