/**
 * Модуль для работы с Grist API
 *
 * Этот модуль отвечает за взаимодействие с Grist API,
 * включая загрузку таблиц, данных и обновление записей.
 *
 * @module GristApiModule
 */

var GristApiModule = (function() {
  'use strict';

  // ========================================
  // ПРИВАТНЫЕ ПЕРЕМЕННЫЕ
  // ========================================

  // ========================================
  // ПУБЛИЧНЫЕ МЕТОДЫ
  // ========================================

  /**
   * Инициализировать Grist API
   */
  function initializeGrist() {
    grist.ready({
      requiredAccess: 'full',
      onEditOptions: (options) => {
        console.log('Options changed:', options);
      }
    });
  }

  /**
   * Загрузить список таблиц
   * @returns {Promise<Object>} Объект с данными таблиц
   */
  async function loadTables() {
    try {
      // Получить список таблиц из Grist
      const tables = await grist.docApi.fetchTable('_grist_Tables');

      return tables;
    } catch (error) {
      console.error('Error loading tables:', error);
      throw error;
    }
  }

  /**
   * Загрузить данные таблицы
   * @param {string} tableId - ID таблицы
   * @returns {Promise<Object>} Объект с данными таблицы
   */
  async function loadTableData(tableId) {
    try {
      // Загрузить данные выбранной таблицы
      const tableData = await grist.docApi.fetchTable(tableId);

      return tableData;
    } catch (error) {
      console.error('Error loading table data:', error);
      throw error;
    }
  }

  /**
   * Обновить запись в Grist
   * @param {string} tableId - ID таблицы
   * @param {number} rowId - ID строки
   * @param {Object} updateObj - Объект с обновляемыми полями
   * @returns {Promise} Результат обновления
   */
  async function updateRecord(tableId, rowId, updateObj) {
    try {
      // Обновить запись в Grist
      const result = await grist.docApi.applyUserActions([
        ['UpdateRecord', tableId, rowId, updateObj]
      ]);

      return result;
    } catch (error) {
      console.error('Error updating record:', error);
      throw error;
    }
  }

  // ========================================
  // ЭКСПОРТ ПУБЛИЧНОГО API
  // ========================================

  return {
    initializeGrist: initializeGrist,
    loadTables: loadTables,
    loadTableData: loadTableData,
    updateRecord: updateRecord
  };
})();