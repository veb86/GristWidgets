/**
 * Модуль пользовательского интерфейса
 * Управляет отображением и обновлением UI элементов
 */

const UIModule = {
  // Элементы DOM
  elements: {
    calcButton: null,
    calcGroupsButton: null,
    statusMessage: null,
    progressInfo: null,
    progressFill: null,
    progressText: null
  },

  /**
   * Инициализирует элементы UI
   */
  init() {
    this.elements.calcButton = document.getElementById('calc-paths-btn');
    this.elements.calcGroupsButton = document.getElementById('calc-groups-btn');
    this.elements.statusMessage = document.getElementById('status-message');
    this.elements.progressInfo = document.getElementById('progress-info');
    this.elements.progressFill = document.getElementById('progress-fill');
    this.elements.progressText = document.getElementById('progress-text');
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
   * Блокирует кнопку расчёта путей
   */
  disableButton() {
    this.elements.calcButton.disabled = true;
  },

  /**
   * Разблокирует кнопку расчёта путей
   */
  enableButton() {
    this.elements.calcButton.disabled = false;
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
   * Блокирует обе кнопки
   */
  disableAllButtons() {
    this.disableButton();
    this.disableGroupsButton();
  },

  /**
   * Разблокирует обе кнопки
   */
  enableAllButtons() {
    this.enableButton();
    this.enableGroupsButton();
  },

  /**
   * Устанавливает обработчик клика на кнопку расчёта путей
   * @param {Function} handler - Функция-обработчик
   */
  setButtonHandler(handler) {
    this.elements.calcButton.addEventListener('click', handler);
  },

  /**
   * Устанавливает обработчик клика на кнопку расчёта групп
   * @param {Function} handler - Функция-обработчик
   */
  setGroupsButtonHandler(handler) {
    this.elements.calcGroupsButton.addEventListener('click', handler);
  }
};
