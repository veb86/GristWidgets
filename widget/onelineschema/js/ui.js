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
   * Показать модальное окно с генератором схемы
   * @param {string} shieldName - Имя щита
   */
  async function showGeneratorModal(shieldName) {
    try {
      // Получаем уникальные группы из таблицы alldevgroup
      const uniqueGroups = await DataModule.getUniqueGroupsFromAllDevGroup(shieldName);

      // Создаем модальное окно
      const modalHtml = createGeneratorModalHtml(shieldName, uniqueGroups);

      // Добавляем модальное окно в DOM
      let modalContainer = document.getElementById('generator-modal');
      if (!modalContainer) {
        modalContainer = document.createElement('div');
        modalContainer.id = 'generator-modal';
        document.body.appendChild(modalContainer);
      }

      modalContainer.innerHTML = modalHtml;
      modalContainer.style.display = 'block';

      // Добавляем обработчик для кнопки генерации
      const generateBtn = document.getElementById('generate-schema-btn');
      if (generateBtn) {
        generateBtn.addEventListener('click', function() {
          handleGenerateSchema(shieldName, uniqueGroups);
        });
      }

      // Добавляем обработчик для кнопки закрытия
      const closeBtn = document.getElementById('close-modal-btn');
      if (closeBtn) {
        closeBtn.addEventListener('click', function() {
          closeGeneratorModal();
        });
      }
    } catch (error) {
      console.error('Ошибка показа модального окна генератора:', error);
      showStatusMessage(`Ошибка: ${error.message}`, 'error');
    }
  }

  /**
   * Создать HTML для модального окна генератора
   * @param {string} shieldName - Имя щита
   * @param {Array} uniqueGroups - Массив уникальных групп
   * @returns {string} HTML код модального окна
   */
  function createGeneratorModalHtml(shieldName, uniqueGroups) {
    let fieldsHtml = '';

    if (uniqueGroups && uniqueGroups.length > 0) {
      fieldsHtml = uniqueGroups.map((group, index) => `
        <div class="form-group">
          <label for="group-field-${index}" class="form-label">${group}</label>
          <input
            type="text"
            id="group-field-${index}"
            class="form-control"
            placeholder="Введите значение для ${group}"
            data-group="${group}"
          />
        </div>
      `).join('');
    } else {
      fieldsHtml = '<p class="text-muted">Группы не найдены в таблице alldevgroup</p>';
    }

    return `
      <div class="modal-overlay">
        <div class="modal-content">
          <div class="modal-header">
            <h3>Генератор схемы для щита: ${shieldName || 'Не указан'}</h3>
            <button id="close-modal-btn" class="btn-close" aria-label="Закрыть">&times;</button>
          </div>
          <div class="modal-body">
            <p class="alert alert-info">
              Таблица schema пуста. Заполните поля ниже для генерации схемы.
            </p>
            ${fieldsHtml}
          </div>
          <div class="modal-footer">
            <button id="generate-schema-btn" class="btn btn-primary">Сгенерировать схему</button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Обработать генерацию схемы
   * @param {string} shieldName - Имя щита
   * @param {Array} uniqueGroups - Массив уникальных групп
   */
  function handleGenerateSchema(shieldName, uniqueGroups) {
    try {
      // Собираем значения из полей ввода
      const values = {};

      uniqueGroups.forEach((group, index) => {
        const input = document.getElementById(`group-field-${index}`);
        if (input) {
          values[group] = input.value.trim();
        }
      });

      console.log('Генерация схемы с параметрами:', values);

      // TODO: Здесь должна быть логика генерации и добавления данных в таблицу schema
      // Пока просто показываем сообщение об успехе

      showStatusMessage('Схема сгенерирована успешно!', 'success');
      closeGeneratorModal();

      // Перезагружаем схему
      setTimeout(() => {
        if (window.AppModule && typeof window.AppModule.updateSchema === 'function') {
          window.AppModule.updateSchema();
        }
      }, 500);
    } catch (error) {
      console.error('Ошибка генерации схемы:', error);
      showStatusMessage(`Ошибка генерации: ${error.message}`, 'error');
    }
  }

  /**
   * Закрыть модальное окно генератора
   */
  function closeGeneratorModal() {
    const modalContainer = document.getElementById('generator-modal');
    if (modalContainer) {
      modalContainer.style.display = 'none';
      modalContainer.innerHTML = '';
    }
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
    showStatusMessage: showStatusMessage,
    showGeneratorModal: showGeneratorModal,
    closeGeneratorModal: closeGeneratorModal
  };
})(DataModule, SchemaModule, ConfigModule);