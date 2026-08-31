/**
 * Утилиты валидации
 * Общие функции для проверки данных
 */

const ValidationUtils = {
  /**
   * Проверяет что значение не пустое
   * @param {*} value - Значение для проверки
   * @returns {boolean}
   */
  isNotEmpty(value) {
    return value !== null && value !== undefined && value !== '';
  },

  /**
   * Проверяет что значение является числом
   * @param {*} value - Значение для проверки
   * @returns {boolean}
   */
  isNumber(value) {
    return typeof value === 'number' && !isNaN(value);
  },

  /**
   * Проверяет что значение является строкой
   * @param {*} value - Значение для проверки
   * @returns {boolean}
   */
  isString(value) {
    return typeof value === 'string';
  },

  /**
   * Проверяет что значение является положительным числом
   * @param {*} value - Значение для проверки
   * @returns {boolean}
   */
  isPositiveNumber(value) {
    return this.isNumber(value) && value > 0;
  },

  /**
   * Проверяет наличие обязательных полей в объекте
   * @param {object} obj - Объект для проверки
   * @param {Array<string>} requiredFields - Массив обязательных полей
   * @returns {{isValid: boolean, missingFields: Array<string>}}
   */
  hasRequiredFields(obj, requiredFields) {
    const missingFields = [];
    
    for (const field of requiredFields) {
      if (!obj || !this.isNotEmpty(obj[field])) {
        missingFields.push(field);
      }
    }
    
    return {
      isValid: missingFields.length === 0,
      missingFields
    };
  }
};
