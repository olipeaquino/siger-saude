import { z } from 'zod'

export const soDigitos = (valor: string) => valor.replace(/\D/g, '')

export function mascararCpf(valor: string) {
  return soDigitos(valor)
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

export function cpfValido(valor: string) {
  const cpf = soDigitos(valor)
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false
  return [9, 10].every((tamanho) => {
    let soma = 0
    for (let i = 0; i < tamanho; i++) soma += Number(cpf[i]) * (tamanho + 1 - i)
    return ((soma * 10) % 11) % 10 === Number(cpf[tamanho])
  })
}

const TAMANHO_SENHA = 'A senha deve ter de 6 a 16 caracteres.'
const COMPOSICAO_SENHA = 'A senha deve ter pelo menos uma letra e um número.'
const TAMANHO_NOME = 'Informe de 2 a 60 caracteres.'
const NAO_CONFEREM = 'As senhas não conferem.'

const cpf = z.string().refine(cpfValido, 'CPF inválido.').transform(soDigitos)
const nome = z.string().trim().min(2, TAMANHO_NOME).max(60, TAMANHO_NOME)
const senha = z
  .string()
  .min(6, TAMANHO_SENHA)
  .max(16, TAMANHO_SENHA)
  .regex(/[A-Za-z]/, COMPOSICAO_SENHA)
  .regex(/\d/, COMPOSICAO_SENHA)

export const cadastroSchema = z
  .object({
    nome,
    sobrenome: nome,
    cpf,
    email: z.email('Email inválido.').max(120, 'Email inválido.'),
    senha,
    confirmar: z.string(),
  })
  .refine((dados) => dados.senha === dados.confirmar, { path: ['confirmar'], message: NAO_CONFEREM })

export const loginSchema = z.object({
  cpf,
  senha: z.string().min(1, 'Informe a senha.'),
})

export const esqueciSchema = z.object({ cpf })

export const senhaSchema = z
  .object({
    senha_atual: z.string().min(1, 'Informe a senha atual.'),
    nova_senha: senha,
    confirmar: z.string(),
  })
  .refine((dados) => dados.nova_senha === dados.confirmar, { path: ['confirmar'], message: NAO_CONFEREM })
