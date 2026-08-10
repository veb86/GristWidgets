"""Проверяет полноту и контрольные результаты расчёта tokKZ.cpd."""

from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]
WORKSHEET = ROOT / "tokKZ.cpd"


class TokKZWorksheetTest(unittest.TestCase):
    """Фиксирует обязательные разделы и исходные данные с листа-источника."""

    @classmethod
    def setUpClass(cls):
        cls.text = WORKSHEET.read_text(encoding="utf-8")

    def test_contains_all_calculation_sections(self):
        required_sections = (
            "Расчет токов КЗ в именованных единицах",
            "Выбор кабеля по длительно допустимому току",
            "Проверка выбранного кабеля по допустимой потере напряжения",
            "Нагрев жилы кабеля при коротком замыкании",
            "Расчет сопротивления кабельной линии",
            "Трехфазное короткое замыкание",
            "Двухфазное короткое замыкание",
            "Однофазное короткое замыкание",
            "Проверка выбранного кабеля на нагрев",
            "Данные для выбора аппарата защиты",
        )
        for section in required_sections:
            with self.subTest(section=section):
                self.assertIn(section, self.text)

    def test_contains_source_inputs(self):
        source_inputs = (
            "U_n = 6'kV",
            "f = 50'Hz",
            "I_3_0 = 15.3'kA",
            "R_s = 0.01'Ω",
            "P_p = 2293'kW",
            "cos_phi = 0.94",
            "L = 130'm",
            "L_for_KZ = 50'm",
            "r_core = 0.137'Ω/km",
            "x_core = 0.071'Ω/km",
            "I_allowed = 351'A",
            "F_cable = 240'mm²",
            "t_breaker = 37'ms",
            "P_motor = 778'kW",
        )
        for expression in source_inputs:
            with self.subTest(expression=expression):
                self.assertIn(expression, self.text)

    def test_contains_fault_calculations(self):
        for expression in (
            "I_3 =",
            "I_2 =",
            "I_1 =",
            "k_impact = 1 + e^(-tau/T_a)",
            "B_KZ_3 =",
            "B_KZ_2 =",
            "B_KZ_1 =",
        ):
            with self.subTest(expression=expression):
                self.assertIn(expression, self.text)

    def test_calcpad_structure_is_balanced(self):
        self.assertTrue(self.text.startswith("#md on\n"))
        self.assertEqual(self.text.count("#if "), self.text.count("#end if"))
        self.assertNotIn("?{", self.text)


if __name__ == "__main__":
    unittest.main()
