import asyncio
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent / "src"))

import senha
import validacao

CAMPOS = ("ADMIN_NOME", "ADMIN_SOBRENOME", "ADMIN_CPF", "ADMIN_EMAIL", "ADMIN_SENHA")


def carregar_env():
    arquivo = Path(__file__).parent.parent / ".env"
    if arquivo.exists():
        for linha in arquivo.read_text(encoding="utf-8").splitlines():
            chave, separador, valor = linha.partition("=")
            if separador and not chave.strip().startswith("#"):
                os.environ.setdefault(chave.strip(), valor.strip())


def texto_sql(valor):
    return "'" + str(valor).replace("'", "''") + "'"


def main():
    carregar_env()
    faltando = [campo for campo in CAMPOS if not os.environ.get(campo)]
    if faltando:
        sys.exit("Variáveis ausentes: " + ", ".join(faltando))
    dados, erros = validacao.validar_cadastro(
        {campo.removeprefix("ADMIN_").lower(): os.environ[campo] for campo in CAMPOS}
    )
    if erros:
        sys.exit("Dados inválidos: " + ", ".join(erros))
    senha_hash, salt, iteracoes = asyncio.run(senha.gerar(dados["senha"]))
    criado_em = datetime.now(timezone.utc).isoformat(timespec="seconds")
    valores = [
        texto_sql(dados["nome"]), texto_sql(dados["sobrenome"]), texto_sql(dados["cpf"]),
        texto_sql(dados["email"]), texto_sql(senha_hash), texto_sql(salt), str(iteracoes),
        "1", texto_sql(criado_em),
    ]
    print(
        "INSERT OR IGNORE INTO usuarios (nome, sobrenome, cpf, email, senha_hash, senha_salt,"
        " senha_iteracoes, is_admin, criado_em) VALUES (" + ", ".join(valores) + ");"
    )


if __name__ == "__main__":
    main()
