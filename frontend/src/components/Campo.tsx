import { useId } from 'react'

type Props = {
  rotulo: string
  nome: string
  valor: string
  erro?: string
  aoMudar: (valor: string) => void
  tipo?: 'text' | 'password' | 'email'
  autoComplete?: string
  placeholder?: string
  inputMode?: 'numeric' | 'email' | 'text'
  formatar?: (valor: string) => string
}

export default function Campo({
  rotulo,
  nome,
  valor,
  erro,
  aoMudar,
  tipo = 'text',
  autoComplete,
  placeholder,
  inputMode,
  formatar,
}: Props) {
  const id = useId()
  return (
    <div className="campo">
      <label htmlFor={id}>{rotulo}</label>
      <input
        id={id}
        name={nome}
        type={tipo}
        value={valor}
        placeholder={placeholder}
        autoComplete={autoComplete}
        inputMode={inputMode}
        aria-invalid={erro ? true : undefined}
        aria-describedby={erro ? `${id}-erro` : undefined}
        onChange={(evento) => aoMudar(formatar ? formatar(evento.target.value) : evento.target.value)}
      />
      {erro && (
        <p className="campo-erro" id={`${id}-erro`} role="alert">
          {erro}
        </p>
      )}
    </div>
  )
}
