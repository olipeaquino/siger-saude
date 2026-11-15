import hashlib
import secrets
import string
from datetime import datetime, timedelta, timezone

MAX_TENTATIVAS = 3
BLOQUEIO = timedelta(minutes=4)
SESSAO = timedelta(hours=3)


def agora():
    return datetime.now(timezone.utc)


def iso(momento):
    return momento.isoformat(timespec="seconds")


def vencido(texto_iso, momento):
    return not texto_iso or datetime.fromisoformat(texto_iso) <= momento


def mascarar_cpf(cpf):
    return f"***.{cpf[3:6]}.{cpf[6:9]}-**"


def hash_token(token):
    return hashlib.sha256(token.encode()).hexdigest()


def senha_temporaria():
    letras = [secrets.choice(string.ascii_letters) for _ in range(6)]
    numeros = [secrets.choice(string.digits) for _ in range(4)]
    caracteres = letras + numeros
    secrets.SystemRandom().shuffle(caracteres)
    return "".join(caracteres)
