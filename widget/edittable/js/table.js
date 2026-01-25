/**
 * Модуль для работы с таблицей и данными
 *
 * Этот модуль отвечает за обработку данных таблицы,
 * преобразование формата и управление записями.
 *
 * @module TableModule
 */

var TableModule = (function() {
  'use strict';

  // ========================================
  // ПРИВАТНЫЕ ПЕРЕМЕННЫЕ
  // ========================================

  let currentTableId = null;
  let currentRecords = [];
  let currentColumns = [];
  let currentColumnMetadata = [];  // Метаданные столбцов, включая информацию о формулах

  // ========================================
  // ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
  // ========================================

  /**
   * Экранировать HTML символы
   * @param {string} text - Текст для экранирования
   * @returns {string} Экранированный текст
   */
  function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }

  // ========================================
  // ПУБЛИЧНЫЕ МЕТОДЫ
  // ========================================

  /**
   * Установить текущую таблицу
   * @param {string} tableId - ID таблицы
   */
  function setCurrentTableId(tableId) {
    currentTableId = tableId;
  }

  /**
   * Получить текущую таблицу
   * @returns {string} ID текущей таблицы
   */
  function getCurrentTableId() {
    return currentTableId;
  }

  /**
   * Установить текущие записи
   * @param {Array} records - Массив записей
   */
  function setCurrentRecords(records) {
    currentRecords = records;
  }

  /**
   * Получить текущие записи
   * @returns {Array} Массив текущих записей
   */
  function getCurrentRecords() {
    return currentRecords;
  }

  /**
   * Установить текущие колонки
   * @param {Array} columns - Массив колонок
   */
  function setCurrentColumns(columns) {
    currentColumns = columns;
  }

  /**
   * Получить текущие колонки
   * @returns {Array} Массив текущих колонок
   */
  function getCurrentColumns() {
    return currentColumns;
  }

  /**
   * Преобразовать данные таблицы в формат для отображения
   * @param {Object} tableData - Данные таблицы из Grist
   * @returns {Object} Объект с records и columns
   */
  function transformTableData(tableData) {
    if (!tableData || !tableData.id || !Array.isArray(tableData.id)) {
      return { records: [], columns: [] };
    }

    // Извлечь названия колонок из данных таблицы
    const columns = Object.keys(tableData).filter(key => key !== 'id');

    // Преобразовать данные таблицы в массив объектов
    const records = [];
    for (let i = 0; i < tableData.id.length; i++) {
      const record = { id: tableData.id[i] };
      columns.forEach(col => {
        record[col] = tableData[col][i];
      });
      records.push(record);
    }

    return { records, columns };
  }

  /**
   * Установить метаданные столбцов
   * @param {Array} metadata - Массив метаданных столбцов
   */
  function setCurrentColumnMetadata(metadata) {
    currentColumnMetadata = metadata;
  }

  /**
   * Получить метаданные столбцов
   * @returns {Array} Массив метаданных столбцов
   */
  function getCurrentColumnMetadata() {
    return currentColumnMetadata;
  }

  /**
   * Проверить, является ли столбец формульным
   * @param {string} columnName - Название столбца
   * @returns {boolean} true, если столбец формульный
   */
  function isColumnFormula(columnName) {
    const columnMeta = currentColumnMetadata.find(meta => meta.colId === columnName);
    return columnMeta ? Boolean(columnMeta.isFormula) : false;
  }

  /**
   * Обновить локальную запись
   * @param {number} rowId - ID строки
   * @param {string} fieldName - Название поля
   * @param {*} newValue - Новое значение
   */
  function updateLocalRecord(rowId, fieldName, newValue) {
    // Найти и обновить запись в локальном массиве
    const recordIndex = currentRecords.findIndex(r => r.id === rowId);
    if (recordIndex !== -1) {
      currentRecords[recordIndex][fieldName] = newValue;
    }
  }

  // ========================================
  // ЭКСПОРТ ПУБЛИЧНОГО API
  // ========================================

  return {
    setCurrentTableId: setCurrentTableId,
    getCurrentTableId: getCurrentTableId,
    setCurrentRecords: setCurrentRecords,
    getCurrentRecords: getCurrentRecords,
    setCurrentColumns: setCurrentColumns,
    getCurrentColumns: getCurrentColumns,
    setCurrentColumnMetadata: setCurrentColumnMetadata,
    getCurrentColumnMetadata: getCurrentColumnMetadata,
    isColumnFormula: isColumnFormula,
    transformTableData: transformTableData,
    updateLocalRecord: updateLocalRecord,
    escapeHtml: escapeHtml
  };
})();