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
  var availableTables = []; // Список доступных таблиц

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

        // Получаем список доступных таблиц
        loadAvailableTables();

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

  /**
   * Загрузить список доступных таблиц
   *
   * Получает список всех таблиц в документе Grist.
   */
  function loadAvailableTables() {
    if (!checkInitialized()) {
      console.warn('Grist API не инициализирован');
      return Promise.resolve([]); // Возвращаем промис для согласованности
    }

    return new Promise(function(resolve, reject) {
      try {
        console.log('Попытка получить список таблиц...');

        // В текущей версии Grist API прямого способа получить список всех таблиц
        // из документа может не быть. Попробуем получить метаданные текущей сессии
        // или использовать информацию из готовых данных

        // Метод 1: Попробуем получить имя текущей таблицы (если доступно)
        // В текущих версиях Grist API может не быть прямого способа получить имя текущей таблицы
        // Поэтому этот блок закомментирован, но оставлен для будущих версий API
        /*
        if (typeof grist.getTableId === 'function') {
          const currentTable = grist.getTableId();
          console.log('Текущая таблица (getTableId):', currentTable);

          if (currentTable) {
            availableTables = [currentTable];
            updateTargetTableDropdown();
            resolve(availableTables);
            return;
          }
        }
        */

        // Метод 2: Попробуем получить информацию через grist.docApi
        // В некоторых версиях Grist доступен метод получения информации о документе
        if (grist.docApi && typeof grist.docApi.fetchTableSchema === 'function') {
          // fetchTableSchema возвращает схему текущей таблицы, но не список всех таблиц
          console.log('fetchTableSchema доступен, но не предоставляет список всех таблиц');
        }

        // В текущей реализации Grist Plugin API возможности получить список всех таблиц
        // в документе напрямую может не быть. Вместо этого, мы можем:
        // 1. Использовать текущую таблицу
        // 2. Предложить пользователю ввести имя таблицы вручную

        // Для совместимости с текущими возможностями API, используем текущую таблицу
        // Так как прямого способа получить имя текущей таблицы может не быть,
        // используем заглушку 'Текущая таблица'
        const currentTableName = 'Текущая таблица';
        availableTables = [currentTableName];

        console.log('Доступные таблицы (ограничено текущей):', availableTables);
        updateTargetTableDropdown();
        resolve(availableTables);

      } catch (error) {
        console.error('Ошибка при попытке получить список таблиц:', error);
        availableTables = [];
        updateTargetTableDropdown();
        resolve(availableTables);
      }
    });
  }

  /**
   * Получить имя текущей выбранной таблицы
   *
   * @returns {string} Имя текущей таблицы
   */
  function getSelectedTableName() {
    // В текущих версиях Grist API может не быть прямого способа получить имя текущей таблицы
    // Возвращаем пустую строку, так как прямой метод недоступен
    return '';
  }

  /**
   * Обновить выпадающий список целевой таблицы
   *
   * Заполняет выпадающий список доступными таблицами.
   */
  function updateTargetTableDropdown() {
    var $dropdown = $('#target-table');

    // Очищаем текущие опции, кроме дефолтной
    $dropdown.empty();
    $dropdown.append($('<option>', {
      value: '',
      text: 'Текущая таблица'
    }));

    // Добавляем доступные таблицы
    availableTables.forEach(function(tableName) {
      if (tableName) { // Проверяем, что имя таблицы не пустое
        $dropdown.append($('<option>', {
          value: tableName,
          text: tableName
        }));
      }
    });

    console.log('Выпадающий список целевой таблицы обновлен');
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
   * @param {string} targetTable - Имя целевой таблицы для фильтрации (опционально)
   * @returns {Promise<void>}
   */
  function applyFilter(recordIds, targetTable) {
    if (!checkInitialized()) {
      return Promise.reject(new Error('Grist API не инициализирован'));
    }

    console.log('Применение фильтра к записям:', recordIds, 'в таблице:', targetTable || 'текущей');

    // В текущей реализации Grist Plugin API setSelectedRows применяет фильтр
    // к текущей таблице, а не к произвольной. Это ограничение API.
    // В будущем, при наличии соответствующих методов в API, здесь можно будет
    // реализовать переключение между таблицами и фильтрацию конкретной таблицы.

    // Если целевая таблица указана (но мы не можем проверить, отличается ли она от текущей из-за ограничений API)
    if (targetTable && targetTable.trim()) {
      console.warn(`Внимание: Grist Plugin API не поддерживает фильтрацию произвольной таблицы "${targetTable}". Фильтр будет применен к текущей таблице.`);
    }

    // Применяем фильтр к текущей таблице
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
    unsubscribeFromRecordChanges: unsubscribeFromRecordChanges,
    loadAvailableTables: loadAvailableTables,
    getAvailableTables: function() { return availableTables; }
  };
})();
