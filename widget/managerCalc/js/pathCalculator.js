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
   * Возвращает имя устройства для построения пути (использует NMO_BaseName если доступен)
   * @param {Object} device - Объект устройства
   * @returns {string} Имя устройства для построения пути
   */
  getDeviceNameForPath(device) {
    return device.nmoBaseName || device.deviceName;
  },

  /**
   * Сбрасывает кэш расчётов
   */
  resetCache() {
    this.cache.onlyGUpath.clear();
    this.cache.fullpath.clear();
  },

  /**
   * Получает имя родительского устройства для построения пути (без специального "root")
   * @param {number} deviceId - ID устройства
   * @param {Map<number, Object>} deviceMap - Словарь всех устройств
   * @returns {string} Имя родительского устройства для построения пути
   */
  getParentDeviceNameForPath(deviceId, deviceMap) {
    const device = deviceMap.get(deviceId);
    if (!device || !device.parentId || device.parentId === -1) {
      return null;
    }

    const parentDevice = deviceMap.get(device.parentId);
    if (!parentDevice) {
      return null;
    }

    return this.getDeviceNameForPath(parentDevice);
  },

  /**
   * Строит полный путь от устройства до корня иерархии
   * @param {number} deviceId - ID устройства
   * @param {Map<number, Object>} deviceMap - Словарь всех устройств
   * @returns {string} Полный путь через все родительские устройства
   */
  buildFullPath(deviceId, deviceMap) {
    console.log(`buildFullPath: deviceId=${deviceId}, deviceMap size=${deviceMap.size}`);

    // Проверка кэша
    if (this.cache.fullpath.has(deviceId)) {
      const cachedPath = this.cache.fullpath.get(deviceId);
      console.log(`buildFullPath: cache hit for deviceId=${deviceId}, path="${cachedPath}"`);
      return cachedPath;
    }

    const device = deviceMap.get(deviceId);

    // Если устройство не найдено
    if (!device) {
      console.log(`buildFullPath: device with id ${deviceId} not found`);
      return '';
    }

    // Используем NMO_BaseName для построения пути, если он доступен, иначе deviceName
    const deviceNameForPath = this.getDeviceNameForPath(device);
    console.log(`buildFullPath: processing device "${deviceNameForPath}", parentId=${device.parentId}`);

    // Если нет родителя (null, undefined или -1) - это корневое устройство
    if (!device.parentId || device.parentId === -1) {
      // Для корневого устройства используем специальное значение "root"
      const path = "root";
      this.cache.fullpath.set(deviceId, path);
      console.log(`buildFullPath: root device "${deviceNameForPath}", path="${path}"`);
      return path;
    }

    // Рекурсивно строим путь от родителя
    const parentPath = this.buildFullPath(device.parentId, deviceMap);

    // Формируем полный путь: родитель + разделитель + текущее устройство
    // Если родитель - корень и его путь "root", то для потомков используем настоящее имя корня
    let actualParentName = parentPath;
    if (parentPath === "root") {
      actualParentName = this.getParentDeviceNameForPath(deviceId, deviceMap);
    }

    const fullPath = actualParentName
      ? `${actualParentName}${CONFIG.PATH_SEPARATOR}${deviceNameForPath}`
      : deviceNameForPath;

    // Сохраняем в кэш
    this.cache.fullpath.set(deviceId, fullPath);
    console.log(`buildFullPath: calculated path for "${deviceNameForPath}", path="${fullPath}"`);

    return fullPath;
  },

  /**
   * Строит путь только через устройства, которые могут быть головными
   * @param {number} deviceId - ID устройства
   * @param {Map<number, Object>} deviceMap - Словарь всех устройств
   * @returns {string} Путь через головные устройства
   */
  buildOnlyGUPath(deviceId, deviceMap) {
    console.log(`buildOnlyGUPath: deviceId=${deviceId}, deviceMap size=${deviceMap.size}`);

    // Проверка кэша
    if (this.cache.onlyGUpath.has(deviceId)) {
      const cachedPath = this.cache.onlyGUpath.get(deviceId);
      console.log(`buildOnlyGUPath: cache hit for deviceId=${deviceId}, path="${cachedPath}"`);
      return cachedPath;
    }

    const device = deviceMap.get(deviceId);

    // Если устройство не найдено
    if (!device) {
      console.log(`buildOnlyGUPath: device with id ${deviceId} not found`);
      return '';
    }

    // Используем NMO_BaseName для построения пути, если он доступен, иначе deviceName
    const deviceNameForPath = this.getDeviceNameForPath(device);
    console.log(`buildOnlyGUPath: processing device "${deviceNameForPath}", parentId=${device.parentId}`);

    // Если нет родителя (null, undefined или -1) - это корневое устройство
    if (!device.parentId || device.parentId === -1) {
      // Проверяем, может ли корневое устройство быть головным
      const isHeadByDeviceName = device.headDeviceName && deviceNameForPath === device.headDeviceName;
      const canBeHead = device.canBeHead || isHeadByDeviceName;
      const path = canBeHead ? "root" : '';
      this.cache.onlyGUpath.set(deviceId, path);
      console.log(`buildOnlyGUPath: root device "${deviceNameForPath}", canBeHead=${canBeHead}, path="${path}"`);
      return path;
    }

    // Рекурсивно строим путь от родителя
    const parentPath = this.buildOnlyGUPath(device.parentId, deviceMap);

    // Получаем информацию о родительском устройстве
    const parentDevice = deviceMap.get(device.parentId);

    if (!parentDevice) {
      console.log(`buildOnlyGUPath: parent device with id ${device.parentId} not found`);
      // Если родитель не найден, возвращаем путь родителя как есть
      this.cache.onlyGUpath.set(deviceId, parentPath);
      return parentPath;
    }

    // Проверяем, может ли родитель быть головным (т.к. путь формируется до родителя текущего устройства)
    const parentIsHeadByDeviceName = parentDevice.headDeviceName && this.getDeviceNameForPath(parentDevice) === parentDevice.headDeviceName;
    const parentCanBeHead = parentDevice.canBeHead || parentIsHeadByDeviceName;

    let onlyGUPath;

    // Если родитель может быть головным, добавляем его к пути родителя
    if (parentCanBeHead) {
      // Если путь родителя "root", используем настоящее имя родителя
      if (parentPath === "root") {
        onlyGUPath = this.getDeviceNameForPath(parentDevice);
      } else {
        // Иначе добавляем имя родителя к пути
        onlyGUPath = parentPath ? `${parentPath}${CONFIG.PATH_SEPARATOR}${this.getDeviceNameForPath(parentDevice)}` : this.getDeviceNameForPath(parentDevice);
      }
    } else {
      // Если родитель не может быть головным, путь остается как у родителя
      onlyGUPath = parentPath;
    }

    console.log(`buildOnlyGUPath: для устройства "${deviceNameForPath}" (родитель "${this.getDeviceNameForPath(parentDevice)}", может быть головным: ${parentCanBeHead}), путь: "${onlyGUPath}"`);

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
    console.log(`calculateAllPaths: начали расчет путей для ${devices.length} устройств`);

    // Сбрасываем кэш перед началом расчёта
    this.resetCache();

    // Создаём словарь устройств для быстрого доступа
    const deviceMap = DataModule.createDeviceMap(devices);
    console.log(`calculateAllPaths: создан deviceMap с ${deviceMap.size} устройствами`);

    const updates = [];
    const totalDevices = devices.length;

    // Проходим по всем устройствам
    devices.forEach((device, index) => {
      console.log(`calculateAllPaths: обрабатываем устройство ${index + 1}/${totalDevices}: "${device.deviceName}", rowId=${device.rowId}`);

      // Рассчитываем оба пути
      const fullPath = this.buildFullPath(device.rowId, deviceMap);
      const onlyGUPath = this.buildOnlyGUPath(device.rowId, deviceMap);

      console.log(`calculateAllPaths: для устройства "${device.deviceName}" рассчитаны пути: fullPath="${fullPath}", onlyGUPath="${onlyGUPath}"`);
      console.log(`calculateAllPaths: текущие значения: fullpath="${device.fullpath}", onlyGUpath="${device.onlyGUpath}"`);

      // Добавляем обновление только если пути изменились
      if (device.fullpath !== fullPath || device.onlyGUpath !== onlyGUPath) {
        console.log(`calculateAllPaths: обнаружены изменения для устройства "${device.deviceName}", добавляем в обновления`);
        updates.push({
          rowId: device.rowId,
          fullpath: fullPath,
          onlyGUpath: onlyGUPath
        });
      } else {
        console.log(`calculateAllPaths: изменения для устройства "${device.deviceName}" не обнаружены`);
      }

      // Вызываем callback для обновления прогресса
      if (progressCallback) {
        const progress = Math.round(((index + 1) / totalDevices) * 100);
        progressCallback(progress, index + 1, totalDevices);
      }
    });

    console.log(`calculateAllPaths: завершён расчет, найдено ${updates.length} обновлений`);
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
    if (!device || !device.parentId || device.parentId === -1) {
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

      // Проверка на существование родителя (если parentId не равен -1)
      if (device.parentId && device.parentId !== -1 && !deviceMap.has(device.parentId)) {
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
