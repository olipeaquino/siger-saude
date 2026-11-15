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
          <p className="auth-sigla">SIGER</p>
          <p className="auth-nome">Gestão de Dados</p>
          <p className="auth-area">da Regulação em Saúde</p>
        </aside>
        <section className="auth-conteudo">
          <h1>{titulo}</h1>
          <p className="auth-subtitulo">{subtitulo}</p>
          {children}
        </section>
      </div>
    </main>
  )
}
