/**
 * Модуль расчёта путей для устройств
 * Реализует логику построения onlyGUpath и fullpath
 */

const PathCalculator = {
  // Кэш для хранения уже рассчитанных путей
  cache: {
    onlyGUpath: new Map(),
    fullpath: new Map()
  },

  /**
   * Сбрасывает кэш расчётов
   */
  resetCache() {
    this.cache.onlyGUpath.clear();
    this.cache.fullpath.clear();
  },

  /**
   * Строит полный путь от устройства до корня иерархии
   * @param {number} deviceId - ID устройства
   * @param {Map<number, Object>} deviceMap - Словарь всех устройств
   * @returns {string} Полный путь через все родительские устройства
   */
  buildFullPath(deviceId, deviceMap) {
    // Проверка кэша
    if (this.cache.fullpath.has(deviceId)) {
      return this.cache.fullpath.get(deviceId);
    }

    const device = deviceMap.get(deviceId);

    // Если устройство не найдено
    if (!device) {
      return '';
    }

    // Если нет родителя - это корневое устройство
    if (!device.parentId) {
      const path = device.deviceName;
      this.cache.fullpath.set(deviceId, path);
      return path;
    }

    // Рекурсивно строим путь от родителя
    const parentPath = this.buildFullPath(device.parentId, deviceMap);

    // Формируем полный путь: родитель + разделитель + текущее устройство
    const fullPath = parentPath
      ? `${parentPath}${CONFIG.PATH_SEPARATOR}${device.deviceName}`
      : device.deviceName;

    // Сохраняем в кэш
    this.cache.fullpath.set(deviceId, fullPath);

    return fullPath;
  },

  /**
   * Строит путь только через устройства, которые могут быть головными
   * @param {number} deviceId - ID устройства
   * @param {Map<number, Object>} deviceMap - Словарь всех устройств
   * @returns {string} Путь через головные устройства
   */
  buildOnlyGUPath(deviceId, deviceMap) {
    // Проверка кэша
    if (this.cache.onlyGUpath.has(deviceId)) {
      return this.cache.onlyGUpath.get(deviceId);
    }

    const device = deviceMap.get(deviceId);

    // Если устройство не найдено
    if (!device) {
      return '';
    }

    // Если нет родителя - это корневое устройство
    if (!device.parentId) {
      // Добавляем только если может быть головным
      const path = device.canBeHead ? device.deviceName : '';
      this.cache.onlyGUpath.set(deviceId, path);
      return path;
    }

    // Рекурсивно строим путь от родителя
    const parentPath = this.buildOnlyGUPath(device.parentId, deviceMap);

    // Формируем путь с учётом флага canBeHead
    let onlyGUPath;

    if (device.canBeHead) {
      // Текущее устройство может быть головным - добавляем в путь
      onlyGUPath = parentPath
        ? `${parentPath}${CONFIG.PATH_SEPARATOR}${device.deviceName}`
        : device.deviceName;
    } else {
      // Текущее устройство не может быть головным - пропускаем
      onlyGUPath = parentPath;
    }

    // Сохраняем в кэш
    this.cache.onlyGUpath.set(deviceId, onlyGUPath);

    return onlyGUPath;
  },

  /**
   * Рассчитывает пути для всех устройств
   * @param {Array<Object>} devices - Массив всех устройств
   * @param {Function} progressCallback - Функция обратного вызова для прогресса
   * @returns {Array<Object>} Массив обновлений для устройств
   */
  calculateAllPaths(devices, progressCallback) {
    // Сбрасываем кэш перед началом расчёта
    this.resetCache();

    // Создаём словарь устройств для быстрого доступа
    const deviceMap = DataModule.createDeviceMap(devices);

    const updates = [];
    const totalDevices = devices.length;

    // Проходим по всем устройствам
    devices.forEach((device, index) => {
      // Рассчитываем оба пути
      const fullPath = this.buildFullPath(device.rowId, deviceMap);
      const onlyGUPath = this.buildOnlyGUPath(device.rowId, deviceMap);

      // Добавляем обновление только если пути изменились
      if (device.fullpath !== fullPath || device.onlyGUpath !== onlyGUPath) {
        updates.push({
          rowId: device.rowId,
          fullpath: fullPath,
          onlyGUpath: onlyGUPath
        });
      }

      // Вызываем callback для обновления прогресса
      if (progressCallback) {
        const progress = Math.round(((index + 1) / totalDevices) * 100);
        progressCallback(progress, index + 1, totalDevices);
      }
    });

    return updates;
  },

  /**
   * Проверяет наличие циклических зависимостей
   * @param {number} deviceId - ID устройства
   * @param {Map<number, Object>} deviceMap - Словарь всех устройств
   * @param {Set<number>} visited - Множество посещённых устройств
   * @returns {boolean} true если найден цикл
   */
  detectCycle(deviceId, deviceMap, visited = new Set()) {
    // Если уже посетили это устройство - найден цикл
    if (visited.has(deviceId)) {
      return true;
    }

    const device = deviceMap.get(deviceId);

    // Устройство не найдено или нет родителя - цикла нет
    if (!device || !device.parentId) {
      return false;
    }

    // Добавляем текущее устройство в посещённые
    visited.add(deviceId);

    // Проверяем родителя
    const hasCycle = this.detectCycle(device.parentId, deviceMap, visited);

    // Удаляем из посещённых для других веток
    visited.delete(deviceId);

    return hasCycle;
  },

  /**
   * Проверяет данные на корректность
   * @param {Array<Object>} devices - Массив устройств
   * @returns {Object} Результат валидации с ошибками
   */
  validateData(devices) {
    const errors = [];
    const deviceMap = DataModule.createDeviceMap(devices);

    devices.forEach(device => {
      // Проверка на циклические зависимости
      if (device.parentId && this.detectCycle(device.rowId, deviceMap)) {
        errors.push(
          `Обнаружена циклическая зависимость для устройства "${device.deviceName}"`
        );
      }

      // Проверка на существование родителя
      if (device.parentId && !deviceMap.has(device.parentId)) {
        errors.push(
          `Родительское устройство не найдено для "${device.deviceName}"`
        );
      }
    });

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }
};
