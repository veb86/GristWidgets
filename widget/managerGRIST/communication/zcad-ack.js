/**
 * Модуль для отправки ACK в ZCAD
 * Подтверждает успешное выполнение команды
 */

const ZCADAckModule = {
  /**
   * Отправляет подтверждение выполнения команды в ZCAD
   * @param {number} commandId - ID выполненной команды
   * @returns {Promise<object>} - Ответ сервера
   */
  async send(commandId) {
    console.log(`[ZCADAck] Отправка ACK для команды id: ${commandId}`);
    
    try {
      const response = await HTTPUtils.postJson(ZCAD_CONFIG.ACK_URL, {
        id: commandId
      });
      
      console.log(`[ZCADAck] ACK успешно отправлен для команды id: ${commandId}`, response);
      
      return response;
    } catch (error) {
      console.error(`[ZCADAck] Ошибка отправки ACK для команды id: ${commandId}:`, error);
      throw error;
    }
  }
};
