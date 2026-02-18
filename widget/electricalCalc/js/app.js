/**
 * Главный модуль приложения
 *
 * Этот модуль инициализирует все компоненты виджета,
 * управляет общим потоком выполнения и интеграцией с Grist.
 *
 * @module AppModule
 */

var AppModule = (function() {
  'use strict';

  // ========================================
  // ПРИВАТНЫЕ ПЕРЕМЕННЫЕ
  // ========================================

  /**
   * Флаг инициализации приложения
   */
  let initialized = false;

  // ========================================
  // ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
  // ========================================

  /**
   * Обработчик клика по строке таблицы
   * Открывает панель редактирования с данными выбранной строки
   *
   * @param {Object} rowData - Данные строки
   */
  function handleRowClick(rowData) {
    console.log('Обработка клика по строке:', rowData);

    // Открываем панель редактирования
    UIModule.showEditPanel(rowData, handleSaveEdit);
  }

  /**
   * Обработчик сохранения изменений в записи
   * В этапе 1 только логируем, в этапе 3 будет реальное сохранение
   *
   * @param {Object} originalData - Исходные данные
   * @param {Object} formData - Изменённые данные из формы
   */
  function handleSaveEdit(originalData, formData) {
    console.log('Сохранение изменений:');
    console.log('Исходные данные:', originalData);
    console.log('Новые данные:', formData);

    // TODO: Этап 3 - реализовать сохранение в Grist
    UIModule.showStatusMessage(
      'Сохранение данных будет реализовано в этапе 3',
      'info'
    );

    // Закрываем панель редактирования
    UIModule.closeEditPanel();
  }

  /**
   * Загрузить и отобразить данные в таблице
   */
  async function loadAndDisplayData() {
    try {
      console.log('Загрузка и отображение данных...');

      // Показываем статус загрузки
      UIModule.showStatusMessage('Загрузка данных...', 'info', 10000);

      // Загружаем отфильтрованные данные
      const data = await DataModule.loadFilteredData();

      // Обновляем таблицу
      TableModule.updateTableData(data);

      // Обновляем информационную панель
      UIModule.updateInfoPanel(data);

      // Скрываем статус загрузки
      UIModule.hideStatusMessage();

      // Показываем успешное сообщение
      const shieldName = DataModule.getCachedShieldName();
      const message = shieldName
        ? `Загружено ${data.length} записей для щита "${shieldName}"`
        : data.length > 0
          ? `Загружено ${data.length} записей`
          : 'Данные не найдены';

      UIModule.showStatusMessage(message, 'success');

      console.log('Данные успешно загружены и отображены');
    } catch (error) {
      console.error('Ошибка при загрузке данных:', error);

      // Показываем сообщение об ошибке
      UIModule.showStatusMessage(
        `Ошибка загрузки данных: ${error.message}`,
        'error',
        10000  // Увеличиваем время отображения ошибки
      );

      // Показываем пустую таблицу
      TableModule.updateTableData([]);
      UIModule.clearInfoPanel();

      // Не продолжаем выполнение, оставляем сообщение об ошибке
    }
  }

  /**
   * Обработчик изменения записей в Grist
   * Вызывается автоматически при изменении данных
   *
   * @param {Array} records - Массив записей
   * @param {Object} mapping - Маппинг колонок
   */
  function handleRecordsUpdate(records, mapping) {
    console.log('Обновление записей от Grist:', records.length);

    // Перезагружаем данные
    loadAndDisplayData();
  }

  /**
   * Обработчик изменения опций виджета
   * Вызывается при изменении настроек виджета
   *
   * @param {Object} options - Новые опции
   */
  function handleOptionsChange(options) {
    console.log('Изменение опций виджета:', options);

    // Обновляем конфигурацию
    ConfigModule.setConfig(options);

    // Перезагружаем данные
    loadAndDisplayData();
  }

  // ========================================
  // ПУБЛИЧНЫЕ МЕТОДЫ
  // ========================================

  /**
   * Инициализировать приложение
   */
  async function initializeApp() {
    // Проверяем, не была ли уже выполнена инициализация
    if (initialized) {
      console.warn('Приложение уже инициализировано');
      return;
    }

    console.log('Инициализация виджета электрических расчётов...');

    try {
      // Инициализируем UI компоненты
      UIModule.initializeUI();

      // Инициализируем таблицу с обработчиком клика
      TableModule.initializeTable('table-container', handleRowClick);

      // Инициализируем Grist API
      grist.ready({
        requiredAccess: 'full',
        onEditOptions: handleOptionsChange
      });

      // Подписываемся на изменения записей
      grist.onRecords(handleRecordsUpdate);

      // Загружаем начальные данные с небольшой задержкой
      // Это даёт Grist время для полной инициализации
      setTimeout(async () => {
        await loadAndDisplayData();
      }, 500);

      initialized = true;

      console.log('Виджет успешно инициализирован');
    } catch (error) {
      console.error('Ошибка инициализации виджета:', error);

      UIModule.showStatusMessage(
        `Ошибка инициализации: ${error.message}`,
        'error',
        5000
      );
    }
  }

  /**
   * Обновить данные вручную
   * Публичный метод для принудительного обновления данных
   */
  function refreshData() {
    console.log('Принудительное обновление данных...');

    // Очищаем кэш
    DataModule.clearCache();

    // Перезагружаем данные
    loadAndDisplayData();
  }

  // ========================================
  // ЭКСПОРТ ПУБЛИЧНОГО API
  // ========================================

  return {
    initializeApp: initializeApp,
    refreshData: refreshData
  };
})();

// ========================================
// ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ DOM
// ========================================

/**
 * Автоматическая инициализация приложения при загрузке DOM
 */
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM загружен, запускаем инициализацию...');
  AppModule.initializeApp();
});
