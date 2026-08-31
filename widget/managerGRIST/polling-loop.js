/**
 * Модуль polling цикла
 * Управляет периодическим опросом ZCAD с защитой от параллельных запросов
 */

const PollingLoopModule = {
  /**
   * ID интервала polling
   * @type {number|null}
   */
  _pollIntervalId: null,
  
  /**
   * Флаг выполнения polling запроса в данный момент
   * @type {boolean}
   */
  _pollInProgress: false,
  
  /**
   * Флаг состояния соединения с ZCAD
   * @type {boolean}
   */
  _zcadOnline: false,
  
  /**
   * Флаг подавления повторяющихся ошибок
   * @type {boolean}
   */
  _errorSuppressed: false,

  /**
   * Запускает polling цикл
   */
  start() {
    if (this._pollIntervalId !== null) {
      console.warn('[PollingLoop] Polling уже запущен');
      return;
    }
    
    console.log(`[PollingLoop] Запуск polling с интервалом ${POLL_INTERVAL}мс`);
    
    // Немедленно выполняем первый polling
    this._poll();
    
    // Затем запускаем интервал
    this._pollIntervalId = setInterval(() => {
      this._poll();
    }, POLL_INTERVAL);
  },

  /**
   * Останавливает polling цикл
   */
  stop() {
    if (this._pollIntervalId !== null) {
      clearInterval(this._pollIntervalId);
      this._pollIntervalId = null;
      console.log('[PollingLoop] Polling остановлен');
    }
  },

  /**
   * Выполняет один цикл polling
   * @private
   */
  async _poll() {
    // Защита от параллельных polling запросов
    if (this._pollInProgress) {
      console.log('[PollingLoop] Предыдущий polling ещё выполняется, пропускаем');
      return;
    }
    
    this._pollInProgress = true;
    
    try {
      const commands = await ZCADPollModule.poll();
      
      // Если получили команды - передаём их в очередь
      if (commands && commands.length > 0) {
        CommandQueueModule.enqueue(commands);
      }
      
      // Успешный polling означает что ZCAD онлайн
      if (!this._zcadOnline) {
        this._zcadOnline = true;
        console.log('[PollingLoop] ✅ ZCAD ONLINE');
        this._errorSuppressed = false;
      }
      
    } catch (error) {
      // ZCAD недоступен
      if (this._zcadOnline) {
        this._zcadOnline = false;
        console.log('[PollingLoop] ❌ ZCAD OFFLINE');
        this._errorSuppressed = false;
      } else if (!this._errorSuppressed) {
        // Подавляем повторяющиеся ошибки
        this._errorSuppressed = true;
      }
    } finally {
      this._pollInProgress = false;
    }
  },

  /**
   * Проверяет статус polling
   * @returns {{isRunning: boolean, isOnline: boolean, pollInProgress: boolean}}
   */
  getStatus() {
    return {
      isRunning: this._pollIntervalId !== null,
      isOnline: this._zcadOnline,
      pollInProgress: this._pollInProgress
    };
  },

  /**
   * Сбрасывает состояние модуля
   */
  reset() {
    this.stop();
    this._pollInProgress = false;
    this._zcadOnline = false;
    this._errorSuppressed = false;
  }
};
