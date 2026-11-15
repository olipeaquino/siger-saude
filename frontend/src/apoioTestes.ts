import type { Resposta, Usuario } from './api'

export const CPF = '529.982.247-25'
export const CPF_DIGITOS = '52998224725'

export const USUARIO: Usuario = {
  nome: 'Maria',
  sobrenome: 'Silva',
  is_admin: false,
  deve_trocar_senha: false,
}

export function sucesso<T>(dados: T, mensagem = ''): Resposta<T> {
  return { ok: true, status: 200, mensagem, erros: {}, dados }
}

export function falha(status: number, mensagem: string, erros: Record<string, string> = {}): Resposta<never> {
  return { ok: false, status, mensagem, erros, dados: {} as never }
}
