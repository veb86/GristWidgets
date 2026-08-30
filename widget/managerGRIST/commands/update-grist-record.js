/**
 * Команда UPDATE_GRIST_RECORD
 * Обновляет несколько полей в записи таблицы Grist
 */

ZCADCommandRegistry.register('UPDATE_GRIST_RECORD', async function(command) {
  const { args } = command;
  
  console.log('[UPDATE_GRIST_RECORD] Выполнение команды', args);
  
  // Проверяем наличие обязательных параметров
  if (!args) {
    throw new Error('UPDATE_GRIST_RECORD: missing args');
  }
  
  const validation = ValidationUtils.hasRequiredFields(args, ['table', 'recordId', 'fields']);
  
  if (!validation.isValid) {
    throw new Error(`UPDATE_GRIST_RECORD: missing required fields: ${validation.missingFields.join(', ')}`);
  }
  
  const { table, recordId, fields } = args;
  
  if (typeof fields !== 'object' || fields === null) {
    throw new Error('UPDATE_GRIST_RECORD: fields must be an object');
  }
  
  try {
    // Используем утилиту Grist API для обновления нескольких полей
    await GristAPIUtils.updateRecordFields(table, recordId, fields);
    
    console.log(`[UPDATE_GRIST_RECORD] Успешно обновлено: ${table}[${recordId}]`, fields);
    
    return {
      table,
      recordId,
      updatedFields: Object.keys(fields)
    };
  } catch (error) {
    console.error('[UPDATE_GRIST_RECORD] Ошибка обновления записи:', error);
    throw error;
  }
});
