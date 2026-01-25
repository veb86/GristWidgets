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
    // Обработчик изменения выбора таблицы
    document.getElementById('table-select').addEventListener('change', function() {
      const selectedTableName = this.value;
      if (selectedTableName) {
        // Обновляем конфигурацию с выбранной таблицей
        const currentConfig = ConfigModule.getConfig();
        currentConfig.table = selectedTableName;
        ConfigModule.setConfig(currentConfig);
        
        // Загружаем данные и обновляем схему
        loadAndDisplaySchema(selectedTableName);
      } else {
        // Очищаем схему если таблица не выбрана
        SchemaModule.clearSchema();
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
      const tables = await grist.docApi.fetchTable('_grist_Tables');

      const tableSelect = document.getElementById('table-select');
      tableSelect.innerHTML = '<option value="">-- Выберите таблицу --</option>';

      if (tables && tables.id && Array.isArray(tables.id)) {
        for (let i = 0; i < tables.id.length; i++) {
          const id = tables.id[i];
          const name = tables.tableId[i] || 'N/A';

          // Пропустить внутренние таблицы Grist
          if (typeof name === 'string' && !name.startsWith('_grist')) {
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
   * Загрузить и отобразить схему для указанной таблицы
   * @param {string} tableName - Название таблицы
   */
  async function loadAndDisplaySchema(tableName) {
    try {
      // Загружаем данные из указанной таблицы
      const data = await DataModule.loadData(tableName);
      
      // Получаем текущую конфигурацию
      const config = ConfigModule.getConfig();
      
      // Отрисовываем схему
      SchemaModule.drawSchema(data, config);
      
      showStatusMessage(`Схема загружена из таблицы "${tableName}"`, 'success');
    } catch (error) {
      console.error('Ошибка загрузки и отображения схемы:', error);
      showStatusMessage(`Ошибка загрузки схемы: ${error.message}`, 'error');
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