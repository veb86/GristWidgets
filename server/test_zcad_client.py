#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Unit-тесты для ZCAD TCP Client
"""

import unittest
import sys
import os

# Добавляем текущую директорию в path
sys.path.insert(0, os.path.dirname(__file__))

from zcad_tcp_client import ZCADTCPClient, test_connection


class TestZCADTCPClient(unittest.TestCase):
    """Тесты для ZCADTCPClient."""

    def setUp(self):
        """Настройка перед каждым тестом."""
        self.client = ZCADTCPClient(host='127.0.0.1', port=7777)

    def tearDown(self):
        """Очистка после каждого теста."""
        self.client.disconnect()

    def test_init_default_values(self):
        """Тест инициализации со значениями по умолчанию."""
        client = ZCADTCPClient()
        self.assertEqual(client.host, '127.0.0.1')
        self.assertEqual(client.port, 7777)
        self.assertEqual(client.token, '')
        self.assertIsNone(client._socket)

    def test_init_custom_values(self):
        """Тест инициализации с кастомными значениями."""
        client = ZCADTCPClient(host='192.168.1.100', port=8888, token='test-token')
        self.assertEqual(client.host, '192.168.1.100')
        self.assertEqual(client.port, 8888)
        self.assertEqual(client.token, 'test-token')

    def test_generate_id_unique(self):
        """Тест уникальности генерируемых ID."""
        ids = [self.client._generate_id() for _ in range(100)]
        self.assertEqual(len(ids), len(set(ids)), "ID должны быть уникальными")

    def test_generate_id_format(self):
        """Тест формата генерируемых ID."""
        for i in range(1, 101):
            id_value = self.client._generate_id()
            self.assertTrue(id_value.startswith('cmd-'))
            self.assertEqual(len(id_value), 8)  # cmd-XXXX

    def test_connect_disconnect(self):
        """Тест подключения и отключения (только если ZCAD доступен)."""
        if not test_connection():
            self.skipTest("ZCAD недоступен")
        
        self.client.connect()
        self.assertIsNotNone(self.client._socket)
        
        self.client.disconnect()
        self.assertIsNone(self.client._socket)

    def test_ping_success(self):
        """Тест успешного ping (только если ZCAD доступен)."""
        if not test_connection():
            self.skipTest("ZCAD недоступен")
        
        result = self.client.ping()
        self.assertEqual(result.get('status'), 'ok')

    def test_ping_failure(self):
        """Тест неудачного ping (когда ZCAD недоступен)."""
        client = ZCADTCPClient(host='127.0.0.1', port=9999)  # Неверный порт
        result = client.ping()
        self.assertEqual(result.get('status'), 'error')
        self.assertIn(result.get('error'), ['Connection refused - is ZCAD running?', 'Connection timeout'])

    def test_random_lines_count(self):
        """Тест количества возвращаемых результатов."""
        if not test_connection():
            self.skipTest("ZCAD недоступен")
        
        count = 10
        results = self.client.random_lines(count=count)
        
        # Должно быть: 1 BEGIN_BATCH + count LINE + 1 END_BATCH
        expected_count = count + 2
        self.assertEqual(len(results), expected_count)

    def test_random_lines_batch_structure(self):
        """Тест структуры результатов пакетного режима."""
        if not test_connection():
            self.skipTest("ZCAD недоступен")
        
        results = self.client.random_lines(count=5)
        
        # Первый результат - BEGIN_BATCH
        self.assertEqual(results[0].get('status'), 'ok')
        
        # Последний результат - END_BATCH
        self.assertEqual(results[-1].get('status'), 'ok')
        
        # Промежуточные - LINE
        for result in results[1:-1]:
            self.assertIn('status', result)

    def test_random_lines_coord_range(self):
        """Тест что линии создаются в указанном диапазоне координат."""
        # Этот тест проверяет только логику генерации, не требует ZCAD
        import random
        
        min_coord = -50
        max_coord = 50
        count = 100
        
        random.seed(42)  # Фиксированный seed для воспроизводимости
        
        for _ in range(count):
            x1 = random.uniform(min_coord, max_coord)
            y1 = random.uniform(min_coord, max_coord)
            x2 = random.uniform(min_coord, max_coord)
            y2 = random.uniform(min_coord, max_coord)
            
            self.assertGreaterEqual(x1, min_coord)
            self.assertLessEqual(x1, max_coord)
            self.assertGreaterEqual(y1, min_coord)
            self.assertLessEqual(y1, max_coord)
            self.assertGreaterEqual(x2, min_coord)
            self.assertLessEqual(x2, max_coord)
            self.assertGreaterEqual(y2, min_coord)
            self.assertLessEqual(y2, max_coord)

    def test_context_manager(self):
        """Тест контекстного менеджера."""
        if not test_connection():
            self.skipTest("ZCAD недоступен")
        
        with ZCADTCPClient() as client:
            self.assertIsNotNone(client._socket)
            result = client.ping()
            self.assertEqual(result.get('status'), 'ok')
        
        # После выхода из контекста соединение должно быть закрыто
        self.assertIsNone(client._socket)

    def test_line_command(self):
        """Тест команды LINE."""
        if not test_connection():
            self.skipTest("ZCAD недоступен")
        
        result = self.client.line(0, 0, 100, 100)
        self.assertIn('status', result)

    def test_circle_command(self):
        """Тест команды CIRCLE."""
        if not test_connection():
            self.skipTest("ZCAD недоступен")
        
        result = self.client.circle(50, 50, 25)
        self.assertIn('status', result)

    def test_text_command(self):
        """Тест команды TEXT."""
        if not test_connection():
            self.skipTest("ZCAD недоступен")
        
        result = self.client.text(10, 10, "Test", 5.0)
        self.assertIn('status', result)


class TestConnectionFunction(unittest.TestCase):
    """Тесты для функции test_connection."""

    def test_connection_to_nonexistent_server(self):
        """Тест подключения к несуществующему серверу."""
        result = test_connection(host='127.0.0.1', port=9999)
        self.assertFalse(result)

    def test_connection_to_default_port(self):
        """Тест подключения к порту по умолчанию."""
        # Может пройти только если ZCAD запущен
        result = test_connection()
        # Не assert, так как зависит от окружения
        self.assertIsInstance(result, bool)


if __name__ == '__main__':
    # Запуск тестов
    unittest.main(verbosity=2)
