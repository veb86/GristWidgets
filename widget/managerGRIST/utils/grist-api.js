/**
 * Утилиты для работы с Grist API
 * Общие функции для всех команд
 */

const GristAPIUtils = {
  /**
   * Применяет пользовательские действия к таблице Grist
   * @param {Array<Array>} actions - Массив действий в формате Grist
   * @returns {Promise<void>}
   */
  async applyUserActions(actions) {
    if (!actions || actions.length === 0) {
      return;
    }

    await grist.docApi.applyUserActions(actions);
  },

  /**
   * Обновляет значение поля в записи
   * @param {string} table - Имя таблицы
   * @param {number} recordId - ID записи
   * @param {string} field - Имя поля
   * @param {*} value - Новое значение
   * @returns {Promise<void>}
   */
  async updateRecord(table, recordId, field, value) {
    const action = ['UpdateRecord', table, recordId, {[field]: value}];
    await this.applyUserActions([action]);
  },

  /**
   * Добавляет новую запись в таблицу
   * @param {string} table - Имя таблицы
   * @param {object} data - Данные записи
   * @returns {Promise<number>} - ID новой записи
   */
  async addRecord(table, data) {
    const action = ['AddRecord', table, null, data];
    await this.applyUserActions([action]);
    // Возвращаем ID последней добавленной записи (если доступен)
    return null;
  },

  /**
   * Удаляет запись из таблицы
   * @param {string} table - Имя таблицы
   * @param {number} recordId - ID записи
   * @returns {Promise<void>}
   */
  async deleteRecord(table, recordId) {
    const action = ['RemoveRecord', table, recordId];
    await this.applyUserActions([action]);
  },

  /**
   * Получает данные из таблицы
   * @param {string} table - Имя таблицы
   * @returns {Promise<object>} - Данные таблицы
   */
  async fetchTable(table) {
    return await grist.docApi.fetchTable(table);
  },

  /**
   * Обновляет несколько полей в записи
   * @param {string} table - Имя таблицы
   * @param {number} recordId - ID записи
   * @param {object} fields - Объект с полями и значениями
   * @returns {Promise<void>}
   */
  async updateRecordFields(table, recordId, fields) {
    const action = ['UpdateRecord', table, recordId, fields];
    await this.applyUserActions([action]);
  }
};
