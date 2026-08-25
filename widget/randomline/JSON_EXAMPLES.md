# Примеры JSON для виджета RandomLine

## 1. Запрос от виджета на Flask сервер (POST /api/zcad/draw-random-lines)

```json
{
  "count": 1000,
  "seed": 42,
  "min_coord": -100.0,
  "max_coord": 100.0
}
```

### Описание полей:
- `count` (integer, обязательно): Количество линий для создания (1-10000)
- `seed` (integer, опционально): Seed для генератора случайных чисел
- `min_coord` (float, опционально): Минимальная координата (по умолчанию -100)
- `max_coord` (float, опционально): Максимальная координата (по умолчанию 100)

---

## 2. Запрос от Flask сервера к ZCAD IPC Server (команда BATCH_LINES)

```json
{
  "id": "cmd-0001",
  "cmd": "BATCH_LINES",
  "args": [
    [-45.23, 67.89, 12.34, -89.01],
    [23.45, -56.78, -90.12, 34.56],
    [78.90, 12.34, -45.67, -23.45],
    ...
    [x1, y1, x2, y2]
  ]
}
```

### Описание:
- `id`: Уникальный идентификатор команды
- `cmd`: Имя команды `BATCH_LINES`
- `args`: Массив линий, где каждая линия это `[x1, y1, x2, y2]`

**Примечание:** Для 1000 линий массив будет содержать 1000 элементов `[x1, y1, x2, y2]`

---

## 3. Ответ от ZCAD IPC Server на команду BATCH_LINES

```json
{
  "id": "cmd-0001",
  "status": "ok",
  "result": {
    "lines_created": 1000,
    "batch_id": "batch-20260824-164327",
    "message": "Successfully created 1000 lines in batch mode"
  }
}
```

### Описание полей:
- `id`: ID команды (соответствует запросу)
- `status`: `"ok"` или `"error"`
- `result`: Объект с результатами:
  - `lines_created`: Количество созданных линий
  - `batch_id`: Идентификатор пакетной операции
  - `message`: Сообщение о результате

---

## 4. Ответ от Flask сервера виджету

```json
{
  "status": "ok",
  "message": "1000 lines created in ZCAD",
  "details": {
    "requested": 1000,
    "created": 1000,
    "duration_seconds": 0.42,
    "batch_result": "Successfully created 1000 lines in batch mode"
  },
  "timestamp": "2026-08-24T16:43:27.057"
}
```

### Описание полей:
- `status`: `"ok"` или `"error"`
- `message`: Краткое сообщение
- `details`: Детали операции:
  - `requested`: Запрошенное количество линий
  - `created`: Фактически созданное количество
  - `duration_seconds`: Время выполнения в секундах
  - `batch_result`: Результат от ZCAD
- `timestamp`: ISO 8601 timestamp завершения

---

## 5. Пример запроса для вставки устройства (POST /api/zcad/insert-device)

```json
{
  "device_name": "RESISTOR_0805",
  "params": {
    "resistance": 1000,
    "power": 0.125,
    "tolerance": 1,
    "package": "0805"
  },
  "x": 50.0,
  "y": 100.0
}
```

### Описание полей:
- `device_name` (string, обязательно): Имя устройства для вставки
- `params` (object, опционально): Параметры устройства (переменные)
- `x` (float, опционально): X координата вставки (по умолчанию 0)
- `y` (float, опционально): Y координата вставки (по умолчанию 0)

---

## 6. Запрос от Flask к ZCAD для INSERT_DEVICE

```json
{
  "id": "cmd-0002",
  "cmd": "INSERT_DEVICE",
  "args": [
    {
      "device_name": "RESISTOR_0805",
      "params": {
        "resistance": 1000,
        "power": 0.125,
        "tolerance": 1
      },
      "position": {
        "x": 50.0,
        "y": 100.0
      }
    }
  ]
}
```

---

## Сравнение производительности

### Старый подход (1000 отдельных команд LINE):
```
1000 × (отправка + ожидание ответа + парсинг) = ~16 секунд
```

### Новый подход (одна команда BATCH_LINES):
```
1 × (отправка + ожидание ответа + парсинг) = ~0.3-0.5 секунд
```

**Ускорение: 50-100×**
