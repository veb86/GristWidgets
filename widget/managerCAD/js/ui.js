/**
 * Модуль пользовательского интерфейса
 * Управляет отображением и обновлением UI элементов
 */

const UIModule = {
  // Элементы DOM
  elements: {
    sendInsertDevButton: null,
    calcGroupsButton: null,
    calcPowerButton: null,
    statusMessage: null,
    progressInfo: null,
    progressFill: null,
    progressText: null,
    jsonOutput: null,
    jsonContent: null
  },

  /**
   * Инициализирует элементы UI
   */
  init() {
    this.elements.sendInsertDevButton = document.getElementById('send-insert-dev-btn');
    this.elements.calcGroupsButton = document.getElementById('calc-groups-btn');
    this.elements.calcPowerButton = document.getElementById('calc-power-btn');
    this.elements.statusMessage = document.getElementById('status-message');
    this.elements.progressInfo = document.getElementById('progress-info');
    this.elements.progressFill = document.getElementById('progress-fill');
    this.elements.progressText = document.getElementById('progress-text');
    this.elements.jsonOutput = document.getElementById('json-output');
    this.elements.jsonContent = document.getElementById('json-content');
  },

  /**
   * Показывает сообщение о статусе
   * @param {string} message - Текст сообщения
   * @param {string} type - Тип сообщения (success, error, info)
   */
  showStatus(message, type = 'info') {
    const statusEl = this.elements.statusMessage;

    statusEl.textContent = message;
    statusEl.className = `status-message ${type}`;
    statusEl.style.display = 'block';
  },

  /**
   * Скрывает сообщение о статусе
   */
  hideStatus() {
    this.elements.statusMessage.style.display = 'none';
  },

  /**
   * Показывает индикатор прогресса
   */
  showProgress() {
    this.elements.progressInfo.style.display = 'block';
    this.updateProgress(0, 0, 0);
  },

  /**
   * Скрывает индикатор прогресса
   */
  hideProgress() {
    this.elements.progressInfo.style.display = 'none';
  },

  /**
   * Обновляет индикатор прогресса
   * @param {number} percent - Процент выполнения (0-100)
   * @param {number} current - Текущий элемент
   * @param {number} total - Всего элементов
   */
  updateProgress(percent, current, total) {
    this.elements.progressFill.style.width = `${percent}%`;
    this.elements.progressText.textContent =
      `Обработано: ${current} из ${total} (${percent}%)`;
  },

  /**
   * Блокирует кнопку отправки INSERT_DEV
   */
  disableSendInsertDevButton() {
    this.elements.sendInsertDevButton.disabled = true;
  },

  /**
   * Разблокирует кнопку отправки INSERT_DEV
   */
  enableSendInsertDevButton() {
    this.elements.sendInsertDevButton.disabled = false;
  },

  /**
   * Блокирует кнопку расчёта групп
   */
  disableGroupsButton() {
    this.elements.calcGroupsButton.disabled = true;
  },

  /**
   * Разблокирует кнопку расчёта групп
   */
  enableGroupsButton() {
    this.elements.calcGroupsButton.disabled = false;
  },

  /**
   * Блокирует кнопку расчёта мощностей
   */
  disablePowerButton() {
    this.elements.calcPowerButton.disabled = true;
  },

  /**
   * Разблокирует кнопку расчёта мощностей
   */
  enablePowerButton() {
    this.elements.calcPowerButton.disabled = false;
  },

  /**
   * Блокирует все кнопки
   */
  disableAllButtons() {
    this.disableSendInsertDevButton();
    this.disableGroupsButton();
    this.disablePowerButton();
  },

  /**
   * Разблокирует все кнопки
   */
  enableAllButtons() {
    this.enableSendInsertDevButton();
    this.enableGroupsButton();
    this.enablePowerButton();
  },

  /**
   * Устанавливает обработчик клика на кнопку отправки INSERT_DEV
   * @param {Function} handler - Функция-обработчик
   */
  setSendInsertDevButtonHandler(handler) {
    this.elements.sendInsertDevButton.addEventListener('click', handler);
  },

  /**
   * Устанавливает обработчик клика на кнопку расчёта групп
   * @param {Function} handler - Функция-обработчик
   */
  setGroupsButtonHandler(handler) {
    this.elements.calcGroupsButton.addEventListener('click', handler);
  },

  /**
   * Устанавливает обработчик клика на кнопку расчёта мощностей
   * @param {Function} handler - Функция-обработчик
   */
  setPowerButtonHandler(handler) {
    this.elements.calcPowerButton.addEventListener('click', handler);
  },

  /**
   * Показывает JSON в окне вывода
   * @param {Object} jsonData - Объект JSON для отображения
   */
  showJsonOutput(jsonData) {
    const jsonString = JSON.stringify(jsonData, null, 2);
    this.elements.jsonContent.textContent = jsonString;
    this.elements.jsonOutput.style.display = 'block';
  },

  /**
   * Скрывает окно вывода JSON
   */
  hideJsonOutput() {
    this.elements.jsonOutput.style.display = 'none';
  }
};
