/**
 * Command Registry - центральный реестр команд
 * Отвечает за регистрацию, поиск и выполнение команд
 */

const ZCADCommandRegistry = {
  /**
   * Хранилище зарегистрированных команд
   * Map<commandName, handlerFunction>
   */
  _commands: new Map(),

  /**
   * Регистрирует команду в реестре
   * @param {string} commandName - Имя команды (например "SET_GRIST_VALUE")
   * @param {Function} handler - Асинхронная функция-обработчик команды
   */
  register(commandName, handler) {
    if (typeof handler !== 'function') {
      throw new Error(`Handler for command "${commandName}" must be a function`);
    }
    
    this._commands.set(commandName.toUpperCase(), handler);
    console.log(`[CommandRegistry] Зарегистрирована команда: ${commandName}`);
  },

  /**
   * Получает обработчик команды по имени
   * @param {string} commandName - Имя команды
   * @returns {Function|null} - Обработчик или null если не найден
   */
  getHandler(commandName) {
    return this._commands.get(commandName.toUpperCase()) || null;
  },

  /**
   * Проверяет наличие команды в реестре
   * @param {string} commandName - Имя команды
   * @returns {boolean}
   */
  hasCommand(commandName) {
    return this._commands.has(commandName.toUpperCase());
  },

  /**
   * Выполняет команду
   * @param {object} command - Объект команды {id, command, args}
   * @returns {Promise<any>} - Результат выполнения
   * @throws {Error} Если команда не найдена или произошла ошибка выполнения
   */
  async execute(command) {
    const commandName = command.command;
    
    if (!commandName) {
      throw new Error('Command name is missing');
    }

    const handler = this.getHandler(commandName);
    
    if (!handler) {
      throw new Error(`Unknown command: ${commandName}`);
    }

    console.log(`[CommandRegistry] Выполнение команды: ${commandName} (id: ${command.id})`);
    
    try {
      const result = await handler(command);
      console.log(`[CommandRegistry] Команда ${commandName} выполнена успешно (id: ${command.id})`);
      return result;
    } catch (error) {
      console.error(`[CommandRegistry] Ошибка выполнения команды ${commandName} (id: ${command.id}):`, error);
      throw error;
    }
  },

  /**
   * Возвращает количество зарегистрированных команд
   * @returns {number}
   */
  getCommandCount() {
    return this._commands.size;
  },

  /**
   * Возвращает список всех зарегистрированных команд
   * @returns {Array<string>}
   */
  listCommands() {
    return Array.from(this._commands.keys());
  }
};
