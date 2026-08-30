/**
 * Конфигурация для managerGRIST
 * Единая точка настройки адресов и параметров
 */

const ZCAD_CONFIG = {
  // Базовый URL ZCAD HTTP-сервера
  BASE_URL: "http://127.0.0.1:5000",
  
  // Endpoints формируются относительно базового URL
  get POLL_URL() {
    return `${this.BASE_URL}/grist/poll`;
  },
  
  get ACK_URL() {
    return `${this.BASE_URL}/grist/ack`;
  },
  
  get IPC_URL() {
    return `${this.BASE_URL}/ipc`;
  }
};

// Интервал polling в миллисекундах
const POLL_INTERVAL = 100;

// HTTP timeout в миллисекундах
const HTTP_TIMEOUT = 5000;

// Максимальное количество команд в очереди для последовательной обработки
const MAX_COMMAND_QUEUE_SIZE = 100;
