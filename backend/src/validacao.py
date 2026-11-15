import re

SENHA_MIN = 6
SENHA_MAX = 16
EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def limpar_cpf(valor):
    if not isinstance(valor, str):
        return None
    cpf = re.sub(r"[.\-\s]", "", valor)
    if not re.fullmatch(r"\d{11}", cpf) or cpf == cpf[0] * 11:
        return None
    for tamanho in (9, 10):
        soma = sum(int(cpf[i]) * (tamanho + 1 - i) for i in range(tamanho))
        if (soma * 10) % 11 % 10 != int(cpf[tamanho]):
            return None
    return cpf


def erro_senha(valor):
    if not isinstance(valor, str) or not SENHA_MIN <= len(valor) <= SENHA_MAX:
        return f"A senha deve ter de {SENHA_MIN} a {SENHA_MAX} caracteres."
    if not re.search(r"[A-Za-z]", valor) or not re.search(r"\d", valor):
        return "A senha deve ter pelo menos uma letra e um número."
    return None


def _nome(valor):
    if not isinstance(valor, str):
        return None
    texto = " ".join(valor.split())
    return texto if 2 <= len(texto) <= 60 else None


def validar_cadastro(dados):
    erros = {}
    limpos = {}
    for campo in ("nome", "sobrenome"):
        limpos[campo] = _nome(dados.get(campo))
        if limpos[campo] is None:
            erros[campo] = "Informe de 2 a 60 caracteres."
    limpos["cpf"] = limpar_cpf(dados.get("cpf"))
    if limpos["cpf"] is None:
        erros["cpf"] = "CPF inválido."
    email = dados.get("email")
    if isinstance(email, str) and len(email) <= 120 and EMAIL.match(email.strip()):
        limpos["email"] = email.strip().lower()
    else:
        erros["email"] = "Email inválido."
    senha = erro_senha(dados.get("senha"))
    if senha:
        erros["senha"] = senha
    else:
        limpos["senha"] = dados["senha"]
    return limpos, erros
