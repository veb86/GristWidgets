/**
 * Модуль для работы с данными
 *
 * Этот модуль отвечает за загрузку и обработку данных из Grist.
 *
 * @module DataModule
 */

var DataModule = (function() {
  'use strict';

  // ========================================
  // ПРИВАТНЫЕ ПЕРЕМЕННЫЕ
  // ========================================

  let currentTableId = '';
  let currentData = [];

  // ========================================
  // ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
  // ========================================

  /**
   * Преобразовать данные из Grist в структуру для схемы
   * @param {Array} rawData - Сырые данные из Grist
   * @returns {Object} Объект с группированными данными
   */
  function transformData(rawData) {
    if (!rawData || !Array.isArray(rawData.id)) {
      return {};
    }

    // Создаем массив объектов из данных
    const records = [];
    for (let i = 0; i < rawData.id.length; i++) {
      const record = { id: rawData.id[i] };
      
      // Добавляем все поля из данных
      Object.keys(rawData).forEach(key => {
        if (key !== 'id') {
          record[key] = rawData[key][i];
        }
      });
      
      records.push(record);
    }

    // Группируем по feeder_name
    const groupedData = {};
    records.forEach(record => {
      const feederName = record.feeder_name || 'default';
      if (!groupedData[feederName]) {
        groupedData[feederName] = [];
      }
      groupedData[feederName].push(record);
    });

    // Сортируем каждую группу по feeder_row и feeder_col
    Object.keys(groupedData).forEach(feederName => {
      groupedData[feederName].sort((a, b) => {
        // Сначала по feeder_row, потом по feeder_col
        if (a.feeder_row !== b.feeder_row) {
          return (a.feeder_row || 0) - (b.feeder_row || 0);
        }
        return (a.feeder_col || 0) - (b.feeder_col || 0);
      });
    });

    return groupedData;
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
   * Установить текущие данные
   * @param {Array} data - Массив данных
   */
  function setCurrentData(data) {
    currentData = data;
  }

  /**
   * Получить текущие данные
   * @returns {Array} Массив текущих данных
   */
  function getCurrentData() {
    return currentData;
  }

  /**
   * Загрузить данные из Grist
   * @param {string} tableName - Название таблицы для загрузки
   * @returns {Promise<Object>} Объект с преобразованными данными
   */
  async function loadData(tableName) {
    try {
      console.log('Загрузка данных из таблицы:', tableName);

      // Загружаем данные из Grist по имени таблицы (Grist API поддерживает имена таблиц)
      const tableData = await grist.docApi.fetchTable(tableName);

      // Сохраняем текущую таблицу и данные
      setCurrentTableId(tableName);
      setCurrentData(tableData);

      // Преобразуем данные для схемы
      const transformedData = transformData(tableData);

      console.log('Данные успешно загружены и преобразованы:', transformedData);

      return transformedData;
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
      throw error;
    }
  }

  // ========================================
  // ЭКСПОРТ ПУБЛИЧНОГО API
  // ========================================

  return {
    setCurrentTableId: setCurrentTableId,
    getCurrentTableId: getCurrentTableId,
    setCurrentData: setCurrentData,
    getCurrentData: getCurrentData,
    loadData: loadData,
    transformData: transformData
  };
})();