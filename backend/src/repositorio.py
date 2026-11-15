import json

from js import JSON


class Repositorio:
    def __init__(self, db):
        self.db = db

    async def _todos(self, sql, *valores):
        resultado = await self.db.prepare(sql).bind(*valores).all()
        return json.loads(JSON.stringify(resultado.results))

    async def _um(self, sql, *valores):
        linhas = await self._todos(sql, *valores)
        return linhas[0] if linhas else None

    async def _executar(self, sql, *valores):
        await self.db.prepare(sql).bind(*valores).run()

    async def criar_usuario(self, dados, senha_hash, salt, iteracoes, criado_em):
        linha = await self._um(
            "INSERT INTO usuarios (nome, sobrenome, cpf, email, senha_hash, senha_salt,"
            " senha_iteracoes, criado_em) VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id",
            dados["nome"], dados["sobrenome"], dados["cpf"], dados["email"],
            senha_hash, salt, iteracoes, criado_em,
        )
        return linha["id"]

    async def usuario_por_cpf(self, cpf):
        return await self._um("SELECT * FROM usuarios WHERE cpf = ?", cpf)

    async def usuario_por_sessao(self, token_hash, momento):
        return await self._um(
            "SELECT u.* FROM sessoes s JOIN usuarios u ON u.id = s.usuario_id"
            " WHERE s.token_hash = ? AND s.expira_em > ?",
            token_hash, momento,
        )

    async def somar_tentativa(self, usuario_id):
        linha = await self._um(
            "UPDATE usuarios SET tentativas = tentativas + 1 WHERE id = ? RETURNING tentativas",
            usuario_id,
        )
        return linha["tentativas"]

    async def definir_bloqueio(self, usuario_id, bloqueado_ate):
        await self._executar(
            "UPDATE usuarios SET tentativas = 0, bloqueado_ate = ? WHERE id = ?",
            bloqueado_ate, usuario_id,
        )

    async def definir_senha(self, usuario_id, senha_hash, salt, iteracoes, deve_trocar):
        await self._executar(
            "UPDATE usuarios SET senha_hash = ?, senha_salt = ?, senha_iteracoes = ?,"
            " deve_trocar_senha = ? WHERE id = ?",
            senha_hash, salt, iteracoes, deve_trocar, usuario_id,
        )

    async def criar_sessao(self, token_hash, usuario_id, expira_em):
        await self._executar(
            "INSERT INTO sessoes (token_hash, usuario_id, expira_em) VALUES (?, ?, ?)",
            token_hash, usuario_id, expira_em,
        )

    async def apagar_sessao(self, token_hash):
        await self._executar("DELETE FROM sessoes WHERE token_hash = ?", token_hash)

    async def apagar_sessoes(self, usuario_id, exceto=""):
        await self._executar(
            "DELETE FROM sessoes WHERE usuario_id = ? AND token_hash <> ?", usuario_id, exceto
        )

    async def criar_pedido(self, usuario_id, criado_em):
        await self._executar(
            "INSERT INTO pedidos_redefinicao (usuario_id, criado_em) SELECT ?, ?"
            " WHERE NOT EXISTS (SELECT 1 FROM pedidos_redefinicao"
            " WHERE usuario_id = ? AND atendido_em = '')",
            usuario_id, criado_em, usuario_id,
        )

    async def pedidos_pendentes(self):
        return await self._todos(
            "SELECT p.id, p.criado_em, u.nome, u.sobrenome, u.cpf, u.email"
            " FROM pedidos_redefinicao p JOIN usuarios u ON u.id = p.usuario_id"
            " WHERE p.atendido_em = '' ORDER BY p.criado_em"
        )

    async def atender_pedido(self, pedido_id, atendido_em):
        return await self._um(
            "UPDATE pedidos_redefinicao SET atendido_em = ? WHERE id = ? AND atendido_em = ''"
            " RETURNING usuario_id",
            atendido_em, pedido_id,
        )

    async def auditar(self, evento, momento, usuario_id=0):
        await self._executar(
            "INSERT INTO auditoria (usuario_id, evento, criado_em) VALUES (?, ?, ?)",
            usuario_id, evento, momento,
        )
