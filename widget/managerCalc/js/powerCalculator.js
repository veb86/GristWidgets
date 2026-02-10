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
        // Сохраняем только первое устройство с таким именем
        // Остальные дубликаты игнорируем для предотвращения конфликтов
        if (!deviceMap.has(device.nmoBaseName)) {
          deviceMap.set(device.nmoBaseName, device);
        }
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
   * Рассчитывает суммарную мощность для одного устройства (только прямые дочерние)
   * @param {string} deviceName - Название устройства
   * @param {Map<string, Array<Object>>} childrenMap - Словарь дочерних устройств
   * @param {Map<string, Object>} deviceMap - Словарь всех устройств
   * @returns {number} Суммарная мощность устройства
   */
  calculateDevicePower(deviceName, childrenMap, deviceMap) {
    // Получаем прямые дочерние устройства
    const children = childrenMap.get(deviceName) || [];
    let totalPower = 0;

    // Суммируем мощности только прямых дочерних устройств
    children.forEach(child => {
      const ownPower = parseFloat(child.power) || 0;
      totalPower += ownPower;
    });
    
    // Округляем результат до 3 знаков после запятой
    return Math.round(totalPower * 1000) / 1000;
  },

  /**
   * Рассчитывает мощности для всех устройств с многопроходным алгоритмом
   * @param {Array<Object>} devices - Массив всех устройств
   * @param {Function} progressCallback - Функция обратного вызова для прогресса
   * @returns {Array<Object>} Массив обновлений для устройств
   */
  calculateAllPowers(devices, progressCallback) {
    let currentData = [...devices];
    let allUpdates = [];
    let passCount = 0;
    const maxPasses = 10; // Защита от бесконечных циклов
    let totalUpdates = 0;

    // Многопроходный расчёт до стабилизации
    while (passCount < maxPasses) {
      const deviceMap = this.createDeviceMap(currentData);
      const childrenMap = this.createChildrenMap(currentData);

      const updates = [];
      const totalDevices = currentData.length;

      // Проходим по всем устройствам
      currentData.forEach((device, index) => {
        const currentPower = parseFloat(device.power) || 0;
        const hasChildren = childrenMap.has(device.nmoBaseName);
        
        if (hasChildren) {
          // Рассчитываем мощность для устройств с дочерними устройствами
          const calculatedPower = this.calculateDevicePower(
            device.nmoBaseName,
            childrenMap,
            deviceMap
          );

          // Обновляем только если мощность изменилась
          if (Math.abs(calculatedPower - currentPower) > 0.001) {
            updates.push({
              rowId: device.rowId,
              power: calculatedPower
            });
          }
        }

        // Вызываем callback для обновления прогресса
        if (progressCallback) {
          const totalProgress = Math.min(((totalUpdates + index + 1) / (totalDevices * maxPasses)) * 100, 100);
          const currentCount = totalUpdates + index + 1;
          const totalExpected = totalDevices * maxPasses;
          progressCallback(Math.round(totalProgress), currentCount, totalExpected);
        }
      });

      // Если нет обновлений, достигли стабилизации
      if (updates.length === 0) {
        break;
      }

      // Применяем обновления к данным для следующего прохода
      updates.forEach(update => {
        const deviceIndex = currentData.findIndex(d => d.rowId === update.rowId);
        if (deviceIndex !== -1) {
          currentData[deviceIndex].power = update.power;
        }
      });

      allUpdates = allUpdates.concat(updates);
      totalUpdates += updates.length;
      passCount++;

      console.log(`Pass ${passCount}: ${updates.length} updates applied`);
    }

    // Финальный вызов прогресса с корректными значениями
    if (progressCallback) {
      progressCallback(100, totalUpdates, totalUpdates);
    }

    console.log(`Multi-pass calculation completed: ${passCount} passes, ${totalUpdates} total updates`);
    
    // Возвращаем только уникальные обновления (последние значения для каждого устройства)
    const uniqueUpdates = {};
    allUpdates.forEach(update => {
      uniqueUpdates[update.rowId] = update;
    });

    return Object.values(uniqueUpdates);
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