/**
 * Модуль для работы с пользовательским интерфейсом
 *
 * Этот модуль отвечает за отображение данных в виде таблицы,
 * обработку событий и взаимодействие с пользователем.
 *
 * @module UIModule
 */

var UIModule = (function(GristApiModule, TableModule, ConfigModule) {
  'use strict';

  // ========================================
  // ПРИВАТНЫЕ ПЕРЕМЕННЫЕ
  // ========================================

  let tabulatorInstance = null;

  // ========================================
  // ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
  // ========================================

  /**
   * Очистить таблицу
   */
  function clearTable() {
    const container = document.getElementById('table-container');
    container.innerHTML = '';
    if (tabulatorInstance) {
      tabulatorInstance.destroy();
      tabulatorInstance = null;
    }
  }

  /**
   * Показать сообщение статуса
   * @param {string} message - Сообщение
   * @param {string} type - Тип сообщения (success, error, warning, info)
   */
  function showStatusMessage(message, type) {
    const statusMessage = document.getElementById('status-message');
    let className = '';
    switch(type) {
      case 'success':
        className = 'alert alert-success';
        break;
      case 'error':
        className = 'alert alert-danger';
        break;
      case 'warning':
        className = 'alert alert-warning';
        break;
      default:
        className = 'alert alert-info';
    }
    statusMessage.innerHTML = `<div class="${className}">${message}</div>`;

    // Автоматически скрыть сообщения успеха через 3 секунды
    if (type === 'success') {
      setTimeout(() => {
        if (statusMessage.innerHTML.includes(message)) {
          statusMessage.innerHTML = '';
        }
      }, 3000);
    }
  }

  // ========================================
  // ПУБЛИЧНЫЕ МЕТОДЫ
  // ========================================

  /**
   * Инициализировать интерфейс
   */
  function initializeUI() {
    // Обработчик изменения выбора таблицы
    document.getElementById('table-select').addEventListener('change', function() {
      const selectedTableId = this.value;
      if (selectedTableId) {
        loadTableData(selectedTableId);
      } else {
        // Очистить таблицу если таблица не выбрана
        clearTable();
      }
    });
  }

  /**
   * Загрузить список таблиц
   */
  async function loadTables() {
    try {
      const statusMessage = document.getElementById('status-message');
      statusMessage.innerHTML = '<div class="loading">Загрузка доступных таблиц...</div>';

      // Получить список таблиц из Grist
      const tables = await GristApiModule.loadTables();

      const tableSelect = document.getElementById('table-select');
      tableSelect.innerHTML = '<option value="">-- Выберите таблицу --</option>';

      if (tables && tables.id && Array.isArray(tables.id)) {
        for (let i = 0; i < tables.id.length; i++) {
          const id = tables.id[i];
          const name = tables.tableId[i] || 'N/A';

          // Пропустить внутренние таблицы Grist
          if (!name.startsWith('_grist')) {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            tableSelect.appendChild(option);
          }
        }
      }

      statusMessage.innerHTML = '';
    } catch (error) {
      console.error('Ошибка загрузки таблиц:', error);
      const statusMessage = document.getElementById('status-message');
      statusMessage.innerHTML = `
        <div class="alert alert-danger">
          <strong>Ошибка загрузки таблиц:</strong> ${error.message}
        </div>
      `;
    }
  }

  /**
   * Загрузить данные таблицы
   * @param {string} tableId - ID таблицы
   */
  async function loadTableData(tableId) {
    try {
      TableModule.setCurrentTableId(tableId);
      const statusMessage = document.getElementById('status-message');
      statusMessage.innerHTML = '<div class="loading">Загрузка данных таблицы...</div>';

      // Загрузить данные выбранной таблицы
      const tableData = await GristApiModule.loadTableData(tableId);

      if (!tableData || !tableData.id || !Array.isArray(tableData.id)) {
        statusMessage.innerHTML = `
          <div class="alert alert-warning">
            Выбранная таблица пуста или не содержит данных
          </div>
        `;
        clearTable();
        return;
      }

      // Преобразовать данные таблицы
      const { records, columns } = TableModule.transformTableData(tableData);

      // Сохранить текущие записи и колонки
      TableModule.setCurrentRecords(records);
      TableModule.setCurrentColumns(columns);

      // Отобразить редактируемую таблицу
      renderEditableTable();

      statusMessage.innerHTML = `
        <div class="alert alert-success">
          Загружено ${records.length} записей из таблицы "${tableId}"
        </div>
      `;
    } catch (error) {
      console.error('Ошибка загрузки данных таблицы:', error);
      const statusMessage = document.getElementById('status-message');
      statusMessage.innerHTML = `
        <div class="alert alert-danger">
          <strong>Ошибка загрузки данных таблицы:</strong> ${error.message}
        </div>
      `;
    }
  }

  /**
   * Отобразить редактируемую таблицу
   */
  function renderEditableTable() {
    // Очистить предыдущую таблицу если существует
    clearTable();

    // Подготовить колонки для Tabulator
    const tabulatorColumns = TableModule.getCurrentColumns().map(col => {
      return {
        title: col,
        field: col,
        editor: "input", // Редактор текстового поля
        headerTooltip: true,
        validator: ["required"] // Можно добавить валидаторы по необходимости
      };
    });

    // Создать таблицу с помощью Tabulator
    tabulatorInstance = new Tabulator("#table-container", {
      data: TableModule.getCurrentRecords(), // Передаем прямые данные
      columns: tabulatorColumns,
      height: "600px", // Устанавливаем высоту таблицы
      layout: "fitColumns", // Автоподгонка ширины колонок
      movableColumns: true, // Возможность перемещать колонки
      responsiveLayout: "hide", // Адаптивный дизайн
      tooltips: true, // Подсказки при наведении
      addRowPos: "top", // Позиция добавления новой строки
      history: true, // Включить историю изменений
      pagination: true, // Включить пагинацию
      paginationSize: ConfigModule.getConfigValue('pageSize'),
      paginationCounter: "rows", // Показывать счетчик строк
      movableRows: true, // Возможность перемещать строки
      rowClick: function(e, row) {
        // Обработка клика по строке
        console.log("Строка кликнута:", row.getData());
      },
      cellEdited: function(cell) {
        // Обработка редактирования ячейки
        const field = cell.getField(); // Название поля
        const newValue = cell.getValue(); // Новое значение
        const rowData = cell.getRow().getData(); // Данные всей строки
        const rowId = rowData.id; // ID строки из Grist

        // Обновить запись в Grist
        updateRecordInGrist(rowId, field, newValue);
      }
    });
  }

  /**
   * Обновить запись в Grist
   * @param {number} rowId - ID строки
   * @param {string} fieldName - Название поля
   * @param {*} newValue - Новое значение
   */
  async function updateRecordInGrist(rowId, fieldName, newValue) {
    try {
      // Подготовить объект обновления
      const updateObj = {};
      updateObj[fieldName] = newValue;

      // Обновить запись в Grist
      await GristApiModule.updateRecord(
        TableModule.getCurrentTableId(),
        rowId,
        updateObj
      );

      // Найти и обновить локальную запись
      TableModule.updateLocalRecord(rowId, fieldName, newValue);

      // Показать сообщение об успехе
      showStatusMessage(`Обновлено ${fieldName} для записи ID ${rowId}`, 'success');
    } catch (error) {
      console.error('Ошибка обновления записи:', error);
      showStatusMessage(`Ошибка обновления записи: ${error.message}`, 'error');
    }
  }

  // ========================================
  // ЭКСПОРТ ПУБЛИЧНОГО API
  // ========================================

  return {
    initializeUI: initializeUI,
    loadTables: loadTables,
    loadTableData: loadTableData,
    renderEditableTable: renderEditableTable,
    showStatusMessage: showStatusMessage,
    clearTable: clearTable
  };
})(GristApiModule, TableModule, ConfigModule);