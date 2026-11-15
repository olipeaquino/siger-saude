import sys
import unittest
from datetime import timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

import regras
import senha
import validacao


class SenhaTest(unittest.IsolatedAsyncioTestCase):
    async def test_ac4_confere_senha_correta_e_recusa_errada(self):
        senha_hash, salt, iteracoes = await senha.gerar("abc123")
        self.assertNotIn("abc123", senha_hash)
        self.assertTrue(await senha.conferir("abc123", senha_hash, salt, iteracoes))
        self.assertFalse(await senha.conferir("abc124", senha_hash, salt, iteracoes))

    async def test_ac4_salt_diferente_por_usuario(self):
        primeiro = await senha.gerar("abc123")
        segundo = await senha.gerar("abc123")
        self.assertNotEqual(primeiro[0], segundo[0])


class PrazosTest(unittest.TestCase):
    def test_ac6_bloqueio_dura_4_minutos(self):
        inicio = regras.agora()
        ate = regras.iso(inicio + regras.BLOQUEIO)
        self.assertFalse(regras.vencido(ate, inicio + timedelta(minutes=3, seconds=59)))
        self.assertTrue(regras.vencido(ate, inicio + timedelta(minutes=4)))
        self.assertTrue(regras.vencido("", inicio))
        self.assertEqual(regras.MAX_TENTATIVAS, 3)

    def test_ac8_sessao_dura_3_horas(self):
        inicio = regras.agora()
        ate = regras.iso(inicio + regras.SESSAO)
        self.assertFalse(regras.vencido(ate, inicio + timedelta(hours=2, minutes=59)))
        self.assertTrue(regras.vencido(ate, inicio + timedelta(hours=3)))


class ApoioTest(unittest.TestCase):
    def test_ac12_mascara_cpf(self):
        self.assertEqual(regras.mascarar_cpf("52998224725"), "***.982.247-**")

    def test_ac13_senha_temporaria_segue_a_regra_de_senha(self):
        for _ in range(50):
            self.assertIsNone(validacao.erro_senha(regras.senha_temporaria()))

    def test_ac9_token_guardado_como_hash(self):
        self.assertEqual(len(regras.hash_token("abc")), 64)
        self.assertNotEqual(regras.hash_token("abc"), "abc")


if __name__ == "__main__":
    unittest.main()
