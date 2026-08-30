/**
 * Команда DELETE_GRIST_RECORD
 * Удаляет запись из таблицы Grist
 */

ZCADCommandRegistry.register('DELETE_GRIST_RECORD', async function(command) {
  const { args } = command;
  
  console.log('[DELETE_GRIST_RECORD] Выполнение команды', args);
  
  // Проверяем наличие обязательных параметров
  if (!args) {
    throw new Error('DELETE_GRIST_RECORD: missing args');
  }
  
  const validation = ValidationUtils.hasRequiredFields(args, ['table', 'recordId']);
  
  if (!validation.isValid) {
    throw new Error(`DELETE_GRIST_RECORD: missing required fields: ${validation.missingFields.join(', ')}`);
  }
  
  const { table, recordId } = args;
  
  try {
    // Используем утилиту Grist API для удаления записи
    await GristAPIUtils.deleteRecord(table, recordId);
    
    console.log(`[DELETE_GRIST_RECORD] Успешно удалено: ${table}[${recordId}]`);
    
    return {
      table,
      recordId
    };
  } catch (error) {
    console.error('[DELETE_GRIST_RECORD] Ошибка удаления записи:', error);
    throw error;
  }
});
