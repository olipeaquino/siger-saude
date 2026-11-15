import { useState, type FormEvent } from 'react'
import type { z } from 'zod'
import type { Resposta } from './api'

export function useFormulario<S extends z.ZodType>(
  schema: S,
  inicial: Record<string, string>,
  enviar: (dados: z.output<S>) => Promise<Resposta>,
) {
  const [valores, setValores] = useState(inicial)
  const [erros, setErros] = useState<Record<string, string>>({})
  const [mensagem, setMensagem] = useState('')
  const [enviando, setEnviando] = useState(false)

  const campo = (nome: string) => ({
    nome,
    valor: valores[nome],
    erro: erros[nome],
    aoMudar: (valor: string) => setValores((atuais) => ({ ...atuais, [nome]: valor })),
  })

  async function submeter(evento: FormEvent) {
    evento.preventDefault()
    setMensagem('')
    const resultado = schema.safeParse(valores)
    if (!resultado.success) {
      const novos: Record<string, string> = {}
      for (const problema of resultado.error.issues) {
        const nome = String(problema.path[0])
        novos[nome] ??= problema.message
      }
      setErros(novos)
      return
    }
    setErros({})
    setEnviando(true)
    const resposta = await enviar(resultado.data)
    setEnviando(false)
    if (resposta.ok) {
      setValores(inicial)
    } else {
      setErros(resposta.erros)
      setMensagem(resposta.mensagem)
    }
  }

  return { campo, submeter, mensagem, enviando }
}
