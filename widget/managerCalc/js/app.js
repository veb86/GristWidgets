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

      // Сообщаем Grist что виджет готов с требуемым уровнем доступа
      grist.ready({
        requiredAccess: 'full',
        columns: []
      });

      // Инициализируем UI
      UIModule.init();

      // Устанавливаем обработчики кнопок
      UIModule.setButtonHandler(() => this.handleCalculatePaths());
      UIModule.setGroupsButtonHandler(() => this.handleCalculateGroups());
      UIModule.setPowerButtonHandler(() => this.handleCalculatePower());

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
      console.log('handleCalculatePaths: начало обработки');

      // Блокируем обе кнопки во время расчёта
      UIModule.disableAllButtons();
      UIModule.hideStatus();
      UIModule.showProgress();

      // Загружаем данные из таблицы
      UIModule.updateProgress(0, 0, 0);
      console.log('handleCalculatePaths: загрузка данных из таблицы...');
      const rawData = await DataModule.loadAllDevices();
      console.log('handleCalculatePaths: данные загружены, количество записей:', rawData?.id?.length || 0);

      // Преобразуем данные в удобный формат
      console.log('handleCalculatePaths: преобразование данных...');
      const devices = DataModule.transformTableData(rawData);
      console.log('handleCalculatePaths: преобразование завершено, количество устройств:', devices.length);

      if (devices.length === 0) {
        console.log('handleCalculatePaths: таблица пуста');
        UIModule.showStatus('Таблица AllDevice пуста', 'info');
        UIModule.hideProgress();
        UIModule.enableAllButtons();
        return;
      }

      // Валидация данных
      console.log('handleCalculatePaths: валидация данных...');
      const validation = PathCalculator.validateData(devices);

      if (!validation.isValid) {
        const errorMessage = 'Обнаружены ошибки в данных:\n' +
          validation.errors.join('\n');
        UIModule.showStatus(errorMessage, 'error');
        UIModule.hideProgress();
        UIModule.enableAllButtons();
        console.error('Ошибки валидации:', validation.errors);
        return;
      }

      console.log('handleCalculatePaths: валидация прошла успешно');

      // Рассчитываем пути для всех устройств
      console.log('handleCalculatePaths: начало расчета путей...');
      const updates = PathCalculator.calculateAllPaths(
        devices,
        (percent, current, total) => {
          console.log(`handleCalculatePaths: прогресс расчета - ${percent}% (${current}/${total})`);
          UIModule.updateProgress(percent, current, total);
        }
      );
      console.log('handleCalculatePaths: расчет завершен, найдено обновлений:', updates.length);

      // Если нет изменений
      if (updates.length === 0) {
        console.log('handleCalculatePaths: нет изменений для обновления');
        UIModule.showStatus(
          'Все пути уже актуальны, обновление не требуется',
          'info'
        );
        UIModule.hideProgress();
        UIModule.enableAllButtons();
        return;
      }

      // Обновляем данные в таблице пакетами
      console.log('handleCalculatePaths: применение обновлений...');
      await this.applyUpdatesInBatches(updates);
      console.log('handleCalculatePaths: обновления применены');

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
      // Разблокируем кнопки и скрываем прогресс
      UIModule.hideProgress();
      UIModule.enableAllButtons();
      console.log('handleCalculatePaths: завершение обработки');
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
   * Обработчик нажатия кнопки "Заполнить электрические группы"
   */
  async handleCalculateGroups() {
    try {
      // Блокируем обе кнопки во время расчёта
      UIModule.disableAllButtons();
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
        UIModule.enableAllButtons();
        return;
      }

      // Валидация данных
      const validation = GroupCalculator.validateData(devices);

      if (!validation.isValid) {
        const errorMessage = 'Обнаружены ошибки в данных:\n' +
          validation.errors.join('\n');
        UIModule.showStatus(errorMessage, 'error');
        UIModule.hideProgress();
        UIModule.enableAllButtons();
        console.error('Ошибки валидации:', validation.errors);
        return;
      }

      // Рассчитываем группы для всех устройств
      const updates = GroupCalculator.calculateAllGroups(
        devices,
        (percent, current, total) => {
          UIModule.updateProgress(percent, current, total);
        }
      );

      // Если нет изменений
      if (updates.length === 0) {
        UIModule.showStatus(
          'Все группы уже актуальны, обновление не требуется',
          'info'
        );
        UIModule.hideProgress();
        UIModule.enableAllButtons();
        return;
      }

      // Обновляем данные в таблице пакетами
      await this.applyGroupUpdatesInBatches(updates);

      // Показываем сообщение об успехе
      UIModule.showStatus(
        `Успешно обновлено групп: ${updates.length} из ${devices.length}`,
        'success'
      );

      console.log(`Расчёт групп завершён. Обновлено записей: ${updates.length}`);
    } catch (error) {
      console.error('Ошибка при расчёте групп:', error);
      UIModule.showStatus(
        `Ошибка: ${error.message}`,
        'error'
      );
    } finally {
      // Разблокируем кнопки и скрываем прогресс
      UIModule.hideProgress();
      UIModule.enableAllButtons();
    }
  },

  /**
   * Применяет обновления групп к таблице пакетами
   * @param {Array<Object>} updates - Массив обновлений
   * @returns {Promise<void>}
   */
  async applyGroupUpdatesInBatches(updates) {
    const totalBatches = Math.ceil(updates.length / CONFIG.BATCH_SIZE);

    for (let i = 0; i < totalBatches; i++) {
      const start = i * CONFIG.BATCH_SIZE;
      const end = Math.min(start + CONFIG.BATCH_SIZE, updates.length);
      const batch = updates.slice(start, end);

      await DataModule.updateDeviceGroupsBatch(batch);

      // Небольшая задержка между пакетами
      if (i < totalBatches - 1) {
        await this.delay(CONFIG.UPDATE_DELAY);
      }
    }
  },

  /**
   * Обработчик нажатия кнопки "Рассчитать мощности"
   */
  async handleCalculatePower() {
    try {
      console.log('handleCalculatePower: начало обработки');

      // Блокируем все кнопки во время расчёта
      UIModule.disableAllButtons();
      UIModule.hideStatus();
      UIModule.showProgress();

      // Загружаем данные из таблицы
      UIModule.updateProgress(0, 0, 0);
      console.log('handleCalculatePower: загрузка данных из таблицы...');
      const rawData = await DataModule.loadAllDevices();
      console.log('handleCalculatePower: данные загружены, количество записей:', rawData?.id?.length || 0);

      // Преобразуем данные в удобный формат
      console.log('handleCalculatePower: преобразование данных...');
      const devices = DataModule.transformTableData(rawData);
      console.log('handleCalculatePower: преобразование завершено, количество устройств:', devices.length);

      if (devices.length === 0) {
        console.log('handleCalculatePower: таблица пуста');
        UIModule.showStatus('Таблица пуста', 'info');
        UIModule.hideProgress();
        UIModule.enableAllButtons();
        return;
      }

      // Валидация данных
      console.log('handleCalculatePower: валидация данных...');
      const validation = PowerCalculator.validateData(devices);

      if (!validation.isValid) {
        const errorMessage = 'Обнаружены ошибки в данных:\n' +
          validation.errors.join('\n');
        UIModule.showStatus(errorMessage, 'error');
        UIModule.hideProgress();
        UIModule.enableAllButtons();
        console.error('Ошибки валидации:', validation.errors);
        return;
      }

      console.log('handleCalculatePower: валидация прошла успешно');

      // Получаем статистику иерархии
      const stats = PowerCalculator.getHierarchyStats(devices);
      console.log('handleCalculatePower: статистика иерархии:', stats);

      // Рассчитываем мощности для всех устройств
      console.log('handleCalculatePower: начало расчета мощностей...');
      const updates = PowerCalculator.calculateAllPowers(
        devices,
        (percent, current, total) => {
          console.log(`handleCalculatePower: прогресс расчета - ${percent}% (${current}/${total})`);
          UIModule.updateProgress(percent, current, total);
        }
      );
      console.log('handleCalculatePower: расчет завершен, найдено обновлений:', updates.length);

      // Если нет изменений
      if (updates.length === 0) {
        console.log('handleCalculatePower: нет изменений для обновления');
        UIModule.showStatus(
          'Все мощности уже актуальны, обновление не требуется',
          'info'
        );
        UIModule.hideProgress();
        UIModule.enableAllButtons();
        return;
      }

      // Обновляем данные в таблице пакетами
      console.log('handleCalculatePower: применение обновлений...');
      await this.applyPowerUpdatesInBatches(updates);
      console.log('handleCalculatePower: обновления применены');

      // Показываем сообщение об успехе
      UIModule.showStatus(
        `Успешно обновлено мощностей: ${updates.length} из ${devices.length}`,
        'success'
      );

      console.log(`Расчёт мощностей завершён. Обновлено записей: ${updates.length}`);
    } catch (error) {
      console.error('Ошибка при расчёте мощностей:', error);
      UIModule.showStatus(
        `Ошибка: ${error.message}`,
        'error'
      );
    } finally {
      // Разблокируем кнопки и скрываем прогресс
      UIModule.hideProgress();
      UIModule.enableAllButtons();
      console.log('handleCalculatePower: завершение обработки');
    }
  },

  /**
   * Применяет обновления мощностей к таблице пакетами
   * @param {Array<Object>} updates - Массив обновлений
   * @returns {Promise<void>}
   */
  async applyPowerUpdatesInBatches(updates) {
    const totalBatches = Math.ceil(updates.length / CONFIG.BATCH_SIZE);

    for (let i = 0; i < totalBatches; i++) {
      const start = i * CONFIG.BATCH_SIZE;
      const end = Math.min(start + CONFIG.BATCH_SIZE, updates.length);
      const batch = updates.slice(start, end);

      await DataModule.updateDevicePowerBatch(batch);

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
