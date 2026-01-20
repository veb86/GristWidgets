/**
 * Модуль взаимодействия с Grist API
 *
 * Этот модуль инкапсулирует всю логику взаимодействия с Grist.
 * Предоставляет упрощенный интерфейс для загрузки данных, навигации
 * и фильтрации.
 *
 * @module GristAPIModule
 */

var GristAPIModule = (function() {
  'use strict';

  // ========================================
  // ПРИВАТНЫЕ ПЕРЕМЕННЫЕ
  // ========================================

  var isInitialized = false;
  var onRecordsCallback = null;

  // ========================================
  // ИНИЦИАЛИЗАЦИЯ
  // ========================================

  /**
   * Инициализировать подключение к Grist API
   *
   * Должна быть вызвана перед использованием других методов модуля.
   * Регистрирует виджет в Grist и запрашивает необходимые права доступа.
   *
   * @returns {Promise<void>}
   */
  function initialize() {
    return new Promise(function(resolve, reject) {
      try {
        if (typeof grist === 'undefined') {
          reject(new Error('Grist API не загружен'));
          return;
        }

        // Регистрация виджета с необходимыми правами доступа
        // ВАЖНО: Указываем точные имена колонок для корректной работы с Grist
        grist.ready({
          requiredAccess: 'read table',
          columns: [
            { name: 'NMO_BaseName', title: 'ID устройства' },
            { name: 'HeadDeviceName', title: 'Родительское устройство' },
            { name: 'icanbeheadunit', title: 'Флаг иерархии' }
          ]
        });

        isInitialized = true;
        console.log('Grist API инициализирован');
        resolve();

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Проверить, инициализирован ли модуль
   *
   * @returns {boolean} true, если модуль инициализирован
   */
  function checkInitialized() {
    if (!isInitialized) {
      console.warn('Grist API не инициализирован. Вызовите initialize() сначала.');
    }
    return isInitialized;
  }

  // ========================================
  // ЗАГРУЗКА ДАННЫХ
  // ========================================

  /**
   * Загрузить данные из текущей выбранной таблицы
   *
   * Возвращает массив объектов, каждый объект представляет строку таблицы.
   *
   * @returns {Promise<Array>} Массив записей
   */
  async function loadTableData() {
    if (!checkInitialized()) {
      throw new Error('Grist API не инициализирован');
    }

    try {
      var tableData = await grist.docApi.fetchSelectedTable();
      console.log('Данные получены из Grist:', tableData);

      var records = convertGristDataToRecords(tableData);
      console.log('Преобразовано записей:', records.length);

      return records;

    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
      throw new Error('Не удалось загрузить данные: ' + error.message);
    }
  }

  /**
   * Преобразовать данные из формата Grist в массив объектов
   *
   * Grist возвращает данные в колоночном формате, где каждое поле
   * представлено массивом значений. Эта функция преобразует данные
   * в более удобный строчный формат.
   *
   * @param {Object} tableData - Данные таблицы из Grist
   * @returns {Array} Массив объектов-записей
   */
  function convertGristDataToRecords(tableData) {
    var records = [];

    // Получаем количество строк
    var rowCount = tableData.id ? tableData.id.length : 0;

    if (rowCount === 0) {
      return records;
    }

    // Получаем список всех полей (исключаем служебные)
    var fieldNames = Object.keys(tableData).filter(function(key) {
      return key !== 'id' && key !== 'manualSort';
    });

    // Создаем объект для каждой строки
    for (var i = 0; i < rowCount; i++) {
      var record = {
        id: tableData.id[i]
      };

      // Добавляем значения всех полей
      fieldNames.forEach(function(fieldName) {
        if (tableData[fieldName] && tableData[fieldName][i] !== undefined) {
          record[fieldName] = tableData[fieldName][i];
        }
      });

      records.push(record);
    }

    return records;
  }

  // ========================================
  // НАВИГАЦИЯ
  // ========================================

  /**
   * Переместить курсор на указанную запись
   *
   * @param {number} recordId - ID записи в Grist
   * @returns {Promise<void>}
   */
  function navigateToRecord(recordId) {
    if (!checkInitialized()) {
      return Promise.reject(new Error('Grist API не инициализирован'));
    }

    return grist.setCursorPos({ rowId: recordId })
      .catch(function(error) {
        console.warn('Ошибка навигации к записи:', error);
        throw error;
      });
  }

  // ========================================
  // ФИЛЬТРАЦИЯ
  // ========================================

  /**
   * Применить фильтр к связанным виджетам
   *
   * Устанавливает выбранные строки, что влияет на фильтрацию
   * связанных виджетов в Grist.
   *
   * @param {Array<string|number>} recordIds - Массив ID записей
   * @returns {Promise<void>}
   */
  function applyFilter(recordIds) {
    if (!checkInitialized()) {
      return Promise.reject(new Error('Grist API не инициализирован'));
    }

    console.log('Применение фильтра к записям:', recordIds);

    return grist.setSelectedRows(recordIds)
      .catch(function(error) {
        console.warn('Ошибка применения фильтра:', error);
        throw error;
      });
  }

  // ========================================
  // СОБЫТИЯ
  // ========================================

  /**
   * Подписаться на изменение данных в таблице
   *
   * Callback будет вызван при каждом изменении данных в таблице Grist.
   *
   * @param {Function} callback - Функция обратного вызова
   */
  function subscribeToRecordChanges(callback) {
    if (!checkInitialized()) {
      console.warn('Grist API не инициализирован');
      return;
    }

    onRecordsCallback = callback;

    grist.onRecords(function(records) {
      console.log('Получено событие изменения данных');
      if (onRecordsCallback) {
        onRecordsCallback(records);
      }
    });
  }

  /**
   * Отписаться от изменений данных
   */
  function unsubscribeFromRecordChanges() {
    onRecordsCallback = null;
  }

  // ========================================
  // ЭКСПОРТ ПУБЛИЧНОГО API
  // ========================================

  return {
    initialize: initialize,
    loadTableData: loadTableData,
    navigateToRecord: navigateToRecord,
    applyFilter: applyFilter,
    subscribeToRecordChanges: subscribeToRecordChanges,
    unsubscribeFromRecordChanges: unsubscribeFromRecordChanges
  };
})();
