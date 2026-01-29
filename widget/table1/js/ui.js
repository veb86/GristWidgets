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
    if (tabulatorInstance) {
      try {
        tabulatorInstance.destroy();
      } catch (e) {
        console.warn('Ошибка при уничтожении таблицы:', e);
      }
      tabulatorInstance = null;
    }
    const container = document.getElementById('table-container');
    if (container) {
      container.innerHTML = '';
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

    // Обработчик кнопки добавления строки
    document.getElementById('add-row-btn').addEventListener('click', function() {
      if (tabulatorInstance) {
        // Получаем все текущие записи для копирования значений из последней
        const allRecords = TableModule.getCurrentRecords();
        const lastRecord = allRecords.length > 0 ? allRecords[allRecords.length - 1] : null;

        // Подготовить новую запись с правильными полями
        const newRecord = { id: 'new' }; // Временный ID для новой записи
        const columns = TableModule.getCurrentColumns();

        // Инициализируем поля значениями из последней записи или пустыми значениями
        columns.forEach(col => {
          if (lastRecord && typeof lastRecord[col] !== 'undefined' && col !== 'id') {
            newRecord[col] = lastRecord[col]; // Копируем значение из последней записи
          } else {
            newRecord[col] = ''; // Пустое значение по умолчанию
          }
        });

        // Добавляем новую строку в начало таблицы
        tabulatorInstance.addRow(newRecord, true);
      } else {
        showStatusMessage('Сначала выберите таблицу', 'warning');
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

      // Загрузить метаданные столбцов
      const columnMetadata = await GristApiModule.loadTableMetadata(tableId);

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

      // Сохранить текущие записи, колонки и метаданные
      TableModule.setCurrentRecords(records);
      TableModule.setCurrentColumns(columns);
      TableModule.setCurrentColumnMetadata(columnMetadata);

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
      // Проверяем, является ли столбец формульным
      const isFormula = TableModule.isColumnFormula(col);

      const columnDef = {
        title: col,
        field: col,
        headerTooltip: true,
        validator: ["required"] // Можно добавить валидаторы по необходимости
      };

      // Если столбец не формульный, добавляем редактор
      if (!isFormula) {
        columnDef.editor = "input"; // Редактор текстового поля
      } else {
        // Для формульных столбцов добавляем стиль
        columnDef.headerCssClass = "formula-column-header";
        columnDef.cssClass = "formula-column-cell";
      }

      return columnDef;
    });

    // Добавить колонку с кнопками управления (если еще не добавлена)
    if (!tabulatorColumns.some(col => col.field === 'controls')) {
      tabulatorColumns.push({
        title: "Действия",
        field: "controls",
        width: 180,
        hozAlign: "center",
        formatter: function(cell) {
          const rowData = cell.getRow().getData();
          const rowId = rowData.id;

          // Создаем кнопки в зависимости от типа строки
          if (rowId && rowId !== 'new' && typeof rowId !== 'string') {
            // Существующая запись - кнопки "Изменить" и "Удалить"
            return '<button class="btn btn-sm btn-primary update-btn">Изменить</button> <button class="btn btn-sm btn-danger delete-btn">Удалить</button>';
          } else {
            // Новая запись - кнопка "Сохранить"
            return '<button class="btn btn-sm btn-success save-btn">Сохранить</button>';
          }
        },
        cellClick: function(e, cell) {
          const rowData = cell.getRow().getData();
          const rowId = rowData.id;

          if (e.target.classList.contains('update-btn')) {
            // Обработка обновления существующей записи
            updateRowInGrist(rowId, rowData, cell.getRow());
          } else if (e.target.classList.contains('delete-btn')) {
            // Обработка удаления записи
            deleteRecordFromGrist(rowId, cell.getRow());
          } else if (e.target.classList.contains('save-btn')) {
            // Обработка сохранения новой записи
            saveNewRecordToGrist(rowData, cell.getRow());
          }
        }
      });
    }

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
        const field = cell.getField(); // Название поля

        // Проверяем, является ли столбец формульным
        if (TableModule.isColumnFormula(field)) {
          console.log(`Попытка редактирования формульного столбца ${field} отклонена`);
          // Откатываем изменение
          cell.setValue(cell.getOldValue());
          showStatusMessage(`Невозможно редактировать формульный столбец "${field}"`, 'warning');
          return;
        }

        const newValue = cell.getValue(); // Новое значение
        const rowData = cell.getRow().getData(); // Данные всей строки
        const rowId = rowData.id; // ID строки из Grist

        // Проверяем, является ли это новой строкой
        if (rowId === 'new' || typeof rowId === 'string') {
          // Это новая строка, обновляем локально
          rowData[field] = newValue;
        } else {
          // Это существующая строка
          // Отмечаем, что строка была изменена (например, меняем стиль кнопки "Изменить")
          const row = cell.getRow();
          const updateBtn = row.getElement().querySelector('.update-btn');
          if (updateBtn) {
            updateBtn.classList.add('btn-warning'); // Меняем стиль кнопки, чтобы показать, что строка изменена
            updateBtn.textContent = 'Изменить*'; // Помечаем кнопку звездочкой
          }
        }
      }
    });

    // Добавляем обработчик для событий после обновления таблицы
    tabulatorInstance.on("dataLoaded", function(data) {
      console.log("Данные таблицы загружены:", data);
    });

    tabulatorInstance.on("tableBuilt", function() {
      console.log("Таблица построена, готова к работе");
    });
  }

  /**
   * Обновить всю строку в Grist
   * @param {number} rowId - ID строки
   * @param {object} rowData - Данные строки
   * @param {object} row - Объект строки Tabulator
   */
  async function updateRowInGrist(rowId, rowData, row) {
    try {
      // Подготовить объект обновления, исключая формульные и системные столбцы
      const updateObj = {};
      const columns = TableModule.getCurrentColumns();

      columns.forEach(col => {
        // Пропускаем формульные столбцы
        if (TableModule.isColumnFormula(col)) {
          console.log(`Пропускаем формульный столбец при обновлении строки: ${col}`);
          return;
        }

        // Пропускаем системные столбцы
        const skipColumns = ['id', 'manualSort', 'createdAt', 'updatedAt'];
        if (skipColumns.includes(col.toLowerCase()) || skipColumns.includes(col)) {
          console.log(`Пропускаем системный столбец при обновлении строки: ${col}`);
          return;
        }

        // Добавляем значение в объект обновления
        if (typeof rowData[col] !== 'undefined') {
          updateObj[col] = rowData[col];
        }
      });

      console.log('Попытка обновления строки в Grist:', {rowId, updateObj});

      // Проверяем, есть ли поля для обновления
      if (Object.keys(updateObj).length === 0) {
        showStatusMessage('Нет полей для обновления (все столбцы пропущены)', 'warning');
        return;
      }

      // Обновить запись в Grist
      await GristApiModule.updateRecord(
        TableModule.getCurrentTableId(),
        rowId,
        updateObj
      );

      console.log('Запись успешно обновлена в Grist');

      // Показать сообщение об успехе
      showStatusMessage(`Запись ID ${rowId} успешно обновлена`, 'success');

      // Сбросить индикацию изменений
      const updateBtn = row.getElement().querySelector('.update-btn');
      if (updateBtn) {
        updateBtn.classList.remove('btn-warning'); // Возвращаем стиль кнопки к нормальному
        updateBtn.textContent = 'Изменить'; // Убираем звездочку
      }
    } catch (error) {
      console.error('Ошибка обновления записи:', error);
      showStatusMessage(`Ошибка обновления записи: ${error.message}`, 'error');
    }
  }

  /**
   * Обновить запись в Grist (по одному полю - для совместимости)
   * @param {number} rowId - ID строки
   * @param {string} fieldName - Название поля
   * @param {*} newValue - Новое значение
   */
  async function updateRecordInGrist(rowId, fieldName, newValue) {
    // Проверяем, является ли столбец формульным
    if (TableModule.isColumnFormula(fieldName)) {
      console.log(`Пропускаем обновление формульного столбца: ${fieldName}`);
      // Обновляем только локально, не отправляя в Grist
      TableModule.updateLocalRecord(rowId, fieldName, newValue);
      return;
    }

    // Список потенциально проблемных столбцов (системные и т.д.)
    const skipColumns = ['id', 'manualSort', 'createdAt', 'updatedAt'];

    // Проверяем, является ли столбец системным
    if (skipColumns.includes(fieldName.toLowerCase()) || skipColumns.includes(fieldName)) {
      console.log(`Пропускаем обновление системного столбца: ${fieldName}`);
      // Обновляем только локально, не отправляя в Grist
      TableModule.updateLocalRecord(rowId, fieldName, newValue);
      return;
    }

    try {
      // Подготовить объект обновления
      const updateObj = {};
      updateObj[fieldName] = newValue;

      console.log('Попытка обновления записи в Grist:', {rowId, fieldName, newValue});

      // Обновить запись в Grist
      await GristApiModule.updateRecord(
        TableModule.getCurrentTableId(),
        rowId,
        updateObj
      );

      // Найти и обновить локальную запись
      TableModule.updateLocalRecord(rowId, fieldName, newValue);

      console.log('Запись успешно обновлена в Grist');

      // Показать сообщение об успехе
      showStatusMessage(`Обновлено ${fieldName} для записи ID ${rowId}`, 'success');
    } catch (error) {
      console.error('Ошибка обновления записи:', error);
      showStatusMessage(`Ошибка обновления записи: ${error.message}`, 'error');

      // Восстановить старое значение в таблице в случае ошибки
      try {
        const tableData = TableModule.getCurrentRecords();
        const record = tableData.find(r => r.id === rowId);
        if (record) {
          const oldValue = record[fieldName];
          // Используем Tabulator метод для обновления значения без триггера события редактирования
          const row = tabulatorInstance?.getRow(rowId);
          if (row) {
            row.update({[fieldName]: oldValue});
          }
        }
      } catch (restoreError) {
        console.error('Ошибка восстановления значения:', restoreError);
      }
    }
  }

  /**
   * Удалить запись из Grist
   * @param {number} rowId - ID строки для удаления
   * @param {object} row - Объект строки Tabulator
   */
  async function deleteRecordFromGrist(rowId, row) {
    if (!confirm(`Вы уверены, что хотите удалить запись с ID ${rowId}?`)) {
      return; // Отмена операции
    }

    try {
      console.log('Удаление записи из Grist:', rowId);

      // Удалить запись из Grist через GristApiModule
      await GristApiModule.deleteRecord(
        TableModule.getCurrentTableId(),
        rowId
      );

      console.log('Запись успешно удалена из Grist');

      // Удалить строку из локальных данных
      const records = TableModule.getCurrentRecords();
      const recordIndex = records.findIndex(r => r.id === rowId);
      if (recordIndex !== -1) {
        records.splice(recordIndex, 1);
      }

      // Удалить строку из таблицы Tabulator
      row.delete();

      // Показать сообщение об успехе
      showStatusMessage(`Запись с ID ${rowId} успешно удалена`, 'success');
    } catch (error) {
      console.error('Ошибка удаления записи:', error);
      showStatusMessage(`Ошибка удаления записи: ${error.message}`, 'error');
    }
  }

  /**
   * Сохранить новую запись в Grist
   * @param {object} rowData - Данные новой записи
   * @param {object} row - Объект строки Tabulator
   */
  async function saveNewRecordToGrist(rowData, row) {
    try {
      // Подготовить данные для новой записи
      const columnValues = {};
      const columns = TableModule.getCurrentColumns();

      // Получаем все текущие записи для возможного копирования значений
      const allRecords = TableModule.getCurrentRecords();
      const lastRecord = allRecords.length > 0 ? allRecords[allRecords.length - 1] : null;

      // Инициализируем только те колонки, которые не являются формульными или системными
      columns.forEach(col => {
        // Пропускаем формульные столбцы
        if (TableModule.isColumnFormula(col)) {
          console.log(`Пропускаем формульный столбец при добавлении новой записи: ${col}`);
          return;
        }

        // Пропускаем системные столбцы
        const skipColumns = ['id', 'manualSort', 'createdAt', 'updatedAt'];
        if (skipColumns.includes(col.toLowerCase()) || skipColumns.includes(col)) {
          console.log(`Пропускаем системный столбец при добавлении новой записи: ${col}`);
          return;
        }

        if (typeof rowData[col] !== 'undefined' && rowData[col] !== 'new' && rowData[col] !== '') {
          // Используем значение из rowData, если оно определено и не пустое
          columnValues[col] = [rowData[col]];
        } else if (lastRecord && typeof lastRecord[col] !== 'undefined') {
          // Копируем значение из последней записи, если оно существует
          columnValues[col] = [lastRecord[col]];
        } else {
          // Иначе используем пустое значение
          columnValues[col] = [''];
        }
      });

      console.log('Создание новой записи в Grist:', { columnValues });

      // Проверяем, есть ли вообще какие-либо данные для отправки
      if (Object.keys(columnValues).length === 0) {
        console.log('Нет данных для отправки при добавлении новой записи (все столбцы пропущены)');
        // Добавляем хотя бы одну колонку с пустым значением, чтобы создать запись
        const nonFormulaCols = columns.filter(col =>
          !TableModule.isColumnFormula(col) &&
          !['id', 'manualSort', 'createdAt', 'updatedAt'].includes(col.toLowerCase()) &&
          !['id', 'manualSort', 'createdAt', 'updatedAt'].includes(col)
        );

        if (nonFormulaCols.length > 0) {
          const firstCol = nonFormulaCols[0];
          columnValues[firstCol] = [''];
        } else {
          throw new Error('Нет подходящих столбцов для добавления новой записи');
        }
      }

      // Создать запись в Grist через GristApiModule
      const result = await GristApiModule.addRecord(
        TableModule.getCurrentTableId(),
        columnValues
      );

      console.log('Новая запись успешно создана в Grist, результат:', result);

      // После успешного добавления перезагружаем таблицу, чтобы получить актуальные данные
      showStatusMessage(`Новая запись успешно создана`, 'success');
      loadTableData(TableModule.getCurrentTableId());
    } catch (error) {
      console.error('Ошибка создания записи:', error);
      showStatusMessage(`Ошибка создания записи: ${error.message}`, 'error');
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