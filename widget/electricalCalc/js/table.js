/**
 * Модуль для управления таблицей Tabulator
 *
 * Отвечает за создание, настройку и обновление таблицы,
 * а также обработку событий взаимодействия с таблицей.
 *
 * @module TableModule
 */

var TableModule = (function() {
  'use strict';

  // ========================================
  // ПРИВАТНЫЕ ПЕРЕМЕННЫЕ
  // ========================================

  /**
   * Экземпляр таблицы Tabulator
   */
  let tableInstance = null;

  /**
   * Обработчик события выбора строки
   */
  let rowClickHandler = null;

  // ========================================
  // ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
  // ========================================

  /**
   * Сгенерировать колонки для таблицы на основе данных
   * @param {Array<Object>} data - Данные для таблицы
   * @returns {Array<Object>} Массив определений колонок
   */
  function generateColumns(data) {
    if (!data || data.length === 0) {
      return [];
    }

    // Берём первую запись для определения колонок
    const firstRecord = data[0];
    const columns = [];

    // Создаём колонки для каждого поля
    Object.keys(firstRecord).forEach(key => {
      // Пропускаем служебное поле id
      if (key === 'id') {
        return;
      }

      columns.push({
        title: key,
        field: key,
        headerFilter: 'input',
        headerFilterPlaceholder: 'Фильтр...',
        resizable: true,
        width: 150
      });
    });

    return columns;
  }

  /**
   * Создать пустые колонки по умолчанию
   * @returns {Array<Object>} Массив определений колонок
   */
  function createDefaultColumns() {
    return [
      {
        title: 'Нет данных',
        field: 'message',
        headerSort: false
      }
    ];
  }

  // ========================================
  // ПУБЛИЧНЫЕ МЕТОДЫ
  // ========================================

  /**
   * Инициализировать таблицу
   * @param {string} containerId - ID контейнера для таблицы
   * @param {Function} onRowClick - Обработчик клика по строке
   */
  function initializeTable(containerId, onRowClick) {
    console.log('Инициализация таблицы...');

    rowClickHandler = onRowClick;

    // Создаём базовую таблицу с пустыми данными
    tableInstance = new Tabulator(`#${containerId}`, {
      layout: 'fitDataFill',
      height: '100%',
      placeholder: 'Нет данных для отображения',
      columns: createDefaultColumns(),
      data: [],
      selectable: 1,
      selectableRangeMode: 'click'
    });

    // Добавляем обработчик клика по строке
    if (rowClickHandler) {
      tableInstance.on('rowClick', function(e, row) {
        const rowData = row.getData();
        console.log('Клик по строке:', rowData);
        rowClickHandler(rowData);
      });
    }

    console.log('Таблица инициализирована');
  }

  /**
   * Обновить данные в таблице
   * @param {Array<Object>} data - Новые данные для таблицы
   */
  function updateTableData(data) {
    if (!tableInstance) {
      console.error('Таблица не инициализирована');
      return;
    }

    console.log(`Обновление таблицы с ${data.length} записями...`);

    // Если данных нет, показываем пустую таблицу
    if (!data || data.length === 0) {
      tableInstance.setColumns(createDefaultColumns());
      tableInstance.setData([{ message: 'Нет данных для отображения' }]);
      return;
    }

    // Генерируем колонки на основе данных
    const columns = generateColumns(data);

    // Обновляем колонки и данные
    tableInstance.setColumns(columns);
    tableInstance.setData(data);

    console.log('Таблица обновлена');
  }

  /**
   * Получить выбранные строки
   * @returns {Array<Object>} Массив выбранных строк
   */
  function getSelectedRows() {
    if (!tableInstance) {
      return [];
    }

    const selectedRows = tableInstance.getSelectedRows();
    return selectedRows.map(row => row.getData());
  }

  /**
   * Очистить выделение строк
   */
  function clearSelection() {
    if (!tableInstance) {
      return;
    }

    tableInstance.deselectRow();
  }

  /**
   * Получить все данные из таблицы
   * @returns {Array<Object>} Все данные таблицы
   */
  function getAllData() {
    if (!tableInstance) {
      return [];
    }

    return tableInstance.getData();
  }

  /**
   * Перерисовать таблицу
   */
  function redrawTable() {
    if (!tableInstance) {
      return;
    }

    tableInstance.redraw(true);
  }

  /**
   * Уничтожить таблицу
   */
  function destroyTable() {
    if (tableInstance) {
      tableInstance.destroy();
      tableInstance = null;
      console.log('Таблица уничтожена');
    }
  }

  /**
   * Получить экземпляр таблицы
   * @returns {Tabulator|null} Экземпляр Tabulator
   */
  function getTableInstance() {
    return tableInstance;
  }

  // ========================================
  // ЭКСПОРТ ПУБЛИЧНОГО API
  // ========================================

  return {
    initializeTable: initializeTable,
    updateTableData: updateTableData,
    getSelectedRows: getSelectedRows,
    clearSelection: clearSelection,
    getAllData: getAllData,
    redrawTable: redrawTable,
    destroyTable: destroyTable,
    getTableInstance: getTableInstance
  };
})();
