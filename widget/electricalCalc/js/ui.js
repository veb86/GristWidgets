/**
 * Модуль для управления пользовательским интерфейсом
 *
 * Отвечает за отображение панели редактирования, информационной панели,
 * статусных сообщений и других элементов UI.
 *
 * @module UIModule
 */

var UIModule = (function() {
  'use strict';

  // ========================================
  // ПРИВАТНЫЕ ПЕРЕМЕННЫЕ
  // ========================================

  /**
   * Текущие данные редактируемой записи
   */
  let currentEditData = null;

  /**
   * Обработчик сохранения изменений
   */
  let saveHandler = null;

  // ========================================
  // ЭЛЕМЕНТЫ DOM
  // ========================================

  let editPanel = null;
  let editPanelContent = null;
  let closeButton = null;
  let saveButton = null;
  let cancelButton = null;
  let statusMessage = null;
  let infoPanelContent = null;
  let tableContainer = null;

  // ========================================
  // ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
  // ========================================

  /**
   * Получить все элементы DOM
   */
  function getDOMElements() {
    editPanel = document.getElementById('edit-panel');
    editPanelContent = document.getElementById('edit-panel-content');
    closeButton = document.getElementById('close-edit-panel');
    saveButton = document.getElementById('save-edit');
    cancelButton = document.getElementById('cancel-edit');
    statusMessage = document.getElementById('status-message');
    infoPanelContent = document.getElementById('info-panel-content');
    tableContainer = document.getElementById('table-container');
  }

  /**
   * Создать поля формы для редактирования записи
   * @param {Object} data - Данные записи
   * @returns {string} HTML-код формы
   */
  function createEditForm(data) {
    let html = '';

    Object.keys(data).forEach(key => {
      // Пропускаем служебное поле id
      if (key === 'id') {
        return;
      }

      const value = data[key] || '';

      html += `
        <div class="form-group">
          <label for="edit-${key}">${key}</label>
          <input
            type="text"
            id="edit-${key}"
            class="form-control"
            data-field="${key}"
            value="${escapeHtml(String(value))}"
          />
        </div>
      `;
    });

    return html;
  }

  /**
   * Экранировать HTML для безопасного вывода
   * @param {string} text - Текст для экранирования
   * @returns {string} Экранированный текст
   */
  function escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }

  /**
   * Собрать данные из формы редактирования
   * @returns {Object} Объект с данными из формы
   */
  function collectFormData() {
    const formData = {};
    const inputs = editPanelContent.querySelectorAll('input[data-field]');

    inputs.forEach(input => {
      const field = input.getAttribute('data-field');
      formData[field] = input.value;
    });

    return formData;
  }

  // ========================================
  // ПУБЛИЧНЫЕ МЕТОДЫ
  // ========================================

  /**
   * Инициализировать UI компоненты
   */
  function initializeUI() {
    console.log('Инициализация UI...');

    getDOMElements();

    // Обработчик закрытия панели редактирования
    if (closeButton) {
      closeButton.addEventListener('click', closeEditPanel);
    }

    // Обработчик отмены редактирования
    if (cancelButton) {
      cancelButton.addEventListener('click', closeEditPanel);
    }

    // Обработчик сохранения
    if (saveButton) {
      saveButton.addEventListener('click', function() {
        if (saveHandler && currentEditData) {
          const formData = collectFormData();
          saveHandler(currentEditData, formData);
        }
      });
    }

    console.log('UI инициализирован');
  }

  /**
   * Показать панель редактирования с данными записи
   * @param {Object} data - Данные записи для редактирования
   * @param {Function} onSave - Обработчик сохранения
   */
  function showEditPanel(data, onSave) {
    if (!editPanel || !editPanelContent) {
      console.error('Элементы панели редактирования не найдены');
      return;
    }

    console.log('Открытие панели редактирования:', data);

    currentEditData = data;
    saveHandler = onSave;

    // Генерируем форму редактирования
    const formHtml = createEditForm(data);
    editPanelContent.innerHTML = formHtml;

    // Показываем панель
    editPanel.classList.add('open');

    // Сдвигаем таблицу
    if (tableContainer) {
      tableContainer.classList.add('panel-open');
    }
  }

  /**
   * Закрыть панель редактирования
   */
  function closeEditPanel() {
    if (!editPanel) {
      return;
    }

    console.log('Закрытие панели редактирования');

    // Скрываем панель
    editPanel.classList.remove('open');

    // Возвращаем таблицу на место
    if (tableContainer) {
      tableContainer.classList.remove('panel-open');
    }

    // Очищаем данные
    currentEditData = null;
    saveHandler = null;
    editPanelContent.innerHTML = '';
  }

  /**
   * Показать статусное сообщение
   * @param {string} message - Текст сообщения
   * @param {string} type - Тип сообщения (success, error, info, warning)
   * @param {number} duration - Длительность показа в мс (по умолчанию 3000)
   */
  function showStatusMessage(message, type, duration) {
    if (!statusMessage) {
      return;
    }

    duration = duration || 3000;

    // Устанавливаем текст и тип
    statusMessage.textContent = message;
    statusMessage.className = `status-message ${type}`;

    // Показываем сообщение
    statusMessage.style.display = 'block';

    // Автоматически скрываем через заданное время
    setTimeout(() => {
      hideStatusMessage();
    }, duration);
  }

  /**
   * Скрыть статусное сообщение
   */
  function hideStatusMessage() {
    if (statusMessage) {
      statusMessage.style.display = 'none';
    }
  }

  /**
   * Обновить информационную панель
   * @param {Array<Object>} data - Данные для расчёта показателей
   */
  function updateInfoPanel(data) {
    if (!infoPanelContent) {
      return;
    }

    // На этапе 1 просто показываем количество записей
    // В этапе 3 здесь будет расчёт показателей

    const itemCount = data ? data.length : 0;
    const shieldName = DataModule.getCachedShieldName() || 'не определён';

    const html = `
      <div class="info-item">
        <div class="info-item-label">Щит</div>
        <div class="info-item-value">${escapeHtml(shieldName)}</div>
      </div>
      <div class="info-item">
        <div class="info-item-label">Количество устройств</div>
        <div class="info-item-value">${itemCount}</div>
      </div>
      <div class="info-item">
        <div class="info-item-label">Расчётные показатели</div>
        <div class="info-item-value">-</div>
      </div>
    `;

    infoPanelContent.innerHTML = html;
  }

  /**
   * Очистить информационную панель
   */
  function clearInfoPanel() {
    if (infoPanelContent) {
      infoPanelContent.innerHTML = '';
    }
  }

  // ========================================
  // ЭКСПОРТ ПУБЛИЧНОГО API
  // ========================================

  return {
    initializeUI: initializeUI,
    showEditPanel: showEditPanel,
    closeEditPanel: closeEditPanel,
    showStatusMessage: showStatusMessage,
    hideStatusMessage: hideStatusMessage,
    updateInfoPanel: updateInfoPanel,
    clearInfoPanel: clearInfoPanel
  };
})();
