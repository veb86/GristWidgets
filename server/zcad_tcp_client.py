#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ZCAD TCP Client
Модуль для взаимодействия с ZCAD через TCP + JSON

Основан на логике из uzvipcclient.py
"""

import socket
import json
import random
from typing import List, Optional, Dict, Any


class ZCADTCPClient:
    """
    TCP клиент для взаимодействия с ZCAD.
    
    Использует пакетный режим для эффективной отправки множества команд.
    """

    def __init__(self, host: str = '127.0.0.1', port: int = 7777, token: str = ''):
        """
        Инициализация клиента.
        
        Args:
            host: Хост ZCAD сервера
            port: Порт ZCAD сервера
            token: Токен аутентификации (опционально)
        """
        self.host = host
        self.port = port
        self.token = token
        self._counter = 0
        self._socket: Optional[socket.socket] = None

    def _generate_id(self) -> str:
        """Генерация уникального ID команды."""
        self._counter += 1
        return f"cmd-{self._counter:04d}"

    def connect(self) -> None:
        """Установить постоянное соединение с ZCAD."""
        if self._socket is None:
            self._socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self._socket.settimeout(30)
            self._socket.connect((self.host, self.port))

    def disconnect(self) -> None:
        """Закрыть постоянное соединение."""
        if self._socket:
            self._socket.close()
            self._socket = None

    def _send_command(self, cmd: str, args: List[Any] = None, 
                      use_persistent: bool = False) -> Dict[str, Any]:
        """
        Отправка команды на сервер и получение ответа.
        
        Args:
            cmd: Имя команды
            args: Аргументы команды
            use_persistent: Использовать ли постоянное соединение
            
        Returns:
            Словарь с результатом выполнения
        """
        if args is None:
            args = []

        request = {
            'id': self._generate_id(),
            'cmd': cmd.upper(),
            'args': args
        }

        if self.token:
            request['token'] = self.token

        request_json = json.dumps(request)

        try:
            if use_persistent and self._socket:
                # Используем постоянное соединение
                sock = self._socket
                sock.sendall(request_json.encode('utf-8'))

                response_data = b''
                sock.settimeout(5)  # Короткий таймаут для чтения
                while True:
                    try:
                        chunk = sock.recv(4096)
                        if not chunk:
                            break
                        response_data += chunk
                        # Проверяем, получили ли полный JSON
                        try:
                            response = json.loads(response_data.decode('utf-8'))
                            return response
                        except json.JSONDecodeError:
                            continue  # Ждём ещё данных
                    except socket.timeout:
                        break

                response = json.loads(response_data.decode('utf-8'))
                return response
            else:
                # Создаём новое соединение для каждой команды
                with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
                    sock.settimeout(30)
                    sock.connect((self.host, self.port))
                    sock.sendall(request_json.encode('utf-8'))
                    # Закрываем запись чтобы получить ответ
                    sock.shutdown(socket.SHUT_WR)

                    response_data = b''
                    while True:
                        chunk = sock.recv(4096)
                        if not chunk:
                            break
                        response_data += chunk

                    response = json.loads(response_data.decode('utf-8'))
                    return response

        except socket.timeout:
            return {'id': request.get('id', 'unknown'), 
                    'status': 'error', 
                    'error': 'Connection timeout'}
        except ConnectionRefusedError:
            return {'id': request.get('id', 'unknown'), 
                    'status': 'error', 
                    'error': 'Connection refused - is ZCAD running?'}
        except Exception as e:
            return {'id': request.get('id', 'unknown'), 
                    'status': 'error', 
                    'error': str(e)}

    def ping(self) -> Dict[str, Any]:
        """
        Проверка доступности ZCAD.
        
        Returns:
            Результат проверки
        """
        return self._send_command('PING')

    def save(self, filename: Optional[str] = None) -> Dict[str, Any]:
        """
        Сохранение чертежа.
        
        Args:
            filename: Имя файла (опционально)
            
        Returns:
            Результат сохранения
        """
        args = [filename] if filename else []
        return self._send_command('SAVE', args)

    def export(self, filename: str) -> Dict[str, Any]:
        """
        Экспорт чертежа.
        
        Args:
            filename: Имя файла для экспорта
            
        Returns:
            Результат экспорта
        """
        return self._send_command('EXPORT', [filename])

    def line(self, x1: float, y1: float, x2: float, y2: float) -> Dict[str, Any]:
        """
        Создание линии.
        
        Args:
            x1, y1: Координаты начала
            x2, y2: Координаты конца
            
        Returns:
            Результат создания
        """
        return self._send_command('LINE', [x1, y1, x2, y2])

    def circle(self, x: float, y: float, radius: float) -> Dict[str, Any]:
        """
        Создание окружности.
        
        Args:
            x, y: Координаты центра
            radius: Радиус
            
        Returns:
            Результат создания
        """
        return self._send_command('CIRCLE', [x, y, radius])

    def text(self, x: float, y: float, content: str, 
             height: float = 2.5) -> Dict[str, Any]:
        """
        Создание текста.
        
        Args:
            x, y: Координаты вставки
            content: Содержимое текста
            height: Высота текста
            
        Returns:
            Результат создания
        """
        return self._send_command('TEXT', [x, y, content, height])

    def begin_batch(self) -> Dict[str, Any]:
        """
        Начало пакетной вставки примитивов.
        
        Returns:
            Результат начала пакетного режима
        """
        self.connect()
        return self._send_command('BEGIN_BATCH', use_persistent=True)

    def end_batch(self) -> Dict[str, Any]:
        """
        Завершение пакетной вставки и фиксация в чертеже.
        
        Returns:
            Результат завершения пакетного режима
        """
        result = self._send_command('END_BATCH', use_persistent=True)
        self.disconnect()
        return result

    def random_lines(self, count: int = 1000, min_coord: float = -100, 
                     max_coord: float = 100) -> List[Dict[str, Any]]:
        """
        Создание множества линий с рандомными координатами в пакетном режиме.
        
        Args:
            count: Количество линий
            min_coord: Минимальная координата
            max_coord: Максимальная координата
            
        Returns:
            Список результатов выполнения команд
        """
        results = []

        # Устанавливаем постоянное соединение
        self.connect()

        try:
            # Начинаем пакетный режим
            result = self._send_command('BEGIN_BATCH', use_persistent=True)
            if result.get('status') != 'ok':
                return [{'status': 'error', 
                        'error': 'Failed to start batch mode: ' + 
                                result.get('error', 'unknown')}]
            results.append(result)

            # Отправляем все линии через одно соединение
            for i in range(count):
                x1 = random.uniform(min_coord, max_coord)
                y1 = random.uniform(min_coord, max_coord)
                x2 = random.uniform(min_coord, max_coord)
                y2 = random.uniform(min_coord, max_coord)
                
                result = self._send_command('LINE', [x1, y1, x2, y2], 
                                           use_persistent=True)
                results.append(result)

        finally:
            # Завершаем пакетный режим и закрываем соединение
            result = self._send_command('END_BATCH', use_persistent=True)
            results.append(result)
            
            # Закрываем соединение
            self.disconnect()

        return results

    def __enter__(self):
        """Контекстный менеджер: вход."""
        self.connect()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Контекстный менеджер: выход."""
        self.disconnect()


# Функция для быстрого тестирования
def test_connection(host: str = '127.0.0.1', port: int = 7777) -> bool:
    """
    Быстрая проверка доступности ZCAD.
    
    Args:
        host: Хост для проверки
        port: Порт для проверки
        
    Returns:
        True если ZCAD доступен
    """
    client = ZCADTCPClient(host=host, port=port)
    try:
        result = client.ping()
        return result.get('status') == 'ok'
    except Exception:
        return False


if __name__ == '__main__':
    # Тестовый запуск
    print("ZCAD TCP Client - тестовый режим")
    print("-" * 40)
    
    client = ZCADTCPClient()
    
    # Проверка подключения
    print("Проверка подключения...")
    result = client.ping()
    print(f"Ping: {json.dumps(result, indent=2, ensure_ascii=False)}")
    
    if result.get('status') == 'ok':
        print("\nZCAD доступен! Тест создание 10 случайных линий...")
        
        results = client.random_lines(count=10, min_coord=-50, max_coord=50)
        
        success_count = sum(1 for r in results if r.get('status') == 'ok')
        print(f"Успешно выполнено: {success_count}/{len(results)} команд")
    else:
        print("\nZCAD недоступен. Убедитесь, что сервер запущен.")
