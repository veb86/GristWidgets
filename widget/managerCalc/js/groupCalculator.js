/**
 * Модуль расчёта электрических групп для устройств
 * Определяет принадлежность устройства к группам трёх уровней
 */

const GroupCalculator = {
  /**
   * Разбивает путь onlyGUpath на массив устройств
   * @param {string} onlyGUpath - Путь через головные устройства
   * @returns {Array<string>} Массив названий устройств
   */
  parseOnlyGUPath(onlyGUpath) {
    if (!onlyGUpath || onlyGUpath.trim() === '') {
      return [];
    }
    return onlyGUpath.split(CONFIG.PATH_SEPARATOR).map(item => item.trim());
  },

  /**
   * Определяет, является ли родитель последним элементом в onlyGUpath
   * @param {string} parentName - Название родителя
   * @param {Array<string>} pathElements - Массив элементов пути
   * @returns {boolean} true если родитель — последний в пути
   */
  isLastInPath(parentName, pathElements) {
    if (pathElements.length === 0) {
      return false;
    }
    const lastElement = pathElements[pathElements.length - 1];
    return lastElement === parentName;
  },

  /**
   * Проверяет, входит ли устройство в цепочку onlyGUpath
   * @param {string} deviceName - Название устройства
   * @param {Array<string>} pathElements - Массив элементов пути
   * @returns {boolean} true если устройство есть в пути
   */
  isInPath(deviceName, pathElements) {
    return pathElements.includes(deviceName);
  },

  /**
   * Ищет устройство по его NMO_BaseName
   * @param {string} baseName - Уникальное имя устройства
   * @param {Map<string, Object>} devicesByBaseName - Словарь устройств по NMO_BaseName
   * @returns {Object|null} Найденное устройство или null
   */
  findDeviceByBaseName(baseName, devicesByBaseName) {
    return devicesByBaseName.get(baseName) || null;
  },

  /**
   * Получает NGHeadDevice для устройства по его имени
   * @param {string} deviceName - Название устройства
   * @param {Map<string, Object>} devicesByBaseName - Словарь устройств
   * @returns {string} Значение NGHeadDevice или пустая строка
   */
  getHeadGroup(deviceName, devicesByBaseName) {
    const device = this.findDeviceByBaseName(deviceName, devicesByBaseName);
    return device ? (device.ngHeadDevice || '') : '';
  },

  /**
   * Получает родителя устройства по HeadDeviceName
   * @param {string} deviceName - Название устройства
   * @param {Map<string, Object>} devicesByBaseName - Словарь устройств
   * @returns {string} Название родителя или пустая строка
   */
  getParentName(deviceName, devicesByBaseName) {
    const device = this.findDeviceByBaseName(deviceName, devicesByBaseName);
    return device ? (device.headDeviceName || '') : '';
  },

  /**
   * Рассчитывает уровни электрических групп для одного устройства
   * @param {Object} device - Объект устройства
   * @param {Map<string, Object>} devicesByBaseName - Словарь всех устройств
   * @returns {Object} Объект с уровнями {level1, level2, level3}
   */
  calculateLevelsForDevice(device, devicesByBaseName) {
    const levels = {
      level1: '',
      level2: '',
      level3: ''
    };

    // Разбираем onlyGUpath на элементы
    const pathElements = this.parseOnlyGUPath(device.onlyGUpath);

    // Начинаем подъём по родителям
    let currentParent = device.headDeviceName;
    let levelIndex = 3; // Начинаем с 3level (самый близкий к устройству)

    // Поднимаемся не более чем на 3 уровня
    let stepsCount = 0;
    const MAX_STEPS = 3;

    while (currentParent && stepsCount < MAX_STEPS) {
      // Проверяем, является ли текущий родитель последним в onlyGUpath
      if (this.isLastInPath(currentParent, pathElements)) {
        // Это верхняя разрешённая группа
        const headGroup = this.getHeadGroup(currentParent, devicesByBaseName);
        levels.level1 = headGroup;
        // Останавливаем дальнейший подъём
        break;
      }

      // Проверяем, существует ли родитель в списке устройств
      const parentDevice = this.findDeviceByBaseName(currentParent, devicesByBaseName);
      if (!parentDevice) {
        // Родительское устройство не найдено, значит мы достигли верхнего узла root
        // В этом случае 1level принимает значение NGHeadDevice текущего устройства
        levels.level1 = device.ngHeadDevice || '';
        break;
      }

      // Родитель существует, продолжаем обработку
      // Берём его NGHeadDevice и записываем в соответствующий уровень
      const headGroup = this.getHeadGroup(currentParent, devicesByBaseName);

      if (headGroup) {
        // Записываем в уровень (снизу вверх: 3, 2, 1)
        if (levelIndex === 3) {
          levels.level3 = headGroup;
          levelIndex = 2;
        } else if (levelIndex === 2) {
          levels.level2 = headGroup;
          levelIndex = 1;
        }
      }

      // Переходим к следующему родителю
      currentParent = this.getParentName(currentParent, devicesByBaseName);
      stepsCount++;
    }

    return levels;
  },

  /**
   * Рассчитывает уровни для всех устройств
   * @param {Array<Object>} devices - Массив всех устройств
   * @param {Function} progressCallback - Функция обратного вызова для прогресса
   * @returns {Array<Object>} Массив обновлений для устройств
   */
  calculateAllGroups(devices, progressCallback) {
    // Создаём словарь устройств по NMO_BaseName для быстрого доступа
    const devicesByBaseName = this.createDeviceMapByBaseName(devices);

    const updates = [];
    const totalDevices = devices.length;

    // Проходим по всем устройствам
    devices.forEach((device, index) => {
      // Рассчитываем уровни для устройства
      const levels = this.calculateLevelsForDevice(device, devicesByBaseName);

      // Добавляем обновление только если уровни изменились
      if (
        device.level1 !== levels.level1 ||
        device.level2 !== levels.level2 ||
        device.level3 !== levels.level3
      ) {
        updates.push({
          rowId: device.rowId,
          level1: levels.level1,
          level2: levels.level2,
          level3: levels.level3
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
   * Создаёт словарь устройств по NMO_BaseName для быстрого доступа
   * @param {Array<Object>} devices - Массив устройств
   * @returns {Map<string, Object>} Словарь устройств
   */
  createDeviceMapByBaseName(devices) {
    const deviceMap = new Map();

    devices.forEach(device => {
      if (device.nmoBaseName) {
        deviceMap.set(device.nmoBaseName, device);
      }
    });

    return deviceMap;
  },

  /**
   * Проверяет данные на корректность перед расчётом групп
   * @param {Array<Object>} devices - Массив устройств
   * @returns {Object} Результат валидации с ошибками
   */
  validateData(devices) {
    const errors = [];
    const devicesByBaseName = this.createDeviceMapByBaseName(devices);

    devices.forEach(device => {
      // Проверка на наличие обязательных полей
      if (!device.nmoBaseName) {
        errors.push(
          `Устройство с rowId ${device.rowId} не имеет NMO_BaseName`
        );
      }

      // Проверка на существование родителя в таблице
      // Но пропускаем проверку для случаев, когда родитель не должен существовать (например, для корневых элементов)
      if (device.headDeviceName) {
        const parent = this.findDeviceByBaseName(
          device.headDeviceName,
          devicesByBaseName
        );

        // Не считаем ошибкой, если родитель не найден - это может быть корневое устройство
        // Вместо этого, алгоритм будет использовать NGHeadDevice текущего устройства для 1level
      }
    });

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }
};
