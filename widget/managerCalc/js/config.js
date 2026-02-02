/**
 * Модуль конфигурации виджета managerCalc
 * Содержит константы и настройки для работы виджета
 */

const CONFIG = {
  // Название таблицы с устройствами
  TABLE_NAME: 'AllDevice',

  // Названия столбцов в таблице
  COLUMNS: {
    ID: 'id',
    DEVICE_NAME: 'deviceName',
    PARENT_ID: 'parentId',
    CAN_BE_HEAD: 'icanbeheadunit',
    ONLY_GU_PATH: 'onlyGUpath',
    FULL_PATH: 'fullpath'
  },

  // Разделитель для путей
  PATH_SEPARATOR: '\\',

  // Размер пакета для обновления записей
  BATCH_SIZE: 50,

  // Задержка между обновлениями (мс) для избежания перегрузки
  UPDATE_DELAY: 10
};
