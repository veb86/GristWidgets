/**
 * Модуль для работы с пользовательским интерфейсом
 *
 * Этот модуль отвечает за отображение данных в виде таблицы,
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
        var groupA = deviceGroups.find(function(g) { return g.id === a.devgroup_id; });
        var groupB = deviceGroups.find(function(g) { return g.id === b.devgroup_id; });
        var sortA = groupA ? (groupA.manualSort || 0) : 0;
        var sortB = groupB ? (groupB.manualSort || 0) : 0;
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

  // ========================================
  // ПУБЛИЧНЫЕ МЕТОДЫ
  // ========================================

  /**
   * Инициализировать пользовательский интерфейс
   */
  function initializeUI() {
    // Обработчик клика по заголовку таблицы (сортировка)
    var tableHeader = document.querySelector('.devices-table thead');
    if (tableHeader) {
      tableHeader.addEventListener('click', handleSort);
    }
  }

  /**
   * Обработчик клика по заголовку таблицы
   * @param {Event} event
   */
  function handleSort(event) {
    var th = event.target.closest('th[data-sort]');
    if (!th) return;

    var field = th.dataset.sort;
    var currentField = ConfigModule.getConfigValue('sortField');
    var currentDirection = ConfigModule.getConfigValue('sortDirection');

    // Переключаем направление
    if (currentField === field) {
      ConfigModule.setConfigValue('sortField', field);
      ConfigModule.setConfigValue('sortDirection', currentDirection === 'asc' ? 'desc' : 'asc');
    } else {
      ConfigModule.setConfigValue('sortField', field);
      ConfigModule.setConfigValue('sortDirection', 'asc');
    }

    // Перерисовать таблицу
    render();
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
   * Установить выбранную группу
   * @param {number} groupId - ID группы
   */
  function setSelectedGroupId(groupId) {
    currentGroupId = groupId !== null && groupId !== undefined ? parseInt(groupId, 10) : null;
    currentGroupName = currentGroupId ? getGroupNameById(currentGroupId) : null;
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
      clearTableBody();
      showMessage('Группа не выбрана', 'warning');
      return;
    }

    // Проверка: существует ли группа
    if (!currentGroupName) {
      updateHeader();
      clearTableBody();
      showMessage('Выбранная группа не найдена', 'error');
      return;
    }

    updateHeader();

    // Получаем отфильтрованные устройства
    var filteredDevices = getFilteredDevices();

    // Проверка: есть ли устройства
    if (filteredDevices.length === 0) {
      clearTableBody();
      showMessage('В данной группе нет устройств', 'info');
      return;
    }

    // Сортируем устройства
    var sortedDevices = sortDevices(filteredDevices);

    // Отрисовка таблицы
    renderTableBody(sortedDevices);
  }

  /**
   * Очистить тело таблицы
   */
  function clearTableBody() {
    var tbody = document.getElementById('devices-tbody');
    if (tbody) {
      tbody.innerHTML = '';
    }
  }

  /**
   * Отрисовать тело таблицы
   * @param {Array} devicesArray - Массив устройств
   */
  function renderTableBody(devicesArray) {
    var tbody = document.getElementById('devices-tbody');
    if (!tbody) return;

    var rows = devicesArray.map(function(device) {
      var group = deviceGroups.find(function(g) { return g.id === device.devgroup_id; });
      var groupName = device.gristHelper_Display2 || (group ? group.name : '');

      return '<tr>' +
        '<td>' + escapeHtml(device.name) + '</td>' +
        '<td>' + escapeHtml(device.brand) + '</td>' +
        '<td>' + escapeHtml(device.factoryname) + '</td>' +
        '<td>' + escapeHtml(device.unit || '') + '</td>' +
        '<td>' + escapeHtml(device.count || '') + '</td>' +
        '<td>' + escapeHtml(device.note || '') + '</td>' +
        '<td>' + escapeHtml(groupName) + '</td>' +
      '</tr>';
    }).join('');

    tbody.innerHTML = rows;
  }

  // ========================================
  // ЭКСПОРТ ПУБЛИЧНОГО API
  // ========================================

  return {
    initializeUI: initializeUI,
    setDeviceGroups: setDeviceGroups,
    setDevices: setDevices,
    setSelectedGroupId: setSelectedGroupId,
    showMessage: showMessage,
    hideMessage: hideMessage,
    updateHeader: updateHeader,
    render: render,
    clearTableBody: clearTableBody,
    renderTableBody: renderTableBody
  };
})(GristApiModule, ConfigModule);
