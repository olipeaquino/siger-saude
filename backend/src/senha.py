import hashlib
import hmac
import secrets

ITERACOES = 100_000


async def derivar(senha, salt, iteracoes):
    try:
        from js import Object, Uint8Array, crypto
        from pyodide.ffi import to_js
    except ImportError:
        return hashlib.pbkdf2_hmac("sha256", senha.encode(), salt, iteracoes).hex()
    chave = await crypto.subtle.importKey(
        "raw", to_js(senha.encode()), "PBKDF2", False, to_js(["deriveBits"])
    )
    parametros = to_js(
        {"name": "PBKDF2", "hash": "SHA-256", "salt": to_js(salt), "iterations": iteracoes},
        dict_converter=Object.fromEntries,
    )
    bits = await crypto.subtle.deriveBits(parametros, chave, 256)
    return bytes(Uint8Array.new(bits).to_py()).hex()


async def gerar(senha):
    salt = secrets.token_bytes(16)
    return await derivar(senha, salt, ITERACOES), salt.hex(), ITERACOES


async def conferir(senha, hash_hex, salt_hex, iteracoes):
    calculado = await derivar(senha, bytes.fromhex(salt_hex), iteracoes)
    return hmac.compare_digest(calculado, hash_hex)
