/**
 * HTTP утилиты для выполнения запросов
 * Общий модуль для всех HTTP-операций
 */

const HTTPUtils = {
  /**
   * Выполняет POST запрос с JSON телом
   * @param {string} url - URL endpoint
   * @param {object} data - Данные для отправки
   * @param {number} timeout - Timeout в миллисекундах
   * @returns {Promise<object>} - Ответ сервера
   */
  async postJson(url, data = {}, timeout = HTTP_TIMEOUT) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error(`HTTP timeout after ${timeout}ms`);
      }
      
      throw error;
    }
  },

  /**
   * Выполняет GET запрос
   * @param {string} url - URL endpoint
   * @param {number} timeout - Timeout в миллисекундах
   * @returns {Promise<object>} - Ответ сервера
   */
  async getJson(url, timeout = HTTP_TIMEOUT) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error(`HTTP timeout after ${timeout}ms`);
      }
      
      throw error;
    }
  }
};
