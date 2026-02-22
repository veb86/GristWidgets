# GristWidgets

Проект виджетов для GRIST с интеграцией ZCAD через TCP.

## 🚀 Быстрый старт

### Вариант 1: Главное меню (рекомендуется)

```bash
cd c:\zcad\GristWidgets
start.bat
```

**Меню:**
1. **All Widgets + Flask API** — все виджеты + Flask (порт 8080 + 5000)
2. **Flask API only** — только серверная часть (порт 5000)
3. **Widget HTTP only** — все виджеты (порт 3333)
4. **Widget HTTP** — все виджеты (порт 8080)
5. **Check dependencies** — проверка зависимостей

### Вариант 2: Прямой запуск

**Flask API сервер:**
```bash
cd c:\zcad\GristWidgets
python\python.exe server\flask_server.py
```

**HTTP сервер для всех виджетов:**
```bash
cd c:\zcad\GristWidgets\widget
..\..\python\python.exe -m http.server 8080
```

## 📁 Структура проекта

```
GristWidgets/
├── start.bat                 # Главное меню запуска
├── README.md                 # Эта инструкция
│
├── python/                   # PORTABLE PYTHON 3.11.9
│   ├── python.exe            # Интерпретатор
│   ├── Scripts/              # flask.exe, pip.exe
│   └── server.pth            # Путь к server/ для импортов
│
├── server/                   # СЕРВЕРНАЯ ЧАСТЬ (Flask API)
│   ├── flask_server.py       # Flask API сервер
│   ├── zcad_tcp_client.py    # TCP клиент для ZCAD
│   ├── test_zcad_client.py   # Unit-тесты
│   ├── architecture.py       # Схема архитектуры
│   ├── requirements.txt      # Python зависимости
│   ├── start.bat             # Быстрый запуск Random Line
│   ├── README.md             # Документация сервера
│   └── logs/                 # Логи Flask
│
└── widget/                   # FRONTEND (GRIST виджеты)
    ├── randomline/           # Random Line виджет
    │   ├── index.html
    │   ├── widget.json
    │   ├── css/
    │   └── js/
    ├── electricalCalc/       # Electrical Calc виджет
    ├── onelineschema/        # One Line Schema виджет
    ├── edittable/
    ├── managerCalc/
    ├── multipage/
    ├── tree/
    └── ...
```

## 🌐 Доступ к виджетам

После запуска сервера виджеты доступны по URL:

| Виджет | URL |
|--------|-----|
| Все виджеты | http://localhost:8080/ |
| Random Line | http://localhost:8080/randomline/ |
| Electrical Calc | http://localhost:8080/electricalCalc/ |
| One Line Schema | http://localhost:8080/onelineschema/ |
| Edit Table | http://localhost:8080/edittable/ |
| Manager Calc | http://localhost:8080/managerCalc/ |
| Tree | http://localhost:8080/tree/ |

## 🔗 Архитектура Random Line Widget

```
GRIST Widget (Frontend)
       │
       │ HTTP POST (JSON)
       ▼
Flask API Server (порт 5000)
       │
       │ TCP Socket (JSON over TCP)
       ▼
ZCAD TCP Server (порт 7777)
```

## ⚙️ Настройка GRIST

1. Запустите Flask + Widget:
   ```bash
   cd c:\zcad\GristWidgets
   start.bat
   ```
   Выберите опцию **1**

2. В GRIST:
   - Откройте страницу
   - Добавьте виджет → **Custom Widget**
   - URL: `http://localhost:8080/randomline/` (или другой виджет)

3. Параметры виджета (для Random Line):
   - `flaskUrl`: `http://127.0.0.1:5000`
   - `zcadHost`: `127.0.0.1`
   - `zcadPort`: `7777`

## 📦 Portable Python

Проект использует Portable Python 3.11.9 в папке `python/`.

**Установка зависимостей:**
```bash
cd c:\zcad\GristWidgets
python\python.exe -m pip install -r server\requirements.txt
```

**Проверка пакетов:**
```bash
python\python.exe -m pip list
```

## 🧪 Тестирование

**Проверка Flask:**
```bash
curl http://127.0.0.1:5000/api/health
```

**Проверка TCP клиента:**
```bash
cd c:\zcad\GristWidgets
python\python.exe server\test_zcad_client.py
```

## 🔧 Troubleshooting

### Ошибка: "Portable Python not found"
Проверьте что папка `python/` существует в корне проекта.

### Ошибка: "ModuleNotFoundError: No module named 'flask'"
Установите зависимости:
```bash
python\python.exe -m pip install -r server\requirements.txt
```

### Ошибка: "Connection refused - is ZCAD running?"
Убедитесь что ZCAD запущен и TCP сервер активен на порту 7777.

### Flask не запускается
Проверьте что `python/server.pth` содержит путь к `server/`:
```
c:\zcad\GristWidgets\server
```

## 📚 Документация

- [Серверная часть](server/README.md) — Flask API документация
- [Random Line виджет](widget/randomline/README.md) — Frontend документация

## 📋 Требования

- Windows 10/11
- ZCAD с TCP сервером (порт 7777)
- GRIST
