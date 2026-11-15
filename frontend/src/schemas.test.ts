import { describe, expect, it } from 'vitest'
import { cadastroSchema, cpfValido, loginSchema, mascararCpf, senhaSchema } from './schemas'

const VALIDO = {
  nome: 'Maria',
  sobrenome: 'Silva',
  cpf: '529.982.247-25',
  email: 'maria@exemplo.com',
  senha: 'abc123',
  confirmar: 'abc123',
}

const campos = (schema: typeof cadastroSchema, dados: unknown) => {
  const resultado = schema.safeParse(dados)
  return resultado.success ? [] : resultado.error.issues.map((problema) => problema.path[0])
}

describe('AC-2 CPF', () => {
  it('aceita CPF válido com e sem máscara', () => {
    expect(cpfValido('529.982.247-25')).toBe(true)
    expect(cpfValido('52998224725')).toBe(true)
  })

  it('recusa dígito verificador errado, repetidos e tamanho errado', () => {
    for (const valor of ['52998224724', '11111111111', '123', '']) {
      expect(cpfValido(valor)).toBe(false)
    }
  })

  it('aplica a máscara enquanto digita', () => {
    expect(mascararCpf('5299')).toBe('529.9')
    expect(mascararCpf('52998224725999')).toBe('529.982.247-25')
  })
})

describe('AC-2 cadastro', () => {
  it('AC-1 aceita dados válidos e devolve CPF só com dígitos', () => {
    const resultado = cadastroSchema.parse(VALIDO)
    expect(resultado.cpf).toBe('52998224725')
  })

  it('aponta cada campo inválido', () => {
    const erros = campos(cadastroSchema, {
      nome: 'M',
      sobrenome: '',
      cpf: '1',
      email: 'sem-arroba',
      senha: 'x',
      confirmar: 'y',
    })
    expect(new Set(erros)).toEqual(new Set(['nome', 'sobrenome', 'cpf', 'email', 'senha', 'confirmar']))
  })

  it.each(['ab12', 'a'.repeat(16) + '1', 'abcdefgh', '12345678'])('recusa a senha %s', (senha) => {
    expect(campos(cadastroSchema, { ...VALIDO, senha, confirmar: senha })).toContain('senha')
  })

  it.each(['abc123', 'Senha@1234567890'])('aceita a senha %s', (senha) => {
    expect(campos(cadastroSchema, { ...VALIDO, senha, confirmar: senha })).toEqual([])
  })
})

describe('AC-5 e AC-10 demais formulários', () => {
  it('login exige CPF válido e senha preenchida', () => {
    expect(loginSchema.safeParse({ cpf: '123', senha: '' }).success).toBe(false)
    expect(loginSchema.safeParse({ cpf: '52998224725', senha: 'x' }).success).toBe(true)
  })

  it('troca de senha exige confirmação igual', () => {
    const dados = { senha_atual: 'abc123', nova_senha: 'nova123', confirmar: 'outra123' }
    expect(senhaSchema.safeParse(dados).success).toBe(false)
    expect(senhaSchema.safeParse({ ...dados, confirmar: 'nova123' }).success).toBe(true)
  })
})
