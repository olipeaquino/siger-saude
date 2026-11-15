import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

import validacao

VALIDO = {
    "nome": "Maria",
    "sobrenome": "Silva",
    "cpf": "529.982.247-25",
    "email": "Maria@Exemplo.com",
    "senha": "abc123",
}


class CpfTest(unittest.TestCase):
    def test_ac2_aceita_cpf_com_e_sem_mascara(self):
        self.assertEqual(validacao.limpar_cpf("529.982.247-25"), "52998224725")
        self.assertEqual(validacao.limpar_cpf("52998224725"), "52998224725")

    def test_ac2_recusa_cpf_invalido(self):
        for valor in ("52998224724", "11111111111", "123", "", None, 52998224725, "5299822472a"):
            self.assertIsNone(validacao.limpar_cpf(valor))


class SenhaTest(unittest.TestCase):
    def test_ac2_aceita_de_6_a_16_com_letra_e_numero(self):
        for valor in ("abc123", "Senha@1234567890"):
            self.assertIsNone(validacao.erro_senha(valor))

    def test_ac2_recusa_fora_da_regra(self):
        for valor in ("ab12", "a" * 16 + "1", "abcdefgh", "12345678", None):
            self.assertIsNotNone(validacao.erro_senha(valor))


class CadastroTest(unittest.TestCase):
    def test_ac1_normaliza_dados_validos(self):
        limpos, erros = validacao.validar_cadastro(VALIDO)
        self.assertEqual(erros, {})
        self.assertEqual(limpos["cpf"], "52998224725")
        self.assertEqual(limpos["email"], "maria@exemplo.com")

    def test_ac2_aponta_cada_campo_invalido(self):
        _, erros = validacao.validar_cadastro(
            {"nome": "M", "sobrenome": "", "cpf": "1", "email": "sem-arroba", "senha": "x"}
        )
        self.assertEqual(set(erros), {"nome", "sobrenome", "cpf", "email", "senha"})

    def test_ac2_campos_ausentes(self):
        _, erros = validacao.validar_cadastro({})
        self.assertEqual(len(erros), 5)


if __name__ == "__main__":
    unittest.main()
