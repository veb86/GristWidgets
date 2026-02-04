/**
 * Модуль для работы с данными
 *
 * Отвечает за загрузку данных из Grist, фильтрацию по имени щита
 * и преобразование данных в формат для отображения.
 *
 * @module DataModule
 */

var DataModule = (function() {
  'use strict';

  // ========================================
  // ПРИВАТНЫЕ ПЕРЕМЕННЫЕ
  // ========================================

  /**
   * Кэш для хранения загруженных данных
   */
  let dataCache = {
    shieldName: null,
    filteredData: []
  };

  // ========================================
  // ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
  // ========================================

  /**
   * Получить список всех доступных таблиц в документе
   * @returns {Promise<Array<string>>} Массив имён таблиц
   */
  async function getAvailableTables() {
    try {
      const tables = await grist.docApi.listTables();
      return tables || [];
    } catch (error) {
      console.error('Ошибка при получении списка таблиц:', error);
      return [];
    }
  }

  /**
   * Получить данные из указанной таблицы
   * @param {string} tableName - Имя таблицы
   * @returns {Promise<Object>} Данные таблицы
   */
  async function fetchTableData(tableName) {
    try {
      const tableId = await getTableIdByName(tableName);
      if (!tableId) {
        // Выводим список всех доступных таблиц для диагностики
        const tables = await grist.docApi.listTables();
        console.log('Все доступные таблицы в документе:', tables);
        const tableNames = tables.map(t => t.id || t.tableId || t.name || 'unknown').filter(name => name !== 'unknown');
        console.log('Имена таблиц:', tableNames);

        throw new Error(`Таблица "${tableName}" не найдена`);
      }

      const records = await grist.docApi.fetchTable(tableId);
      return records;
    } catch (error) {
      console.error(`Ошибка загрузки таблицы "${tableName}":`, error);
      throw error;
    }
  }

  /**
   * Получить ID таблицы по её имени
   * @param {string} tableName - Имя таблицы
   * @returns {Promise<string|null>} ID таблицы или null
   */
  async function getTableIdByName(tableName) {
    try {
      // В Grist часто имя таблицы можно использовать напрямую как ID
      // Попробуем получить список таблиц для проверки
      try {
        const tables = await grist.docApi.listTables();
        console.log('Таблицы из listTables():', tables); // Для отладки

        // Ищем таблицу по имени, проверяя различные возможные свойства
        const table = tables.find(t => {
          // Проверяем различные возможные поля, в которых может быть имя таблицы
          return (t && (
            t.id === tableName ||
            t.tableId === tableName ||
            (t.fields && t.fields.id === tableName) ||
            (t.primaryViewId && t.primaryViewId === tableName) ||
            (t._id === tableName) ||  // Иногда используется с подчеркиванием
            (t.name === tableName)    // Иногда имя может быть в поле name
          ));
        });

        console.log('Найденная таблица для "' + tableName + '":', table); // Для отладки

        if (table) {
          // Возвращаем первый доступный идентификатор
          return table.id || table.tableId || table._id || (table.fields && table.fields.id);
        }
      } catch (listError) {
        console.warn('Ошибка при получении списка таблиц:', listError);
        // Если listTables не работает, просто возвращаем имя таблицы как ID
        return tableName;
      }

      // Если таблица не найдена в списке, возвращаем имя как ID
      // В Grist часто внешнее имя таблицы можно использовать как внутренний ID
      return tableName;
    } catch (error) {
      console.error('Ошибка при поиске таблицы:', error);
      return null;
    }
  }

  /**
   * Преобразовать данные из формата Grist в массив объектов
   * @param {Object} rawData - Сырые данные из Grist
   * @returns {Array<Object>} Массив объектов записей
   */
  function transformGristData(rawData) {
    if (!rawData || !Array.isArray(rawData.id)) {
      return [];
    }

    const records = [];
    const columnNames = Object.keys(rawData);

    for (let i = 0; i < rawData.id.length; i++) {
      const record = {};

      columnNames.forEach(columnName => {
        record[columnName] = rawData[columnName][i];
      });

      records.push(record);
    }

    return records;
  }

  /**
   * Проверить, соответствует ли путь имени щита
   * Последняя часть пути после разделителя должна совпадать с именем щита
   *
   * @param {string} path - Путь для проверки (например, "ГРЩ\\ЩР")
   * @param {string} shieldName - Имя щита (например, "ЩР")
   * @param {string} separator - Разделитель пути (по умолчанию "\\")
   * @returns {boolean} true, если путь соответствует
   */
  function matchesShieldPath(path, shieldName, separator) {
    if (!path || !shieldName) {
      return false;
    }

    // Разбиваем путь по разделителю
    const pathParts = path.split(separator);

    // Получаем последнюю часть пути
    const lastPart = pathParts[pathParts.length - 1];

    // Сравниваем последнюю часть с именем щита
    return lastPart === shieldName;
  }

  // ========================================
  // ПУБЛИЧНЫЕ МЕТОДЫ
  // ========================================

  /**
   * Получить имя щита из таблицы SYSTYM
   * @returns {Promise<string|null>} Имя щита или null
   */
  async function getShieldName() {
    try {
      const config = ConfigModule.getConfig();
      const systemTableName = config.systemTable;
      const fnameColumn = config.systemFnameColumn;
      const fvalueColumn = config.systemFvalueColumn;
      const shieldParamName = config.shieldParamName;

      console.log(`Загрузка имени щита из таблицы "${systemTableName}"...`);

      const rawData = await fetchTableData(systemTableName);

      const records = transformGristData(rawData);

      console.log(`Загружено ${records.length} записей из таблицы ${systemTableName}`);

      // Ищем запись с fname = ShieldName
      const shieldRecord = records.find(record =>
        record[fnameColumn] === shieldParamName
      );

      if (!shieldRecord) {
        console.warn(`Параметр "${shieldParamName}" не найден в таблице ${systemTableName}`);
        return null;
      }

      const shieldName = shieldRecord[fvalueColumn];
      console.log(`Найдено имя щита: "${shieldName}"`);

      // Сохраняем в кэш
      dataCache.shieldName = shieldName;

      return shieldName;
    } catch (error) {
      console.error('Ошибка получения имени щита:', error);
      throw error; // Прерываем выполнение кода при ошибке
    }
  }

  /**
   * Загрузить и отфильтровать данные из таблицы AllDevGroup
   * @returns {Promise<Array<Object>>} Массив отфильтрованных записей
   */
  async function loadFilteredData() {
    try {
      const config = ConfigModule.getConfig();
      const dataTableName = config.dataTable;
      const pathColumn = config.pathColumn;
      const separator = config.pathSeparator;

      console.log(`Загрузка данных из таблицы "${dataTableName}"...`);

      // Получаем имя щита
      const shieldName = await getShieldName();

      if (!shieldName) {
        console.warn('Имя щита не определено, загружаем все данные');
      }

      // Загружаем данные из таблицы AllDevGroup
      const rawData = await fetchTableData(dataTableName);

      const allRecords = transformGristData(rawData);

      console.log(`Загружено ${allRecords.length} записей из таблицы ${dataTableName}`);

      // Если имени щита нет, возвращаем все записи
      if (!shieldName) {
        dataCache.filteredData = allRecords;
        return allRecords;
      }

      // Фильтруем записи по правилу: последняя часть пути = имя щита
      const filteredRecords = allRecords.filter(record => {
        const path = record[pathColumn];
        if (!path) return false; // Пропускаем записи без пути
        return matchesShieldPath(path, shieldName, separator);
      });

      console.log(`Отфильтровано ${filteredRecords.length} записей для щита "${shieldName}"`);

      // Сохраняем в кэш
      dataCache.filteredData = filteredRecords;

      return filteredRecords;
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
      throw error; // Прерываем выполнение кода при ошибке
    }
  }

  /**
   * Получить закэшированное имя щита
   * @returns {string|null} Имя щита или null
   */
  function getCachedShieldName() {
    return dataCache.shieldName;
  }

  /**
   * Получить закэшированные отфильтрованные данные
   * @returns {Array<Object>} Массив записей
   */
  function getCachedFilteredData() {
    return dataCache.filteredData;
  }

  /**
   * Очистить кэш данных
   */
  function clearCache() {
    dataCache = {
      shieldName: null,
      filteredData: []
    };
    console.log('Кэш данных очищен');
  }

  // ========================================
  // ЭКСПОРТ ПУБЛИЧНОГО API
  // ========================================

  return {
    getAvailableTables: getAvailableTables,
    getShieldName: getShieldName,
    loadFilteredData: loadFilteredData,
    getCachedShieldName: getCachedShieldName,
    getCachedFilteredData: getCachedFilteredData,
    clearCache: clearCache
  };
})();
