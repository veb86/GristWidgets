/**
 * Модуль для работы с данными Grist
 * Отвечает за загрузку и обновление данных в таблице
 */

const DataModule = {
  /**
   * Загружает все данные из таблицы AllDevice
   * @returns {Promise<Object>} Объект с данными таблицы
   */
  async loadAllDevices() {
    try {
      const tableData = await grist.docApi.fetchTable(CONFIG.TABLE_NAME);
      return tableData;
    } catch (error) {
      console.error('Ошибка при загрузке данных:', error);
      throw new Error('Не удалось загрузить данные из таблицы AllDevice');
    }
  },

  /**
   * Преобразует данные таблицы в удобный формат
   * @param {Object} tableData - Сырые данные из Grist
   * @returns {Array<Object>} Массив устройств с удобной структурой
   */
  transformTableData(tableData) {
    const devices = [];
    const rowCount = tableData.id ? tableData.id.length : 0;

    for (let i = 0; i < rowCount; i++) {
      devices.push({
        rowId: tableData.id[i],
        deviceName: tableData[CONFIG.COLUMNS.DEVICE_NAME]?.[i] || '',
        parentId: tableData[CONFIG.COLUMNS.PARENT_ID]?.[i] || null,
        canBeHead: tableData[CONFIG.COLUMNS.CAN_BE_HEAD]?.[i] || false,
        onlyGUpath: tableData[CONFIG.COLUMNS.ONLY_GU_PATH]?.[i] || '',
        fullpath: tableData[CONFIG.COLUMNS.FULL_PATH]?.[i] || '',
        headDeviceName: tableData[CONFIG.COLUMNS.HEAD_DEVICE_NAME]?.[i] || '',
        ngHeadDevice: tableData[CONFIG.COLUMNS.NG_HEAD_DEVICE]?.[i] || '',
        nmoBaseName: tableData[CONFIG.COLUMNS.NMO_BASE_NAME]?.[i] || '',
        level1: tableData[CONFIG.COLUMNS.LEVEL_1]?.[i] || '',
        level2: tableData[CONFIG.COLUMNS.LEVEL_2]?.[i] || '',
        level3: tableData[CONFIG.COLUMNS.LEVEL_3]?.[i] || ''
      });
    }

    return devices;
  },

  /**
   * Обновляет пути для устройства в таблице
   * @param {number} rowId - ID записи в таблице
   * @param {string} onlyGUpath - Путь через головные устройства
   * @param {string} fullpath - Полный путь
   * @returns {Promise<void>}
   */
  async updateDevicePaths(rowId, onlyGUpath, fullpath) {
    try {
      const updates = {};
      updates[CONFIG.COLUMNS.ONLY_GU_PATH] = onlyGUpath;
      updates[CONFIG.COLUMNS.FULL_PATH] = fullpath;

      await grist.docApi.applyUserActions([
        ['UpdateRecord', CONFIG.TABLE_NAME, rowId, updates]
      ]);
    } catch (error) {
      console.error(`Ошибка при обновлении путей для rowId ${rowId}:`, error);
      throw error;
    }
  },

  /**
   * Обновляет пути для нескольких устройств пакетом
   * @param {Array<Object>} updates - Массив обновлений
   * @returns {Promise<void>}
   */
  async updateDevicePathsBatch(updates) {
    try {
      const actions = updates.map(update => [
        'UpdateRecord',
        CONFIG.TABLE_NAME,
        update.rowId,
        {
          [CONFIG.COLUMNS.ONLY_GU_PATH]: update.onlyGUpath,
          [CONFIG.COLUMNS.FULL_PATH]: update.fullpath
        }
      ]);

      await grist.docApi.applyUserActions(actions);
    } catch (error) {
      console.error('Ошибка при пакетном обновлении путей:', error);
      throw error;
    }
  },

  /**
   * Обновляет уровни групп для нескольких устройств пакетом
   * @param {Array<Object>} updates - Массив обновлений
   * @returns {Promise<void>}
   */
  async updateDeviceGroupsBatch(updates) {
    try {
      const actions = updates.map(update => [
        'UpdateRecord',
        CONFIG.TABLE_NAME,
        update.rowId,
        {
          [CONFIG.COLUMNS.LEVEL_1]: update.level1,
          [CONFIG.COLUMNS.LEVEL_2]: update.level2,
          [CONFIG.COLUMNS.LEVEL_3]: update.level3
        }
      ]);

      await grist.docApi.applyUserActions(actions);
    } catch (error) {
      console.error('Ошибка при пакетном обновлении групп:', error);
      throw error;
    }
  },

  /**
   * Создаёт словарь устройств по ID для быстрого доступа
   * @param {Array<Object>} devices - Массив устройств
   * @returns {Map<number, Object>} Словарь устройств
   */
  createDeviceMap(devices) {
    const deviceMap = new Map();

    devices.forEach(device => {
      deviceMap.set(device.rowId, device);
    });

    return deviceMap;
  }
};
