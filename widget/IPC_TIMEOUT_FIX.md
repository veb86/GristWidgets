# Исправление ошибки таймаута IPC сервера

## ❌ Проблема

```
16:00:27 [IPC] Client connected
16:00:57 [IPC] Client disconnected or error reading
```

Команда `PING` попадает в очередь `IPCCommandQueue`, но **не выполняется** потому что ZCAD не вызывает `IPCProcessPendingCommands` в главном цикле.

## 🔧 Решение 1: Выполнение команд напрямую в потоке сервера

### Шаг 1: Откройте файл `uzvipcserver.pas`

Найдите функцию `ProcessClient` (примерно строка 707).

### Шаг 2: Замените блок обработки команды

**НАЙДИТЕ этот код (строки ~744-770):**

```pascal
try
  {** Выполнение команды в главном потоке через очередь }
  IPCCommandQueue.SetStatus(csBusy);
  try
    {** Добавляем команду в очередь }
    IPCCommandQueue.Enqueue(Cmd);

    {** Ждем завершения выполнения команды в главном потоке }
    Cmd^.Completed.WaitFor(IPC_COMMAND_TIMEOUT);

    {** Получаем результат }
    if Cmd^.Response <> nil then
    begin
      SendResponse(ASocket, Cmd^.Response);
    end
    else
    begin
      {** Таймаут или ошибка }
      CmdResult.Status := 'error';
      CmdResult.Error := 'Command timeout or execution error';
      Response := CreateResponse(Cmd^.ID, CmdResult.Status, CmdResult.Result, CmdResult.Error);
      SendResponse(ASocket, Response);
      Response.Free;
    end;
  finally
    IPCCommandQueue.SetStatus(csIdle);
  end;
```

**ЗАМЕНИТЕ на этот код:**

```pascal
try
  {** Выполняем команду напрямую в потоке сервера }
  IPCCommandQueue.SetStatus(csBusy);
  try
    {** Выполняем команду напрямую }
    CmdResult := ExecuteCommand(Cmd);
    
    {** Формируем ответ }
    Response := CreateResponse(Cmd^.ID, CmdResult.Status, 
      CmdResult.Result, CmdResult.Error);
    Cmd^.Response := Response;
    
  finally
    IPCCommandQueue.SetStatus(csIdle);
  end;

  {** Отправляем ответ }
  if Cmd^.Response <> nil then
  begin
    SendResponse(ASocket, Cmd^.Response);
  end
  else
  begin
    CmdResult.Status := 'error';
    CmdResult.Error := 'Command execution error';
    Response := CreateResponse(Cmd^.ID, CmdResult.Status, 
      CmdResult.Result, CmdResult.Error);
    SendResponse(ASocket, Response);
    Response.Free;
  end;
```

### Шаг 3: Пересоберите ZCAD

1. Откройте проект ZCAD в Lazarus
2. Пересоберите проект (Run → Build)
3. Запустите ZCAD
4. Выполните `IPCStart 127.0.0.1 7777`

### Шаг 4: Проверьте работу

```bash
cd c:\zcad\GristWidgets\server
..\python\python.exe zcad_tcp_client.py
```

## 🔧 Решение 2: Интеграция с главным циклом ZCAD (правильное)

Если вы хотите чтобы команды выполнялись в главном потоке ZCAD (правильный подход):

### Шаг 1: Откройте главный модуль ZCAD

Найдите основной файл проекта ZCAD (обычно `zcad.lpr` или главный модуль).

### Шаг 2: Добавьте вызов обработки IPC

**В главном цикле обработки сообщений:**

```pascal
procedure TZCADApplication.IdleHandler(var Done: Boolean);
begin
  { ... существующий код ... }
  
  {** Обработка IPC команд }
  IPCProcessPendingCommands;
  
  { ... существующий код ... }
end;
```

**ИЛИ в цикле отрисовки:**

```pascal
procedure TDrawWindow.Paint;
begin
  { ... код отрисовки ... }
  
  {** Обработка IPC команд }
  IPCProcessPendingCommands;
end;
```

### Шаг 3: Убедитесь что модуль подключен

В главном модуле ZCAD в секции `uses` должно быть:

```pascal
uses
  { ... другие модули ... }
  uzvipcserver,
  uzvipcintegration;
```

### Шаг 4: Пересоберите ZCAD

## ✅ Проверка исправления

После исправления:

```bash
cd c:\zcad\GristWidgets\server
..\python\python.exe zcad_tcp_client.py
```

Ожидаемый результат:
```
ZCAD TCP Client - тестовый режим
----------------------------------------
Проверка подключения...
Ping: {
  "id": "cmd-0001",
  "status": "ok",
  "result": "pong"
}

ZCAD доступен!
```

## 📝 Примечания

- **Решение 1** (прямое выполнение) - быстрое исправление, работает сразу
- **Решение 2** (интеграция) - правильное архитектурное решение, команды выполняются в главном потоке ZCAD

Для работы с графикой ZCAD **требуется Решение 2**, так как операции с графикой должны выполняться в главном потоке.
