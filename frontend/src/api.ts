export type Usuario = {
  nome: string
  sobrenome: string
  cpf: string
  email: string
  is_admin: boolean
  deve_trocar_senha: boolean
}

export type Pedido = {
  id: number
  criado_em: string
  nome: string
  sobrenome: string
  cpf: string
  email: string
}

export type Resposta<T = unknown> = {
  ok: boolean
  status: number
  mensagem: string
  erros: Record<string, string>
  dados: T
}

async function chamar<T>(metodo: 'GET' | 'POST', rota: string, corpo?: unknown): Promise<Resposta<T>> {
  try {
    const resposta = await fetch(`/api${rota}`, {
      method: metodo,
      credentials: 'same-origin',
      headers: metodo === 'POST' ? { 'Content-Type': 'application/json' } : undefined,
      body: metodo === 'POST' ? JSON.stringify(corpo ?? {}) : undefined,
    })
    const dados = await resposta.json()
    return {
      ok: resposta.ok,
      status: resposta.status,
      mensagem: dados.mensagem ?? '',
      erros: dados.erros ?? {},
      dados,
    }
  } catch {
    return {
      ok: false,
      status: 0,
      mensagem: 'Não foi possível conectar. Tente novamente.',
      erros: {},
      dados: {} as T,
    }
  }
}

export const api = {
  sessao: () => chamar<{ usuario: Usuario }>('GET', '/sessao'),
  cadastrar: (dados: { nome: string; sobrenome: string; cpf: string; email: string; senha: string }) =>
    chamar('POST', '/cadastro', dados),
  entrar: (dados: { cpf: string; senha: string }) => chamar<{ usuario: Usuario }>('POST', '/login', dados),
  sair: () => chamar('POST', '/logout'),
  alterarSenha: (dados: { senha_atual: string; nova_senha: string }) => chamar('POST', '/senha', dados),
  pedirRedefinicao: (dados: { cpf: string }) => chamar('POST', '/redefinicao', dados),
  pedidos: () => chamar<{ pedidos: Pedido[] }>('GET', '/admin/pedidos'),
  redefinir: (id: number) => chamar<{ senha_temporaria: string }>('POST', `/admin/pedidos/${id}/redefinir`),
}
