/**
 * Модуль для polling команд от ZCAD
 * Периодически опрашивает сервер на наличие новых команд
 */

const ZCADPollModule = {
  /**
   * Выполняет запрос к ZCAD для получения команд
   * @returns {Promise<Array>} - Массив команд или пустой массив
   */
  async poll() {
    console.log('[ZCADPoll] Запрос команд от ZCAD...');
    
    try {
      const response = await HTTPUtils.postJson(ZCAD_CONFIG.POLL_URL, {});
      
      if (response && response.ok) {
        const commands = response.commands || [];
        console.log(`[ZCADPoll] Получено команд: ${commands.length}`);
        return commands;
      } else {
        console.warn('[ZCADPoll] Неожиданный ответ от ZCAD:', response);
        return [];
      }
    } catch (error) {
      // Ошибка соединения не должна ломать polling
      console.error('[ZCADPoll] Ошибка polling:', error.message);
      throw error;
    }
  }
};
