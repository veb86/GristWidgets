/**
 * Главный модуль приложения
 * Управляет инициализацией и основной логикой работы виджета
 */

const App = {
  /**
   * Инициализирует приложение
   */
  async init() {
    try {
      // Ожидаем готовности Grist API
      await this.waitForGrist();

      // Сообщаем Grist что виджет готов
      grist.ready();

      // Инициализируем UI
      UIModule.init();

      // Устанавливаем обработчик кнопки
      UIModule.setButtonHandler(() => this.handleCalculatePaths());

      console.log('Виджет managerCalc успешно инициализирован');
    } catch (error) {
      console.error('Ошибка инициализации виджета:', error);
      UIModule.showStatus(
        `Ошибка инициализации: ${error.message}`,
        'error'
      );
    }
  },

  /**
   * Ожидает готовности Grist API
   * @returns {Promise<void>}
   */
  waitForGrist() {
    return new Promise((resolve) => {
      const checkGrist = () => {
        if (window.grist) {
          resolve();
        } else {
          setTimeout(checkGrist, 100);
        }
      };
      checkGrist();
    });
  },

  /**
   * Обработчик нажатия кнопки "Пересчитать пути устройств"
   */
  async handleCalculatePaths() {
    try {
      // Блокируем кнопку во время расчёта
      UIModule.disableButton();
      UIModule.hideStatus();
      UIModule.showProgress();

      // Загружаем данные из таблицы
      UIModule.updateProgress(0, 0, 0);
      const rawData = await DataModule.loadAllDevices();

      // Преобразуем данные в удобный формат
      const devices = DataModule.transformTableData(rawData);

      if (devices.length === 0) {
        UIModule.showStatus('Таблица AllDevice пуста', 'info');
        UIModule.hideProgress();
        UIModule.enableButton();
        return;
      }

      // Валидация данных
      const validation = PathCalculator.validateData(devices);

      if (!validation.isValid) {
        const errorMessage = 'Обнаружены ошибки в данных:\n' +
          validation.errors.join('\n');
        UIModule.showStatus(errorMessage, 'error');
        UIModule.hideProgress();
        UIModule.enableButton();
        console.error('Ошибки валидации:', validation.errors);
        return;
      }

      // Рассчитываем пути для всех устройств
      const updates = PathCalculator.calculateAllPaths(
        devices,
        (percent, current, total) => {
          UIModule.updateProgress(percent, current, total);
        }
      );

      // Если нет изменений
      if (updates.length === 0) {
        UIModule.showStatus(
          'Все пути уже актуальны, обновление не требуется',
          'info'
        );
        UIModule.hideProgress();
        UIModule.enableButton();
        return;
      }

      // Обновляем данные в таблице пакетами
      await this.applyUpdatesInBatches(updates);

      // Показываем сообщение об успехе
      UIModule.showStatus(
        `Успешно обновлено путей: ${updates.length} из ${devices.length}`,
        'success'
      );

      console.log(`Расчёт завершён. Обновлено записей: ${updates.length}`);
    } catch (error) {
      console.error('Ошибка при расчёте путей:', error);
      UIModule.showStatus(
        `Ошибка: ${error.message}`,
        'error'
      );
    } finally {
      // Разблокируем кнопку и скрываем прогресс
      UIModule.hideProgress();
      UIModule.enableButton();
    }
  },

  /**
   * Применяет обновления к таблице пакетами
   * @param {Array<Object>} updates - Массив обновлений
   * @returns {Promise<void>}
   */
  async applyUpdatesInBatches(updates) {
    const totalBatches = Math.ceil(updates.length / CONFIG.BATCH_SIZE);

    for (let i = 0; i < totalBatches; i++) {
      const start = i * CONFIG.BATCH_SIZE;
      const end = Math.min(start + CONFIG.BATCH_SIZE, updates.length);
      const batch = updates.slice(start, end);

      await DataModule.updateDevicePathsBatch(batch);

      // Небольшая задержка между пакетами
      if (i < totalBatches - 1) {
        await this.delay(CONFIG.UPDATE_DELAY);
      }
    }
  },

  /**
   * Создаёт задержку
   * @param {number} ms - Миллисекунды
   * @returns {Promise<void>}
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
};

// Запуск приложения при загрузке страницы
window.addEventListener('load', () => {
  App.init();
});
