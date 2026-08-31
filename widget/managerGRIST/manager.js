/**
 * managerGRIST - главный модуль виджета
 * Реализует двусторонний обмен с ZCAD через POLL/ACK механизм
 */

const ManagerGRIST = {
  /**
   * Инициализирует виджет
   */
  async init() {
    try {
      console.log('[ManagerGRIST] Начало инициализации...');
      
      // Ожидаем готовности Grist API
      await this._waitForGrist();
      console.log('[ManagerGRIST] Grist API готов');

      // Сообщаем Grist что виджет готов с требуемым уровнем доступа
      grist.ready({
        requiredAccess: 'full',
        columns: []
      });
      console.log('[ManagerGRIST] Grist.ready() вызван');

      // Команды уже зарегистрированы при загрузке скриптов
      // Выводим список доступных команд
      const commands = ZCADCommandRegistry.listCommands();
      console.log(`[ManagerGRIST] Зарегистрировано команд: ${commands.length}`, commands);

      // Запускаем polling цикл
      PollingLoopModule.start();
      
      console.log('[ManagerGRIST] Виджет managerGRIST успешно инициализирован');
      console.log('[ManagerGRIST] Polling запущен, ожидание команд от ZCAD...');
      
    } catch (error) {
      console.error('[ManagerGRIST] Ошибка инициализации:', error);
      throw error;
    }
  },

  /**
   * Ожидает готовности Grist API
   * @returns {Promise<void>}
   * @private
   */
  _waitForGrist() {
    return new Promise((resolve) => {
      const checkGrist = () => {
        if (window.grist) {
          resolve();
        } else {
          setTimeout(checkGrist, 100);
        }
      };
      checkGrist();
    });
  },

  /**
   * Останавливает виджет (при уничтожении/перезагрузке)
   */
  destroy() {
    console.log('[ManagerGRIST] Остановка виджета...');
    
    // Останавливаем polling
    PollingLoopModule.stop();
    
    // Очищаем очередь команд
    CommandQueueModule.clear();
    
    console.log('[ManagerGRIST] Виджет остановлен');
  },

  /**
   * Возвращает статус виджета
   * @returns {object}
   */
  getStatus() {
    return {
      polling: PollingLoopModule.getStatus(),
      queueSize: CommandQueueModule.getQueueSize(),
      isProcessing: CommandQueueModule.isProcessing(),
      registeredCommands: ZCADCommandRegistry.listCommands()
    };
  }
};

// Автоматический запуск при загрузке страницы
window.addEventListener('load', () => {
  ManagerGRIST.init();
});

// Корректная остановка при выгрузке страницы
window.addEventListener('beforeunload', () => {
  ManagerGRIST.destroy();
});
