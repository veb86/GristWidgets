/**
 * Модуль управления очередью команд и их выполнением
 * Обрабатывает команды последовательно с поддержкой idempotency
 */

const CommandQueueModule = {
  /**
   * Очередь команд на выполнение
   * @type {Array<object>}
   */
  _queue: [],
  
  /**
   * Флаг выполнения команды в данный момент
   * @type {boolean}
   */
  _isProcessing: false,
  
  /**
   * Set обработанных ID команд для защиты от повторного выполнения
   * @type {Set<number>}
   */
  _processedIds: new Set(),
  
  /**
   * Максимальный размер хранилища обработанных ID
   * @type {number}
   */
  _maxProcessedIdsSize: 1000,

  /**
   * Добавляет команды в очередь
   * @param {Array<object>} commands - Массив команд от ZCAD
   */
  enqueue(commands) {
    if (!commands || commands.length === 0) {
      return;
    }
    
    // Фильтруем уже обработанные команды для idempotency
    const newCommands = commands.filter(cmd => {
      if (this._processedIds.has(cmd.id)) {
        console.log(`[CommandQueue] Команда id:${cmd.id} уже обработана, пропускаем`);
        return false;
      }
      return true;
    });
    
    this._queue.push(...newCommands);
    console.log(`[CommandQueue] Добавлено ${newCommands.length} команд в очередь. Всего в очереди: ${this._queue.length}`);
    
    // Запускаем обработку если она не активна
    this._processQueue();
  },

  /**
   * Обрабатывает очередь команд последовательно
   * @private
   */
  async _processQueue() {
    // Защита от параллельного запуска обработки
    if (this._isProcessing) {
      return;
    }
    
    this._isProcessing = true;
    
    while (this._queue.length > 0) {
      const command = this._queue.shift();
      
      try {
        // Выполняем команду через Registry
        await ZCADCommandRegistry.execute(command);
        
        // После успешного выполнения отправляем ACK
        await ZCADAckModule.send(command.id);
        
        // Добавляем ID в список обработанных для idempotency
        this._markAsProcessed(command.id);
        
      } catch (error) {
        // При ошибке выполнения ACK не отправляется
        // Команда считается невыполненной и может быть получена повторно от ZCAD
        console.error(`[CommandQueue] Ошибка выполнения команды id:${command.id}. ACK не отправлен.`, error);
        
        // Не добавляем в processedIds чтобы ZCAD мог отправить команду повторно
      }
    }
    
    this._isProcessing = false;
  },

  /**
   * Отмечает команду как обработанную
   * @param {number} commandId - ID команды
   * @private
   */
  _markAsProcessed(commandId) {
    // Очищаем старые записи если достигнут лимит
    if (this._processedIds.size >= this._maxProcessedIdsSize) {
      const iterator = this._processedIds.values();
      const toDelete = [];
      for (let i = 0; i < this._maxProcessedIdsSize / 2; i++) {
        const result = iterator.next();
        if (!result.done) {
          toDelete.push(result.value);
        }
      }
      toDelete.forEach(id => this._processedIds.delete(id));
    }
    
    this._processedIds.add(commandId);
  },

  /**
   * Возвращает текущий размер очереди
   * @returns {number}
   */
  getQueueSize() {
    return this._queue.length;
  },

  /**
   * Проверяет идет ли обработка
   * @returns {boolean}
   */
  isProcessing() {
    return this._isProcessing;
  },

  /**
   * Очищает очередь (используется при перезагрузке виджета)
   */
  clear() {
    this._queue = [];
    this._isProcessing = false;
  }
};
