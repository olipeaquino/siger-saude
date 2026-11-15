import json
import re
import secrets
from urllib.parse import urlparse

from js import Object
from pyodide.ffi import to_js
from workers import Response, WorkerEntrypoint

import regras
import senha as senhas
import validacao
from repositorio import Repositorio

COOKIE = "__Host-sessao"
LIMITE_CORPO = 4096
CREDENCIAIS_INVALIDAS = "CPF ou senha inválidos."
CADASTRO_RECUSADO = "Não foi possível concluir o cadastro. Verifique os dados informados."
PEDIDO_ENVIADO = (
    "Solicitação enviada ao administrador. Ele vai redefinir sua senha e entrar em contato."
)
SALT_FALSO = bytes(16)
ROTA_REDEFINIR = re.compile(r"/api/admin/pedidos/(\d+)/redefinir")


class Erro(Exception):
    def __init__(self, status, mensagem, erros=None):
        self.status = status
        self.corpo = {"mensagem": mensagem}
        if erros:
            self.corpo["erros"] = erros


def responder(corpo, status=200, cookie=None):
    cabecalhos = {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
    }
    if cookie is not None:
        cabecalhos["Set-Cookie"] = cookie
    return Response(json.dumps(corpo, ensure_ascii=False), status=status, headers=cabecalhos)


def cookie_sessao(token, duracao):
    return f"{COOKIE}={token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age={duracao}"


def ler_token(request):
    cookies = request.headers.get("cookie") or ""
    for parte in str(cookies).split(";"):
        nome, _, valor = parte.strip().partition("=")
        if nome == COOKIE:
            return valor
    return ""


def publico(usuario):
    return {
        "nome": usuario["nome"],
        "sobrenome": usuario["sobrenome"],
        "cpf": regras.mascarar_cpf(usuario["cpf"]),
        "email": usuario["email"],
        "is_admin": bool(usuario["is_admin"]),
        "deve_trocar_senha": bool(usuario["deve_trocar_senha"]),
    }


