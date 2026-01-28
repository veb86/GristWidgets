/**
 * Модуль для работы с пользовательским интерфейсом
 *
 * Этот модуль отвечает за отображение данных, обработку событий и взаимодействие с пользователем.
 *
 * @module UIModule
 */

var UIModule = (function(DataModule, SchemaModule, ConfigModule) {
  'use strict';

  // ========================================
  // ПРИВАТНЫЕ ПЕРЕМЕННЫЕ
  // ========================================

  // ========================================
  // ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
  // ========================================

  /**
   * Показать сообщение статуса
   * @param {string} message - Сообщение
   * @param {string} type - Тип сообщения (success, error, warning, info)
   */
  function showStatusMessage(message, type) {
    const statusMessage = document.getElementById('status-message');
    if (!statusMessage) return;
    
    let className = 'status-message ';
    switch(type) {
      case 'success':
        className += 'status-success';
        break;
      case 'error':
        className += 'status-error';
        break;
      default:
        className += 'status-success';
    }
    
    statusMessage.className = className;
    statusMessage.textContent = message;
    statusMessage.style.display = 'block';

    // Автоматически скрыть сообщения успеха через 3 секунды
    if (type === 'success') {
      setTimeout(() => {
        statusMessage.style.display = 'none';
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
    console.log('UI инициализирован');
  }

  /**
   * Загрузить список доступных таблиц
   */
  async function loadTables() {
    try {
      // Получаем список таблиц из Grist
      const tables = await grist.docApi.getTables();

      console.log('Доступные таблицы:', tables);

      // Возвращаем только имена таблиц
      return tables.map(table => table.id);
    } catch (error) {
      console.error('Ошибка загрузки списка таблиц:', error);
      throw error;
    }
  }

  /**
   * Загрузить и отобразить схему для выбранной таблицы
   */
  async function loadAndDisplaySchema() {
    const config = ConfigModule.getConfig();
    const tableName = config.table || 'schema';

    try {
      // Загружаем данные из указанной таблицы
      const data = await DataModule.loadData(tableName);

      // Отрисовываем схему
      SchemaModule.drawSchema(data, config);

      showStatusMessage(`Схема загружена из таблицы "${tableName}"`, 'success');
    } catch (error) {
      console.error('Ошибка загрузки и отображения схемы:', error);
      showStatusMessage(`Ошибка загрузки схемы: ${error.message}`, 'error');
      
      // Если таблица не найдена, показываем доступные таблицы
      if (error.message.includes('не найдена')) {
        try {
          const availableTables = await DataModule.getAvailableTables();
          if (availableTables.length > 0) {
            showStatusMessage(`Доступные таблицы: ${availableTables.join(', ')}`, 'info');
          } else {
            showStatusMessage('В документе нет таблиц для отображения', 'warning');
          }
        } catch (listError) {
          console.error('Ошибка получения списка таблиц:', listError);
        }
      }
    }
  }

  // ========================================
  // ЭКСПОРТ ПУБЛИЧНОГО API
  // ========================================

  return {
    initializeUI: initializeUI,
    loadTables: loadTables,
    loadAndDisplaySchema: loadAndDisplaySchema,
    showStatusMessage: showStatusMessage
  };
})(DataModule, SchemaModule, ConfigModule);