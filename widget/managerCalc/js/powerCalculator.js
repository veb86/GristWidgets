/**
 * Модуль расчёта мощностей для иерархических устройств
 * Реализует суммирование мощностей дочерних устройств для родительских
 */

const PowerCalculator = {
  /**
   * Создаёт словарь устройств по NMO_BaseName для быстрого доступа
   * @param {Array<Object>} devices - Массив устройств
   * @returns {Map<string, Object>} Словарь устройств
   */
  createDeviceMap(devices) {
    const deviceMap = new Map();

    devices.forEach(device => {
      if (device.nmoBaseName) {
        deviceMap.set(device.nmoBaseName, device);
      }
    });

    return deviceMap;
  },

  /**
   * Создаёт словарь дочерних устройств для каждого родительского
   * @param {Array<Object>} devices - Массив устройств
   * @returns {Map<string, Array<Object>>} Словарь дочерних устройств
   */
  createChildrenMap(devices) {
    const childrenMap = new Map();

    devices.forEach(device => {
      const parentName = device.headDeviceName;
      if (parentName) {
        if (!childrenMap.has(parentName)) {
          childrenMap.set(parentName, []);
        }
        childrenMap.get(parentName).push(device);
      }
    });

    return childrenMap;
  },

  /**
   * Рассчитывает суммарную мощность для одного устройства рекурсивно
   * @param {string} deviceName - Название устройства
   * @param {Map<string, Array<Object>>} childrenMap - Словарь дочерних устройств
   * @param {Map<string, Object>} deviceMap - Словарь всех устройств
   * @param {Set<string>} visited - Множество посещённых устройств для защиты от циклов
   * @returns {number} Суммарная мощность устройства
   */
  calculateDevicePower(deviceName, childrenMap, deviceMap, visited) {
    // Защита от циклических зависимостей
    if (visited.has(deviceName)) {
      console.warn(`Обнаружен цикл для устройства: ${deviceName}`);
      return 0;
    }

    visited.add(deviceName);

    // Получаем дочерние устройства
    const children = childrenMap.get(deviceName) || [];
    let totalPower = 0;

    // Рекурсивно суммируем мощности всех дочерних устройств
    children.forEach(child => {
      const childPower = this.calculateDevicePower(
        child.nmoBaseName,
        childrenMap,
        deviceMap,
        visited
      );
      
      // Добавляем собственную мощность дочернего устройства
      const ownPower = parseFloat(child.power) || 0;
      totalPower += childPower + ownPower;
    });

    visited.delete(deviceName);
    return totalPower;
  },

  /**
   * Рассчитывает мощности для всех устройств
   * @param {Array<Object>} devices - Массив всех устройств
   * @param {Function} progressCallback - Функция обратного вызова для прогресса
   * @returns {Array<Object>} Массив обновлений для устройств
   */
  calculateAllPowers(devices, progressCallback) {
    const deviceMap = this.createDeviceMap(devices);
    const childrenMap = this.createChildrenMap(devices);

    const updates = [];
    const totalDevices = devices.length;

    // Проходим по всем устройствам
    devices.forEach((device, index) => {
      // Рассчитываем мощность для устройства
      const visited = new Set();
      const calculatedPower = this.calculateDevicePower(
        device.nmoBaseName,
        childrenMap,
        deviceMap,
        visited
      );

      const currentPower = parseFloat(device.power) || 0;
      
      // Обновляем только если есть дочерние устройства или мощность изменилась
      const hasChildren = childrenMap.has(device.nmoBaseName);
      if (hasChildren && calculatedPower !== currentPower) {
        updates.push({
          rowId: device.rowId,
          power: calculatedPower
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
   * Проверяет данные на корректность перед расчётом мощностей
   * @param {Array<Object>} devices - Массив устройств
   * @returns {Object} Результат валидации с ошибками
   */
  validateData(devices) {
    const errors = [];
    const deviceMap = this.createDeviceMap(devices);

    devices.forEach(device => {
      // Проверка на наличие обязательных полей
      if (!device.nmoBaseName) {
        errors.push(
          `Устройство с rowId ${device.rowId} не имеет NMO_BaseName`
        );
      }

      // Проверка корректности значения мощности
      if (device.power !== null && device.power !== undefined) {
        const power = parseFloat(device.power);
        if (isNaN(power) || power < 0) {
          errors.push(
            `Устройство ${device.nmoBaseName} имеет некорректное значение мощности: ${device.power}`
          );
        }
      }

      // Проверка на существование родителя в таблице
      if (device.headDeviceName) {
        const parent = deviceMap.get(device.headDeviceName);
        if (!parent) {
          // Не считаем ошибкой, это может быть корневое устройство
          console.info(`Родительское устройство ${device.headDeviceName} не найдено в таблице`);
        }
      }
    });

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  },

  /**
   * Находит все корневые устройства (у которых нет родителя)
   * @param {Array<Object>} devices - Массив устройств
   * @returns {Array<Object>} Массив корневых устройств
   */
  findRootDevices(devices) {
    const deviceMap = this.createDeviceMap(devices);
    
    return devices.filter(device => {
      // Корневое устройство либо не имеет родителя, либо родитель не найден в таблице
      return !device.headDeviceName || !deviceMap.has(device.headDeviceName);
    });
  },

  /**
   * Получает статистику по иерархии устройств
   * @param {Array<Object>} devices - Массив устройств
   * @returns {Object} Статистика иерархии
   */
  getHierarchyStats(devices) {
    const childrenMap = this.createChildrenMap(devices);
    const rootDevices = this.findRootDevices(devices);
    
    let maxDepth = 0;
    let totalChildren = 0;

    // Рекурсивная функция для расчёта глубины
    const calculateDepth = (deviceName, visited = new Set()) => {
      if (visited.has(deviceName)) return 0;
      visited.add(deviceName);

      const children = childrenMap.get(deviceName) || [];
      if (children.length === 0) {
        visited.delete(deviceName);
        return 1;
      }

      let maxChildDepth = 0;
      children.forEach(child => {
        const childDepth = calculateDepth(child.nmoBaseName, visited);
        maxChildDepth = Math.max(maxChildDepth, childDepth);
        totalChildren++;
      });

      visited.delete(deviceName);
      return maxChildDepth + 1;
    };

    rootDevices.forEach(root => {
      const depth = calculateDepth(root.nmoBaseName);
      maxDepth = Math.max(maxDepth, depth);
    });

    return {
      totalDevices: devices.length,
      rootDevicesCount: rootDevices.length,
      maxDepth: maxDepth,
      totalChildren: totalChildren
    };
  }
};