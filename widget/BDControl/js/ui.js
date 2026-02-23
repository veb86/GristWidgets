/**
 * Модуль для работы с пользовательским интерфейсом
 *
 * Этот модуль отвечает за отображение данных в виде таблицы Tabulator,
 * обработку событий и взаимодействие с пользователем.
 *
 * @module UIModule
 */

var UIModule = (function(GristApiModule, ConfigModule) {
  'use strict';

  // ========================================
  // ПРИВАТНЫЕ ПЕРЕМЕННЫЕ
  // ========================================

  var currentGroupId = null;
  var currentGroupName = null;
  var deviceGroups = [];
  var devices = [];
  var tabulatorInstance = null;
  var currentCharacteristics = []; // Характеристики текущей группы

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
    var map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, function(m) { return map[m]; });
  }

  /**
   * Получить все дочерние группы рекурсивно
   * @param {number} groupId - ID родительской группы
   * @returns {Array<number>} Массив ID всех дочерних групп
   */
  function getAllChildGroups(groupId) {
    var result = [groupId];

    var children = deviceGroups.filter(function(g) {
      return g.parent_id === groupId;
    });

    children.forEach(function(child) {
      result = result.concat(getAllChildGroups(child.id));
    });

    return result;
  }

  /**
   * Получить название группы по ID
   * @param {number} groupId - ID группы
   * @returns {string|null} Название группы или null
   */
  function getGroupNameById(groupId) {
    var group = deviceGroups.find(function(g) {
      return g.id === groupId;
    });
    return group ? group.name : null;
  }

  /**
   * Отфильтровать устройства по выбранной группе
   * @returns {Array} Отфильтрованные устройства
   */
  function getFilteredDevices() {
    if (!currentGroupId) {
      return [];
    }

    var groupIds = getAllChildGroups(currentGroupId);

    return devices.filter(function(device) {
      return groupIds.indexOf(device.devgroup_id) !== -1;
    });
  }

  /**
   * Подготовить данные для Tabulator
   * @param {Array} devicesArray - Массив устройств
   * @returns {Array} Подготовленные данные
   */
  function prepareDataForTabulator(devicesArray) {
    return devicesArray.map(function(device, index) {
      var group = deviceGroups.find(function(g) { return g.id === device.devgroup_id; });
      var preparedData = {
        id: device.id,
        name: device.name || '',
        brand: device.brand || '',
        factoryname: device.factoryname || '',
        unit: device.unit || '',
        count: device.count || '',
        note: device.note || '',
        gristHelper_Display2: device.gristHelper_Display2 || (group ? group.name : ''),
        _manualSort: group ? (group.manualSort || 0) : 0
      };

      // Добавляем значения характеристик для текущей группы
      currentCharacteristics.forEach(function(char) {
        var value = GristApiModule.getCharacteristicValue(device.id, char.characteristic_id);
        preparedData['char_' + char.code] = value !== null ? value : '';
      });

      return preparedData;
    });
  }

  /**
   * Получить колонки для Tabulator
   * @returns {Array} Конфигурация колонок
   */
  function getTabulatorColumns() {
    var currentField = ConfigModule.getConfigValue('sortField');
    var currentDirection = ConfigModule.getConfigValue('sortDirection');
    var columnVisibility = ConfigModule.getColumnVisibility();
    var baseColumns = ConfigModule.getBaseColumns();

    var columns = [];

    // Добавляем базовые колонки
    baseColumns.forEach(function(colCode) {
      var colConfig = columnVisibility[colCode];
      if (colConfig && colConfig.visible !== false) {
        columns.push({
          title: colConfig.title || colCode,
          field: colCode,
          headerSort: true,
          width: colConfig.width,
          widthGrow: colConfig.widthGrow,
          cssClass: colCode === 'name' ? 'tabulator-cell-nowrap' : undefined
        });
      }
    });

    // Добавляем колонки характеристик для текущей группы
    currentCharacteristics.forEach(function(char) {
      var colConfig = columnVisibility[char.code];
      if (colConfig && colConfig.visible !== false) {
        columns.push({
          title: char.name + (char.unit ? ' (' + char.unit + ')' : ''),
          field: 'char_' + char.code,
          headerSort: true,
          width: colConfig.width || 120,
          cssClass: 'tabulator-cell-nowrap'
        });
      }
    });

    return columns;
  }

  /**
   * Обработчик изменения сортировки в Tabulator
   * @param {Array} sorters - Массив сортировок
   */
  function handleTabulatorSort(sorters) {
    if (sorters && sorters.length > 0) {
      var sorter = sorters[0];
      var field = sorter.field;
      var direction = sorter.dir === 'asc' ? 'asc' : 'desc';

      // Особая обработка для manualSort
      if (field === '_manualSort') {
        field = 'manualSort';
      }

      ConfigModule.setConfigValue('sortField', field);
      ConfigModule.setConfigValue('sortDirection', direction);
    }
  }

  /**
   * Инициализировать Tabulator
   */
  function initializeTabulator() {
    if (tabulatorInstance) {
      tabulatorInstance.destroy();
    }

    var currentField = ConfigModule.getConfigValue('sortField');
    var currentDirection = ConfigModule.getConfigValue('sortDirection');

    // Преобразуем поле сортировки для Tabulator
    var initialSortField = currentField === 'manualSort' ? '_manualSort' : currentField;
    var initialSortDir = currentDirection;

    tabulatorInstance = new Tabulator('#devices-table', {
      data: [],
      columns: getTabulatorColumns(),
      layout: 'fitColumns',
      height: '100%',
      placeholder: 'Нет данных',
      initialSort: [
        { column: initialSortField, dir: initialSortDir }
      ],
      columnHeaderVertAlign: 'middle',
      cssClass: 'bdcontrol-tabulator',
      columnDefaults: {
        headerSortStartingDir: 'asc',
        headerFilter: false
      }
    });

    // Подписка на событие сортировки
    tabulatorInstance.on('dataSorting', function(sorters) {
      handleTabulatorSort(sorters);
    });
  }

  // ========================================
  // ПУБЛИЧНЫЕ МЕТОДЫ
  // ========================================

  /**
   * Инициализировать пользовательский интерфейс
   */
  function initializeUI() {
    // НЕ инициализируем Tabulator здесь - сделаем это при первой отрисовке
    // когда данные уже загружены
    console.log('UI инициализирован (Tabulator будет создан при отрисовке)');
  }

  /**
   * Установить данные групп устройств
   * @param {Array} groups - Массив групп
   */
  function setDeviceGroups(groups) {
    deviceGroups = groups;
  }

  /**
   * Установить данные устройств
   * @param {Array} devs - Массив устройств
   */
  function setDevices(devs) {
    devices = devs;
  }

  /**
   * Установить характеристики текущей группы
   * @param {Array} chars - Массив характеристик
   */
  function setCharacteristics(chars) {
    currentCharacteristics = chars;
  }

  /**
   * Установить выбранную группу
   * @param {number} groupId - ID группы
   */
  function setSelectedGroupId(groupId) {
    currentGroupId = groupId !== null && groupId !== undefined ? parseInt(groupId, 10) : null;
    currentGroupName = currentGroupId ? getGroupNameById(currentGroupId) : null;
    // Сохраняем текущую группу в конфигурацию
    ConfigModule.setCurrentGroupId(currentGroupId);
  }

  /**
   * Показать сообщение
   * @param {string} message - Текст сообщения
   * @param {string} type - Тип сообщения (info, warning, error)
   */
  function showMessage(message, type) {
    var container = document.getElementById('message-container');
    if (!container) return;

    container.innerHTML = '<div class="message message-' + type + '">' + escapeHtml(message) + '</div>';
    container.style.display = 'block';
  }

  /**
   * Скрыть сообщение
   */
  function hideMessage() {
    var container = document.getElementById('message-container');
    if (!container) return;

    container.style.display = 'none';
    container.innerHTML = '';
  }

  /**
   * Обновить заголовок виджета
   */
  function updateHeader() {
    var groupNameElement = document.getElementById('group-name');
    var devicesCountElement = document.getElementById('devices-count');

    if (!groupNameElement) return;

    if (currentGroupId === null || currentGroupId === undefined) {
      groupNameElement.textContent = 'Не выбрана';
      if (devicesCountElement) devicesCountElement.textContent = '';
      return;
    }

    if (!currentGroupName) {
      groupNameElement.textContent = '#' + currentGroupId + ' (не найдена)';
      if (devicesCountElement) devicesCountElement.textContent = '';
      return;
    }

    groupNameElement.textContent = currentGroupName;

    var filteredDevices = getFilteredDevices();
    if (devicesCountElement) {
      devicesCountElement.textContent = '(' + filteredDevices.length + ' шт.)';
    }
  }

  /**
   * Отрисовать таблицу устройств
   */
  function render() {
    hideMessage();

    // Проверка: выбрана ли группа
    if (currentGroupId === null || currentGroupId === undefined) {
      updateHeader();
      // Инициализируем Tabulator если ещё не инициализирован
      if (!tabulatorInstance) {
        initializeTabulator();
      }
      tabulatorInstance.setData([]);
      showMessage('Группа не выбрана', 'warning');
      return;
    }

    // Проверка: существует ли группа
    if (!currentGroupName) {
      updateHeader();
      // Инициализируем Tabulator если ещё не инициализирован
      if (!tabulatorInstance) {
        initializeTabulator();
      }
      tabulatorInstance.setData([]);
      showMessage('Выбранная группа не найдена', 'error');
      return;
    }

    updateHeader();

    // Получаем отфильтрованные устройства
    var filteredDevices = getFilteredDevices();

    // Проверка: есть ли устройства
    if (filteredDevices.length === 0) {
      // Инициализируем Tabulator если ещё не инициализирован
      if (!tabulatorInstance) {
        initializeTabulator();
      }
      tabulatorInstance.setData([]);
      showMessage('В данной группе нет устройств', 'info');
      return;
    }

    // Подготавливаем и сортируем данные
    var preparedData = prepareDataForTabulator(filteredDevices);
    var sortedData = sortDevices(preparedData);

    // Отрисовка таблицы через Tabulator
    // ЛЕНИВАЯ ИНИЦИАЛИЗАЦИЯ: создаём Tabulator только когда данные готовы
    if (!tabulatorInstance) {
      initializeTabulator();
    }
    
    // ВАЖНО: Пересоздаём колонки для текущей группы
    var columns = getTabulatorColumns();
    tabulatorInstance.setColumns(columns);
    tabulatorInstance.setData(sortedData);
  }

  /**
   * Сортировать устройства
   * @param {Array} devicesArray - Массив устройств
   * @returns {Array} Отсортированный массив
   */
  function sortDevices(devicesArray) {
    var sortField = ConfigModule.getConfigValue('sortField');
    var sortDirection = ConfigModule.getConfigValue('sortDirection');

    return devicesArray.sort(function(a, b) {
      // Особая обработка для manualSort (группы)
      if (sortField === 'manualSort') {
        var sortA = a._manualSort || 0;
        var sortB = b._manualSort || 0;
        return sortDirection === 'asc' ? sortA - sortB : sortB - sortA;
      }

      var valA = a[sortField] || '';
      var valB = b[sortField] || '';

      // Числовое сравнение
      var numA = parseFloat(valA);
      var numB = parseFloat(valB);

      if (!isNaN(numA) && !isNaN(numB)) {
        return sortDirection === 'asc' ? numA - numB : numB - numA;
      }

      // Строковое сравнение
      valA = String(valA).toLowerCase();
      valB = String(valB).toLowerCase();

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }

  /**
   * Обновить данные и перерисовать таблицу
   * @param {Array} newDevices - Новые данные устройств
   */
  function updateData(newDevices) {
    devices = newDevices;
    render();
  }

  // ========================================
  // ЭКСПОРТ ПУБЛИЧНОГО API
  // ========================================

  return {
    initializeUI: initializeUI,
    setDeviceGroups: setDeviceGroups,
    setDevices: setDevices,
    setCharacteristics: setCharacteristics,
    setSelectedGroupId: setSelectedGroupId,
    showMessage: showMessage,
    hideMessage: hideMessage,
    updateHeader: updateHeader,
    render: render,
    updateData: updateData,
    getTabulatorInstance: function() {
      return tabulatorInstance;
    }
  };
})(GristApiModule, ConfigModule);
