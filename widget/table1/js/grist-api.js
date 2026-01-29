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

  let currentAccessLevel = 'full';  // Устанавливаем сразу в 'full', так как мы запрашиваем его в initializeGrist

  // ========================================
  // ПУБЛИЧНЫЕ МЕТОДЫ
  // ========================================

  /**
   * Инициализировать Grist API
   */
  function initializeGrist() {
    grist.ready({
      requiredAccess: 'full',  // Требуем полный доступ для всех операций
      onEditOptions: (options) => {
        console.log('Options changed:', options);
      },
      onAccessLevel: (level) => {
        currentAccessLevel = level;
        console.log('Access level set to:', level);
      }
    });

    // Также устанавливаем уровень доступа напрямую, так как grist.ready может обновить уровень
    currentAccessLevel = 'full';
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
   * Загрузить метаданные столбцов таблицы
   * @param {string} tableId - ID таблицы
   * @returns {Promise<Object>} Объект с метаданными столбцов
   */
  async function loadTableMetadata(tableId) {
    try {
      // Загрузить метаданные столбцов из внутренней таблицы Grist
      const columnMetadata = await grist.docApi.fetchTable('_grist_Tables_column');

      // Отфильтровать метаданные для конкретной таблицы
      const tableInfo = await grist.docApi.fetchTable('_grist_Tables');
      const tableRecord = tableInfo.id.map((id, index) => ({
        id: id,
        tableId: tableInfo.tableId[index]
      })).find(item => item.tableId === tableId);

      if (!tableRecord) {
        throw new Error(`Table ${tableId} not found in metadata`);
      }

      const tableIdInternal = tableRecord.id;
      const filteredColumns = columnMetadata.id
        .map((id, index) => ({
          id: id,
          parentId: columnMetadata.parentId[index],
          colId: columnMetadata.colId[index],
          label: columnMetadata.label[index],
          type: columnMetadata.type[index],
          isFormula: columnMetadata.isFormula[index],
          formula: columnMetadata.formula[index]
        }))
        .filter(column => column.parentId === tableIdInternal);

      return filteredColumns;
    } catch (error) {
      console.error('Error loading table metadata:', error);
      // Возвращаем пустой массив в случае ошибки
      return [];
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
      console.log('Отправка обновления в Grist:', { tableId, rowId, updateObj });

      // Обновить запись в Grist с помощью applyUserActions
      const result = await grist.docApi.applyUserActions([
        ['UpdateRecord', tableId, rowId, updateObj]
      ], {parseStrings: false});

      console.log('Успешное обновление в Grist:', result);

      return result;
    } catch (error) {
      console.error('Error updating record in Grist:', error);
      console.error('Details:', { tableId, rowId, updateObj });

      // Проверяем, связана ли ошибка с формульными столбцами
      if (error.message && error.message.includes("Can't save value to formula column")) {
        // Извлекаем название проблемного столбца
        const match = error.message.match(/formula column ([^ ]+)/);
        if (match) {
          const problematicColumn = match[1];
          console.log(`Обнаружен формульный столбец при обновлении: ${problematicColumn}. Повторная попытка без этого столбца.`);

          // Удаляем проблемный столбец из данных и пробуем снова
          const filteredUpdateObj = {...updateObj};
          delete filteredUpdateObj[problematicColumn];

          if (Object.keys(filteredUpdateObj).length > 0) {
            const result = await grist.docApi.applyUserActions([
              ['UpdateRecord', tableId, rowId, filteredUpdateObj]
            ], {parseStrings: false});

            console.log('Успешное обновление в Grist (без формульного столбца):', result);
            return result;
          }
        }
      }

      // Попробуем использовать BulkUpdateRecord как альтернативу
      try {
        const result = await grist.docApi.applyUserActions([
          ['BulkUpdateRecord', tableId, [rowId], updateObj]
        ], {parseStrings: false});
        console.log('Успешное обновление в Grist (через BulkUpdateRecord):', result);
        return result;
      } catch (bulkError) {
        console.error('Ошибка обновления через BulkUpdateRecord:', bulkError);

        // Проверяем ошибку BulkUpdateRecord на наличие формульных столбцов
        if (bulkError.message && bulkError.message.includes("Can't save value to formula column")) {
          const match = bulkError.message.match(/formula column ([^ ]+)/);
          if (match) {
            const problematicColumn = match[1];
            console.log(`Обнаружен формульный столбец в BulkUpdateRecord: ${problematicColumn}. Повторная попытка без этого столбца.`);

            const filteredUpdateObj = {...updateObj};
            delete filteredUpdateObj[problematicColumn];

            if (Object.keys(filteredUpdateObj).length > 0) {
              const result = await grist.docApi.applyUserActions([
                ['BulkUpdateRecord', tableId, [rowId], filteredUpdateObj]
              ], {parseStrings: false});

              console.log('Успешное обновление в Grist (BulkUpdateRecord, без формульного столбца):', result);
              return result;
            }
          }
        }

        throw error; // Бросаем первоначальную ошибку
      }
    }
  }

  /**
   * Удалить запись из Grist
   * @param {string} tableId - ID таблицы
   * @param {number} rowId - ID строки для удаления
   * @returns {Promise} Результат удаления
   */
  async function deleteRecord(tableId, rowId) {
    try {
      console.log('Отправка запроса на удаление в Grist:', { tableId, rowId });

      const result = await grist.docApi.applyUserActions([
        ['RemoveRecord', tableId, rowId]  // Используем RemoveRecord вместо DeleteRecord
      ]);

      console.log('Успешное удаление из Grist:', result);

      return result;
    } catch (error) {
      console.error('Error deleting record in Grist:', error);
      console.error('Details:', { tableId, rowId });
      // Попробуем альтернативный подход с BulkRemoveRecord
      try {
        const result = await grist.docApi.applyUserActions([
          ['BulkRemoveRecord', tableId, [rowId]]
        ]);
        console.log('Успешное удаление из Grist (через BulkRemoveRecord):', result);
        return result;
      } catch (bulkError) {
        console.error('Ошибка удаления через BulkRemoveRecord:', bulkError);
        throw error; // Бросаем первоначальную ошибку
      }
    }
  }

  /**
   * Добавить запись в Grist
   * @param {string} tableId - ID таблицы
   * @param {Object} recordData - Данные новой записи (формат: {colName: [value]})
   * @returns {Promise} Результат добавления
   */
  async function addRecord(tableId, recordData) {
    try {
      console.log('Отправка запроса на добавление в Grist:', { tableId, recordData });

      // Подсчитываем количество записей для определения количества элементов в каждом массиве
      const firstKey = Object.keys(recordData)[0];
      const numRecords = recordData[firstKey] ? recordData[firstKey].length : 0;
      const rowIds = Array(numRecords).fill(null); // Для новых записей используем null

      const result = await grist.docApi.applyUserActions([
        ['BulkAddRecord', tableId, rowIds, recordData]  // Используем BulkAddRecord
      ], {parseStrings: false});

      console.log('Успешное добавление в Grist:', result);

      // Возвращаем результат
      return result;
    } catch (error) {
      console.error('Error adding record in Grist:', error);
      console.error('Details:', { tableId, recordData });

      // Проверяем, связана ли ошибка с формульными столбцами
      if (error.message && error.message.includes("Can't save value to formula column")) {
        // Извлекаем название проблемного столбца
        const match = error.message.match(/formula column ([^ ]+)/);
        if (match) {
          const problematicColumn = match[1];
          console.log(`Обнаружен формульный столбец: ${problematicColumn}. Повторная попытка без этого столбца.`);

          // Удаляем проблемный столбец из данных и пробуем снова
          const filteredRecordData = {...recordData};
          delete filteredRecordData[problematicColumn];

          if (Object.keys(filteredRecordData).length > 0) {
            // Подсчитываем количество записей для определения количества элементов в каждом массиве
            const firstKey = Object.keys(filteredRecordData)[0];
            const numRecords = filteredRecordData[firstKey] ? filteredRecordData[firstKey].length : 0;
            const rowIds = Array(numRecords).fill(null);

            const result = await grist.docApi.applyUserActions([
              ['BulkAddRecord', tableId, rowIds, filteredRecordData]
            ], {parseStrings: false});

            console.log('Успешное добавление в Grist (без формульного столбца):', result);
            return result;
          }
        }
      }

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
    loadTableMetadata: loadTableMetadata,
    updateRecord: updateRecord,
    deleteRecord: deleteRecord,
    addRecord: addRecord
  };
})();