class Default(WorkerEntrypoint):
    async def fetch(self, request):
        try:
            return await self.rotear(request)
        except Erro as erro:
            return responder(erro.corpo, erro.status)
        except Exception as erro:
            print("erro interno:", type(erro).__name__)
            return responder({"mensagem": "Erro interno. Tente novamente."}, 500)

    async def rotear(self, request):
        url = urlparse(request.url)
        metodo = request.method
        self.repo = Repositorio(self.env.DB)
        self.momento = regras.agora()
        self.token = ler_token(request)
        self.ip = str(request.headers.get("cf-connecting-ip") or "desconhecido")

        if metodo == "POST":
            origem = str(request.headers.get("origin") or "")
            if origem != f"{url.scheme}://{url.netloc}":
                raise Erro(403, "Origem não permitida.")

        redefinir = ROTA_REDEFINIR.fullmatch(url.path)
        if redefinir and metodo == "POST":
            return await self.redefinir(int(redefinir.group(1)))

        rotas = {
            ("POST", "/api/cadastro"): self.cadastro,
            ("POST", "/api/login"): self.login,
            ("POST", "/api/logout"): self.logout,
            ("GET", "/api/sessao"): self.sessao,
            ("POST", "/api/senha"): self.alterar_senha,
            ("POST", "/api/redefinicao"): self.pedir_redefinicao,
            ("GET", "/api/admin/pedidos"): self.pedidos,
        }
        rota = rotas.get((metodo, url.path))
        if rota is None:
            conhecida = redefinir or any(caminho == url.path for _, caminho in rotas)
            if conhecida:
                raise Erro(405, "Método não permitido.")
            raise Erro(404, "Rota não encontrada.")
        if metodo == "POST":
            return await rota(await self.corpo(request))
        return await rota()

    async def corpo(self, request):
        texto = await request.text()
        if len(texto) > LIMITE_CORPO:
            raise Erro(400, "Requisição inválida.")
        try:
            dados = json.loads(texto or "{}")
        except ValueError:
            raise Erro(400, "Requisição inválida.")
        if not isinstance(dados, dict):
            raise Erro(400, "Requisição inválida.")
        return dados

    async def autenticado(self, admin=False):
        usuario = None
        if self.token:
            usuario = await self.repo.usuario_por_sessao(
                regras.resumo(self.token), regras.iso(self.momento)
            )
        if usuario is None:
            raise Erro(401, "Sessão inválida ou expirada.")
        if admin and not usuario["is_admin"]:
            raise Erro(403, "Acesso restrito ao administrador.")
        return usuario

    async def auditar(self, evento, usuario_id=0):
        await self.repo.auditar(evento, regras.iso(self.momento), usuario_id)

    async def cadastro(self, dados):
        limite = await self.env.LIMITE_CADASTRO.limit(
            to_js({"key": self.ip}, dict_converter=Object.fromEntries)
        )
        if not limite.success:
            raise Erro(429, "Muitas solicitações. Aguarde um minuto e tente novamente.")
        limpos, erros = validacao.validar_cadastro(dados)
        if erros:
            raise Erro(400, "Verifique os campos informados.", erros)
        senha_hash, salt, iteracoes = await senhas.gerar(limpos["senha"])
        try:
            usuario_id = await self.repo.criar_usuario(
                limpos, senha_hash, salt, iteracoes, regras.iso(self.momento)
            )
        except Exception as erro:
            if "UNIQUE" in str(erro):
                raise Erro(409, CADASTRO_RECUSADO)
            raise
        await self.auditar("cadastro", usuario_id)
        return responder({"mensagem": "Cadastro realizado. Faça seu login."}, 201)

    async def login(self, dados):
        cpf = validacao.limpar_cpf(dados.get("cpf"))
        senha = dados.get("senha")
        if cpf is None or not isinstance(senha, str):
            await self.auditar("login_recusado")
            raise Erro(401, CREDENCIAIS_INVALIDAS)
        usuario = await self.repo.usuario_por_cpf(cpf)
        usuario_id = usuario["id"] if usuario else 0
        chave = regras.resumo(cpf)
        limite = regras.MAX_TENTATIVAS
        agora = regras.iso(self.momento)
        bloqueio = regras.iso(self.momento + regras.BLOQUEIO)
        tentativas = await self.repo.reservar_tentativa(chave, limite, agora)
        if tentativas is None:
            await self.repo.bloquear(chave, limite, bloqueio)
            await self.auditar("login_bloqueado", usuario_id)
            raise Erro(429, "Muitas tentativas. Tente novamente em alguns minutos.")
        if usuario:
            correta = await senhas.conferir(
                senha, usuario["senha_hash"], usuario["senha_salt"], usuario["senha_iteracoes"]
            )
        else:
            await senhas.derivar(senha, SALT_FALSO, senhas.ITERACOES)
            correta = False
        if not correta:
            if tentativas >= limite:
                await self.repo.bloquear(chave, limite, bloqueio)
                await self.repo.limpar_tentativas(
                    regras.iso(self.momento - regras.RETENCAO_TENTATIVAS)
                )
                await self.auditar("bloqueio", usuario_id)
            await self.auditar("login_recusado", usuario_id)
            raise Erro(401, CREDENCIAIS_INVALIDAS)
        await self.repo.liberar(chave)
        token = secrets.token_urlsafe(32)
        await self.repo.criar_sessao(
            regras.resumo(token), usuario["id"], regras.iso(self.momento + regras.SESSAO)
        )
        await self.auditar("login_ok", usuario["id"])
        duracao = int(regras.SESSAO.total_seconds())
        return responder({"usuario": publico(usuario)}, cookie=cookie_sessao(token, duracao))

    async def logout(self, dados):
        usuario = await self.autenticado()
        await self.repo.apagar_sessao(regras.resumo(self.token))
        await self.auditar("logout", usuario["id"])
        return responder({"mensagem": "Sessão encerrada."}, cookie=cookie_sessao("", 0))

    async def sessao(self):
        return responder({"usuario": publico(await self.autenticado())})

    async def alterar_senha(self, dados):
        usuario = await self.autenticado()
        atual = dados.get("senha_atual")
        nova = dados.get("nova_senha")
        erro = validacao.erro_senha(nova)
        if erro:
            raise Erro(400, "Verifique os campos informados.", {"nova_senha": erro})
        correta = isinstance(atual, str) and await senhas.conferir(
            atual, usuario["senha_hash"], usuario["senha_salt"], usuario["senha_iteracoes"]
        )
        if not correta:
            raise Erro(400, "Verifique os campos informados.", {"senha_atual": "Senha atual incorreta."})
        if nova == atual:
            raise Erro(
                400, "Verifique os campos informados.",
                {"nova_senha": "A nova senha deve ser diferente da atual."},
            )
        senha_hash, salt, iteracoes = await senhas.gerar(nova)
        await self.repo.definir_senha(usuario["id"], senha_hash, salt, iteracoes, 0)
        await self.repo.apagar_sessoes(usuario["id"], regras.resumo(self.token))
        await self.auditar("senha_alterada", usuario["id"])
        return responder({"mensagem": "Senha alterada com sucesso."})

    async def pedir_redefinicao(self, dados):
        cpf = validacao.limpar_cpf(dados.get("cpf"))
        if cpf is None:
            raise Erro(400, "Verifique os campos informados.", {"cpf": "CPF inválido."})
        usuario = await self.repo.usuario_por_cpf(cpf)
        if usuario:
            await self.repo.criar_pedido(usuario["id"], regras.iso(self.momento))
            await self.auditar("pedido_redefinicao", usuario["id"])
        return responder({"mensagem": PEDIDO_ENVIADO})

    async def pedidos(self):
        await self.autenticado(admin=True)
        pedidos = await self.repo.pedidos_pendentes()
        for pedido in pedidos:
            pedido["cpf"] = regras.mascarar_cpf(pedido["cpf"])
        return responder({"pedidos": pedidos})

    async def redefinir(self, pedido_id):
        await self.autenticado(admin=True)
        pedido = await self.repo.atender_pedido(pedido_id, regras.iso(self.momento))
        if pedido is None:
            raise Erro(404, "Pedido não encontrado.")
        usuario_id = pedido["usuario_id"]
        temporaria = regras.senha_temporaria()
        senha_hash, salt, iteracoes = await senhas.gerar(temporaria)
        await self.repo.definir_senha(usuario_id, senha_hash, salt, iteracoes, 1)
        usuario = await self.repo.usuario_por_id(usuario_id)
        await self.repo.liberar(regras.resumo(usuario["cpf"]))
        await self.repo.apagar_sessoes(usuario_id)
        await self.auditar("senha_redefinida", usuario_id)
        return responder({"senha_temporaria": temporaria})
