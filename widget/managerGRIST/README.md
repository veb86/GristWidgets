# managerGRIST Widget

Grist Widget для получения и выполнения JSON-команд от ZCAD через HTTP polling.

## Архитектура

```
managerGRIST
│
├── index.html              # HTML страница виджета
├── manager.js              # Главный модуль инициализации
├── config.js               # Конфигурация (адреса, интервалы)
├── command-queue.js        # Очередь команд с idempotency
├── polling-loop.js         # Цикл polling с защитой от параллельных запросов
│
├── communication/
│   ├── zcad-poll.js        # Модуль polling команд от ZCAD
│   └── zcad-ack.js         # Модуль отправки ACK подтверждений
│
├── commands/
│   ├── command-registry.js # Реестр команд
│   ├── insert-dev.js       # Команда INSERT_DEV
│   ├── set-grist-value.js  # Команда SET_GRIST_VALUE
│   ├── update-grist-record.js # Команда UPDATE_GRIST_RECORD
│   └── delete-grist-record.js # Команда DELETE_GRIST_RECORD
│
└── utils/
    ├── http.js             # HTTP утилиты (postJson, getJson)
    ├── grist-api.js        # Утилиты Grist API
    └── validation.js       # Утилиты валидации
```

## Принцип работы

```
ZCAD HTTP Server          managerGRIST              Grist
      │                        │                       │
      │                        │                       │
      ◄──── POST /grist/poll ──┤                       │
      │                        │                       │
      │──── JSON commands ────►│                       │
      │                        │                       │
      │                        ├────── execute ───────►│
      │                        │                       │
      │                        ◄────── result ─────────│
      │                        │                       │
      │──── POST /grist/ack ──►│                       │
      │   { "id": 1001 }       │                       │
      │                        │                       │
```

## Поток выполнения

1. **Инициализация**: При загрузке виджет регистрирует все команды в Command Registry
2. **Polling**: Запускается цикл опроса ZCAD каждые 100 мс
3. **Получение команд**: Если ZCAD возвращает команды, они добавляются в очередь
4. **Выполнение**: Команды выполняются последовательно через Registry
5. **ACK**: После успешного выполнения отправляется подтверждение в ZCAD

## Константы конфигурации

```javascript
// В config.js
const ZCAD_CONFIG = {
  BASE_URL: "http://127.0.0.1:5000",
  // Endpoints формируются автоматически
};

const POLL_INTERVAL = 100;     // Интервал polling (мс)
const HTTP_TIMEOUT = 5000;     // Timeout HTTP запросов (мс)
```

## Поддерживаемые команды

### INSERT_DEV
Вставляет устройство через IPC механизм ZCAD.

```json
{
  "id": 1,
  "command": "INSERT_DEV",
  "args": {...}
}
```

### SET_GRIST_VALUE
Устанавливает значение поля в записи Grist.

```json
{
  "id": 2,
  "command": "SET_GRIST_VALUE",
  "args": {
    "table": "Devices",
    "recordId": 25,
    "field": "Name",
    "value": "Светильник"
  }
}
```

### UPDATE_GRIST_RECORD
Обновляет несколько полей в записи Grist.

```json
{
  "id": 3,
  "command": "UPDATE_GRIST_RECORD",
  "args": {
    "table": "Devices",
    "recordId": 25,
    "fields": {
      "Name": "Новое имя",
      "Power": 100
    }
  }
}
```

### DELETE_GRIST_RECORD
Удаляет запись из таблицы Grist.

```json
{
  "id": 4,
  "command": "DELETE_GRIST_RECORD",
  "args": {
    "table": "Devices",
    "recordId": 25
  }
}
```

## Добавление новой команды

1. Создать файл `commands/new-command.js`
2. Зарегистрировать команду:

```javascript
ZCADCommandRegistry.register('NEW_COMMAND', async function(command) {
  const { args } = command;
  
  // Валидация
  if (!args) {
    throw new Error('NEW_COMMAND: missing args');
  }
  
  // Бизнес-логика
  // ...
  
  return result;
});
```

3. Подключить скрипт в `index.html`:

```html
<script src="./commands/new-command.js"></script>
```

## Особенности реализации

### Защита от параллельных POLL запросов
Если предыдущий polling ещё выполняется, новый пропускается.

### Idempotency
Обработанные ID команд сохраняются. Повторная доставка той же команды не приведёт к повторному выполнению.

### Обработка ошибок
- При ошибке выполнения команды ACK **не отправляется**
- ZCAD может отправить команду повторно после своего timeout
- Ошибки соединения с ZCAD не ломают работу виджета

### Подавление повторяющихся ошибок
При недоступности ZCAD ошибка логируется только один раз. Последующие неудачные polling не spam'ят консоль.

### HTTP Timeout
Каждый HTTP запрос имеет timeout 5 секунд для защиты от зависаний.

### Корректная остановка
При выгрузке страницы polling цикл останавливается, очередь очищается.

## Статус виджета

Метод `ManagerGRIST.getStatus()` возвращает:

```javascript
{
  polling: {
    isRunning: true,      // Запущен ли polling цикл
    isOnline: false,      // Доступен ли ZCAD
    pollInProgress: false // Выполняется ли текущий polling
  },
  queueSize: 0,           // Размер очереди команд
  isProcessing: false,    // Обрабатывается ли команда
  registeredCommands: [...] // Список зарегистрированных команд
}
```

## Существующий канал Grist → ZCAD

Механизм отправки команд через `POST http://127.0.0.1:5000/ipc` сохранён.

Команда `INSERT_DEV` использует этот endpoint для обратной совместимости.

Другие виджеты могут продолжать отправлять команды в `/ipc` без изменений.

## Требования к ZCAD серверу

ZCAD должен поддерживать:

1. `POST /grist/poll` - возврат команд или пустого массива
2. `POST /grist/ack` - подтверждение выполнения
3. CORS заголовки для работы из iframe Grist

### Формат ответа на /grist/poll

Без команд:
```json
{
  "ok": true,
  "commands": []
}
```

С командами:
```json
{
  "ok": true,
  "commands": [
    {
      "id": 1001,
      "command": "SET_GRIST_VALUE",
      "args": {...}
    }
  ]
}
```

### Формат запроса на /grist/ack

```json
{
  "id": 1001
}
```

## Установка

1. Разместить папку `managerGRIST` в директории виджетов Grist
2. Настроить ZCAD сервер на адресе `http://127.0.0.1:5000`
3. Добавить виджет в документ Grist

## Отладка

Виджет отображает:
- Статус соединения с ZCAD (ONLINE/OFFLINE)
- Статус polling цикла
- Размер очереди команд
- Количество зарегистрированных команд
- Лог событий
