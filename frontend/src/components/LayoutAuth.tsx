import type { ReactNode } from 'react'

type Props = {
  titulo: string
  subtitulo: string
  children: ReactNode
}

export default function LayoutAuth({ titulo, subtitulo, children }: Props) {
  return (
    <main className="auth">
      <div className="auth-cartao">
        <aside className="auth-marca">
          <div>
            <p className="auth-sigla">SIGER</p>
            <p className="auth-nome">Gestão de Dados</p>
            <p className="auth-area">da Regulação em Saúde</p>
          </div>
          <p className="auth-selo">Protótipo acadêmico</p>
        </aside>
        <section className="auth-conteudo">
          <h1>{titulo}</h1>
          <p className="auth-subtitulo">{subtitulo}</p>
          {children}
          <p className="auth-aviso">Protótipo acadêmico. Use apenas dados fictícios.</p>
        </section>
      </div>
    </main>
  )
}
