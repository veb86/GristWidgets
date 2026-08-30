/**
 * Команда SET_GRIST_VALUE
 * Устанавливает значение поля в записи таблицы Grist
 */

ZCADCommandRegistry.register('SET_GRIST_VALUE', async function(command) {
  const { args } = command;
  
  console.log('[SET_GRIST_VALUE] Выполнение команды', args);
  
  // Проверяем наличие обязательных параметров
  if (!args) {
    throw new Error('SET_GRIST_VALUE: missing args');
  }
  
  const validation = ValidationUtils.hasRequiredFields(args, ['table', 'recordId', 'field', 'value']);
  
  if (!validation.isValid) {
    throw new Error(`SET_GRIST_VALUE: missing required fields: ${validation.missingFields.join(', ')}`);
  }
  
  const { table, recordId, field, value } = args;
  
  try {
    // Используем утилиту Grist API для обновления записи
    await GristAPIUtils.updateRecord(table, recordId, field, value);
    
    console.log(`[SET_GRIST_VALUE] Успешно обновлено: ${table}[${recordId}].${field} = ${value}`);
    
    return {
      table,
      recordId,
      field,
      value
    };
  } catch (error) {
    console.error('[SET_GRIST_VALUE] Ошибка обновления записи:', error);
    throw error;
  }
});
