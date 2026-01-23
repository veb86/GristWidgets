/**
 * Модуль пользовательского интерфейса для редактируемой таблицы
 *
 * Этот модуль управляет отображением интерфейса, включая таблицу,
 * настройки и обработку пользовательских взаимодействий.
 *
 * @module UIModule
 */

var UIModule = (function() {
  'use strict';

  // ========================================
  // ПРИВАТНЫЕ ПЕРЕМЕННЫЕ
  // ========================================

  var $tableSelect = null; // Элемент выбора таблицы
  var $table = null; // Элемент таблицы
  var $tableHeader = null; // Заголовок таблицы
  var $tableBody = null; // Тело таблицы
  var $status = null; // Элемент статуса

  // ========================================
  // ИНИЦИАЛИЗАЦИЯ
  // ========================================

  /**
   * Инициализировать модуль UI
   */
  function initialize() {
    $tableSelect = $('#table-select');
    $table = $('#editable-table');
    $tableHeader = $('#table-header');
    $tableBody = $('#table-body');
    $status = $('#status-text');

    // Привязываем обработчики событий
    bindEvents();

    console.log('UI модуль инициализирован');
  }

  /**
   * Привязать обработчики событий
   */
  function bindEvents() {
    $tableSelect.on('change', function() {
      var tableId = $(this).val();
      ConfigModule.setSelectedTableId(tableId);
      AppModule.loadSelectedTable();
    });
  }

  // ========================================
  // ОТОБРАЖЕНИЕ СПИСКА ТАБЛИЦ
  // ========================================

  /**
   * Заполнить список таблиц
   *
   * @param {Array} tables - Список таблиц
   */
  function populateTableSelect(tables) {
    $tableSelect.empty();
    $tableSelect.append($('<option>', {
      value: '',
      text: 'Выберите таблицу'
    }));

    tables.forEach(function(table) {
      $tableSelect.append($('<option>', {
        value: table.id,
        text: table.tableId
      }));
    });

    console.log('Список таблиц обновлен');
  }

  // ========================================
  // ОТОБРАЖЕНИЕ ДАННЫХ ТАБЛИЦЫ
  // ========================================

  /**
   * Отобразить данные таблицы
   *
   * @param {Object} tableData - Данные таблицы из Grist
   */
  function displayTableData(tableData) {
    // Очищаем таблицу
    $tableHeader.empty();
    $tableBody.empty();

    if (!tableData || !tableData.id || tableData.id.length === 0) {
      // Пустая таблица
      $tableHeader.append('<th>Нет данных</th>');
      $tableBody.append('<tr><td>Таблица пуста</td></tr>');
      return;
    }

    // Получаем список полей (исключаем служебные)
    var fieldNames = Object.keys(tableData).filter(function(key) {
      return key !== 'id' && key !== 'manualSort';
    });

    // Создаем заголовки
    var $headerRow = $('<tr>');
    $headerRow.append('<th>ID</th>'); // Добавляем колонку ID
    fieldNames.forEach(function(fieldName) {
      $headerRow.append('<th>' + fieldName + '</th>');
    });
    $tableHeader.append($headerRow);

    // Создаем строки данных
    for (var i = 0; i < tableData.id.length; i++) {
      var $row = $('<tr>');
      $row.attr('data-id', tableData.id[i]);

      // Добавляем ID
      $row.append('<td>' + tableData.id[i] + '</td>');

      // Добавляем значения полей
      fieldNames.forEach(function(fieldName) {
        var value = tableData[fieldName] ? tableData[fieldName][i] : '';
        $row.append('<td>' + (value || '') + '</td>');
      });

      $tableBody.append($row);
    }

    // Инициализируем Tabledit для редактирования
    initializeTabledit(fieldNames);

    console.log('Данные таблицы отображены');
  }

  /**
   * Инициализировать Tabledit для редактирования таблицы
   *
   * @param {Array} fieldNames - Список имен полей
   */
  function initializeTabledit(fieldNames) {
    // Удаляем предыдущую инициализацию, если есть
    if ($table.hasClass('tabledit')) {
      $table.tabledit('destroy');
    }

    // Настраиваем колонки для редактирования (исключаем ID)
    var columns = {
      identifier: [0, 'id'], // ID колонка
      editable: []
    };

    fieldNames.forEach(function(fieldName, index) {
      columns.editable.push([index + 1, fieldName]); // +1 потому что ID колонка первая
    });

    // Инициализируем Tabledit
    $table.tabledit({
      url: '', // Не используем URL, обрабатываем изменения вручную
      columns: columns.editable,
      onDraw: function() {
        console.log('Tabledit инициализирован');
      },
      onSuccess: function(data, textStatus, jqXHR) {
        // Обработка успешного сохранения
        console.log('Изменения сохранены:', data);
        updateStatus('Изменения сохранены');
      },
      onFail: function(jqXHR, textStatus, errorThrown) {
        console.error('Ошибка сохранения:', errorThrown);
        updateStatus('Ошибка сохранения: ' + errorThrown);
      },
      onAjax: function(action, serialize) {
        // Перехватываем AJAX запросы и обрабатываем вручную
        handleTableEdit(action, serialize);
        return false; // Предотвращаем отправку AJAX
      }
    });
  }

  /**
   * Обработать изменения в таблице
   *
   * @param {string} action - Действие (edit, delete и т.д.)
   * @param {string} serialize - Сериализованные данные
   */
  function handleTableEdit(action, serialize) {
    console.log('Обработка изменения:', action, serialize);

    // Парсим данные
    var data = {};
    serialize.split('&').forEach(function(pair) {
      var parts = pair.split('=');
      data[decodeURIComponent(parts[0])] = decodeURIComponent(parts[1] || '');
    });

    var tableId = ConfigModule.getSelectedTableId();
    var recordId = parseInt(data.id);

    if (action === 'edit') {
      // Собираем изменения
      var changes = {};
      Object.keys(data).forEach(function(key) {
        if (key !== 'id' && key !== 'action') {
          changes[key] = data[key];
        }
      });

      // Сохраняем изменения
      GristAPIModule.saveRecordChanges(tableId, recordId, changes).then(function() {
        updateStatus('Изменения сохранены');
      }).catch(function(error) {
        updateStatus('Ошибка: ' + error.message);
      });

    } else if (action === 'delete') {
      // Удаляем запись
      GristAPIModule.deleteRecord(tableId, recordId).then(function() {
        updateStatus('Запись удалена');
        // Перезагружаем таблицу
        AppModule.loadSelectedTable();
      }).catch(function(error) {
        updateStatus('Ошибка: ' + error.message);
      });
    }
  }

  // ========================================
  // СТАТУС И СООБЩЕНИЯ
  // ========================================

  /**
   * Обновить статус
   *
   * @param {string} message - Сообщение статуса
   */
  function updateStatus(message) {
    if ($status) {
      $status.text(message);
      // Автоматически скрываем статус через 3 секунды
      setTimeout(function() {
        $status.text('');
      }, 3000);
    }
  }

  /**
   * Показать сообщение об ошибке
   *
   * @param {string} message - Сообщение об ошибке
   */
  function showError(message) {
    updateStatus('Ошибка: ' + message);
    console.error(message);
  }

  /**
   * Показать сообщение о загрузке
   *
   * @param {string} message - Сообщение о загрузке
   */
  function showLoading(message) {
    updateStatus(message || 'Загрузка...');
  }

  // ========================================
  // ЭКСПОРТ ПУБЛИЧНОГО API
  // ========================================

  return {
    initialize: initialize,
    populateTableSelect: populateTableSelect,
    displayTableData: displayTableData,
    updateStatus: updateStatus,
    showError: showError,
    showLoading: showLoading
  };
})();