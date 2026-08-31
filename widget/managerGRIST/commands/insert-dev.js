/**
 * Команда INSERT_DEV
 * Вставляет устройство в ZCAD через существующий IPC механизм
 */

ZCADCommandRegistry.register('INSERT_DEV', async function(command) {
  const { args } = command;
  
  console.log('[INSERT_DEV] Выполнение команды INSERT_DEV', args);
  
  // Проверяем наличие аргументов
  if (!args) {
    throw new Error('INSERT_DEV: missing args');
  }
  
  // Отправляем команду через IPC endpoint ZCAD
  // Используем тот же механизм что и существующий код managerCAD
  try {
    const response = await HTTPUtils.postJson(ZCAD_CONFIG.IPC_URL, {
      command: 'INSERT_DEV',
      args: args
    });
    
    console.log('[INSERT_DEV] Ответ от ZCAD:', response);
    
    if (response && response.status === 'ok') {
      return response.result || response.message;
    } else {
      throw new Error(response?.error || response?.message || 'INSERT_DEV failed');
    }
  } catch (error) {
    console.error('[INSERT_DEV] Ошибка выполнения:', error);
    throw error;
  }
});
