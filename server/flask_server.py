#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Flask API Server для виджета Random Line
Прокси между GRIST и ZCAD через TCP
"""

import os
import sys
import logging
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
from zcad_tcp_client import ZCADTCPClient

# Настройка логирования
log_dir = 'logs'
if not os.path.exists(log_dir):
    os.makedirs(log_dir)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(os.path.join(log_dir, 'flask_app.log'), encoding='utf-8'),
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger(__name__)

# Инициализация Flask приложения
app = Flask(__name__)
CORS(app)  # Разрешаем CORS для доступа из GRIST

# Конфигурация
ZCAD_HOST = os.environ.get('ZCAD_HOST', '127.0.0.1')
ZCAD_PORT = int(os.environ.get('ZCAD_PORT', 7777))
ZCAD_TOKEN = os.environ.get('ZCAD_TOKEN', '')

logger.info(f"Конфигурация: ZCAD={ZCAD_HOST}:{ZCAD_PORT}")

# Глобальный клиент для постоянных соединений
zcad_client = None


def get_zcad_client() -> ZCADTCPClient:
    """Получение TCP клиента для ZCAD."""
    global zcad_client
    if zcad_client is None:
        zcad_client = ZCADTCPClient(host=ZCAD_HOST, port=ZCAD_PORT, token=ZCAD_TOKEN)
    return zcad_client


@app.route('/api/zcad/ping', methods=['POST'])
def ping_zcad():
    """
    Проверка доступности ZCAD.
    
    Returns:
        JSON с статусом подключения
    """
    logger.info("POST /api/zcad/ping - Проверка соединения")
    
    try:
        client = get_zcad_client()
        result = client.ping()
        
        if result.get('status') == 'ok':
            logger.info("ZCAD доступен")
            return jsonify({
                'status': 'ok',
                'message': 'ZCAD connected',
                'timestamp': datetime.now().isoformat()
            })
        else:
            logger.warning(f"ZCAD ответил с ошибкой: {result}")
            return jsonify({
                'status': 'error',
                'message': result.get('error', 'Unknown error')
            }), 503
            
    except Exception as e:
        logger.error(f"Ошибка ping: {e}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 503


@app.route('/api/zcad/draw-random-lines', methods=['POST'])
def draw_random_lines():
    """
    Генерация случайных линий в ZCAD.
    
    Request JSON:
        {
            "count": 1000,          # количество линий (обязательно)
            "seed": 42,             # seed для рандома (опционально)
            "min_coord": -100,      # минимальная координата (опционально)
            "max_coord": 100        # максимальная координата (опционально)
        }
    
    Returns:
        JSON с результатом операции
    """
    logger.info("POST /api/zcad/draw-random-lines - Запрос на генерацию линий")
    
    # Проверка наличия данных
    if not request.is_json:
        logger.warning("Запрос без JSON тела")
        return jsonify({
            'status': 'error',
            'message': 'Content-Type must be application/json'
        }), 400
    
    data = request.get_json()
    
    # Извлечение параметров
    try:
        count = int(data.get('count', 1000))
        seed = data.get('seed')
        min_coord = float(data.get('min_coord', -100))
        max_coord = float(data.get('max_coord', 100))
    except (ValueError, TypeError) as e:
        logger.error(f"Ошибка парсинга параметров: {e}")
        return jsonify({
            'status': 'error',
            'message': f'Invalid parameters: {str(e)}'
        }), 400
    
    # Валидация
    if count < 1 or count > 10000:
        logger.warning(f"Недопустимое количество линий: {count}")
        return jsonify({
            'status': 'error',
            'message': 'Count must be between 1 and 10000'
        }), 400
    
    if min_coord >= max_coord:
        logger.warning(f"Некорректный диапазон координ: {min_coord} >= {max_coord}")
        return jsonify({
            'status': 'error',
            'message': 'min_coord must be less than max_coord'
        }), 400
    
    logger.info(f"Параметры: count={count}, seed={seed}, min={min_coord}, max={max_coord}")
    
    try:
        client = get_zcad_client()
        
        # Установка seed если указан
        if seed is not None:
            import random
            random.seed(seed)
            logger.info(f"Seed установлен в {seed}")
        
        # Генерация линий
        start_time = datetime.now()
        logger.info(f"Начало генерации {count} линий...")
        
        results = client.random_lines(
            count=count,
            min_coord=min_coord,
            max_coord=max_coord
        )
        
        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()
        
        # Анализ результатов
        if not results:
            logger.error("Пустой результат от ZCAD")
            return jsonify({
                'status': 'error',
                'message': 'Empty response from ZCAD'
            }), 500
        
        # Последний результат это END_BATCH
        last_result = results[-1]
        
        if last_result.get('status') == 'ok':
            lines_created = sum(1 for r in results[:-1] if r.get('status') == 'ok')
            logger.info(f"Успешно создано {lines_created} линий за {duration:.2f}с")
            
            return jsonify({
                'status': 'ok',
                'message': f'{lines_created} lines created in ZCAD',
                'details': {
                    'requested': count,
                    'created': lines_created,
                    'duration_seconds': duration,
                    'batch_result': last_result.get('result', 'Batch completed')
                },
                'timestamp': end_time.isoformat()
            })
        else:
            error_msg = last_result.get('error', 'Unknown error in batch')
            logger.error(f"Ошибка в пакетном режиме: {error_msg}")
            return jsonify({
                'status': 'error',
                'message': error_msg
            }), 500
            
    except ConnectionRefusedError:
        logger.error("Соединение отклонено - ZCAD не запущен?")
        return jsonify({
            'status': 'error',
            'message': 'Connection refused - is ZCAD running?'
        }), 503
        
    except TimeoutError:
        logger.error("Таймаут соединения")
        return jsonify({
            'status': 'error',
            'message': 'Connection timeout'
        }), 503
        
    except Exception as e:
        logger.error(f"Неожиданная ошибка: {e}", exc_info=True)
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@app.route('/api/zcad/line', methods=['POST'])
def draw_single_line():
    """
    Создание одной линии в ZCAD.
    
    Request JSON:
        {
            "x1": 0,
            "y1": 0,
            "x2": 100,
            "y2": 100
        }
    
    Returns:
        JSON с результатом
    """
    logger.info("POST /api/zcad/line - Создание линии")
    
    if not request.is_json:
        return jsonify({
            'status': 'error',
            'message': 'Content-Type must be application/json'
        }), 400
    
    data = request.get_json()
    
    try:
        x1 = float(data.get('x1', 0))
        y1 = float(data.get('y1', 0))
        x2 = float(data.get('x2', 100))
        y2 = float(data.get('y2', 100))
    except (ValueError, TypeError) as e:
        return jsonify({
            'status': 'error',
            'message': f'Invalid coordinates: {str(e)}'
        }), 400
    
    try:
        client = get_zcad_client()
        result = client.line(x1, y1, x2, y2)
        
        if result.get('status') == 'ok':
            logger.info(f"Линия создана: ({x1},{y1}) -> ({x2},{y2})")
            return jsonify({
                'status': 'ok',
                'message': 'Line created',
                'result': result
            })
        else:
            return jsonify({
                'status': 'error',
                'message': result.get('error', 'Failed to create line')
            }), 500
            
    except Exception as e:
        logger.error(f"Ошибка создания линии: {e}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@app.route('/api/health', methods=['GET'])
def health_check():
    """
    Проверка здоровья Flask сервера.
    """
    return jsonify({
        'status': 'ok',
        'service': 'randomline-flask-api',
        'timestamp': datetime.now().isoformat(),
        'zcad_config': {
            'host': ZCAD_HOST,
            'port': ZCAD_PORT
        }
    })


@app.errorhandler(404)
def not_found(error):
    return jsonify({
        'status': 'error',
        'message': 'Endpoint not found'
    }), 404


@app.errorhandler(500)
def internal_error(error):
    return jsonify({
        'status': 'error',
        'message': 'Internal server error'
    }), 500


if __name__ == '__main__':
    # Получаем конфигурацию из переменных окружения или используем значения по умолчанию
    host = os.environ.get('FLASK_HOST', '0.0.0.0')
    port = int(os.environ.get('FLASK_PORT', 5000))
    debug = os.environ.get('FLASK_DEBUG', 'false').lower() == 'true'
    
    logger.info(f"Запуск Flask сервера на {host}:{port} (debug={debug})")
    
    app.run(
        host=host,
        port=port,
        debug=debug,
        threaded=True
    )
