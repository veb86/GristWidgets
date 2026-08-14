(function(root, factory) {
  'use strict';
  var moduleValue = factory();
  if (typeof module === 'object' && module.exports) module.exports = moduleValue;
  root.InsertDevValueLogic = moduleValue;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';
  var VALUE_FIELDS = ['value_float', 'value_int', 'value_string', 'value_boolean'];
  var TYPE_FIELDS = {
    float: 'value_float', int: 'value_int', string: 'value_string', boolean: 'value_boolean'
  };

  /** Нормализует поддерживаемый тип параметра. */
  function normalizeType(type) {
    return String(type || '').trim().toLowerCase();
  }

  /** Возвращает поле хранения для типа. */
  function fieldFor(type) {
    return TYPE_FIELDS[normalizeType(type)] || null;
  }

  /** Возвращает сохранённое значение по типу. */
  function storedValue(parameter) {
    var field = fieldFor(parameter && parameter.type);
    return field ? parameter[field] : null;
  }

  /** Не принимает 0 и false за пустые значения. */
  function isFilled(parameter) {
    var type = normalizeType(parameter && parameter.type);
    var value = storedValue(parameter || {});
    if (type === 'string') return value !== null && value !== undefined && value !== '';
    return Boolean(fieldFor(type)) && value !== null && value !== undefined;
  }

  /** Разбирает ввод и возвращает локализованную ошибку. */
  function parse(type, rawValue) {
    type = normalizeType(type);
    if (type === 'string') return { ok: true, value: String(rawValue || '') };
    var text = String(rawValue === null || rawValue === undefined ? '' : rawValue).trim();
    if (!text) return { ok: true, value: null };
    if (type === 'float') return parseFloatValue(text);
    if (type === 'int') return parseIntegerValue(text);
    if (type === 'boolean' && typeof rawValue === 'boolean') return { ok: true, value: rawValue };
    var message = 'Неподдерживаемый тип параметра: ' + type;
    return { ok: false, message: message };
  }

  /** Разбирает конечное вещественное число. */
  function parseFloatValue(text) {
    var normalized = text.replace(',', '.');
    if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized)) {
      return invalidFloat();
    }
    var value = Number(normalized);
    if (!Number.isFinite(value)) {
      return invalidFloat();
    }
    return { ok: true, value: value };
  }

  /** Возвращает ошибку вещественного числа. */
  function invalidFloat() {
    return { ok: false, message: 'Введите корректное числовое значение' };
  }

  /** Разбирает целое число без десятичной части. */
  function parseIntegerValue(text) {
    if (!/^[+-]?\d+$/.test(text)) {
      return { ok: false, message: 'Введите корректное целое число' };
    }
    var value = Number(text);
    if (!Number.isSafeInteger(value)) {
      return { ok: false, message: 'Введите корректное целое число' };
    }
    return { ok: true, value: value };
  }

  /** Формирует обновление с очисткой других типов. */
  function updateFields(type, value) {
    var target = fieldFor(type);
    if (!target) {
      throw new Error('Неподдерживаемый тип параметра: ' + type);
    }
    var result = {};
    VALUE_FIELDS.forEach(function(field) { result[field] = field === target ? value : null; });
    return result;
  }

  /** Возвращает имя lookup-записи либо сохранённый код. */
  function displayValue(parameter, sources) {
    var value = storedValue(parameter || {});
    if (value === null || value === undefined) return '';
    var tableName = typeof parameter.parametr_column === 'string' ?
      parameter.parametr_column.trim() : '';
    var rows = tableName && sources ? sources.get(tableName) : null;
    var found = rows && rows.find(function(row) { return row.code === value; });
    if (found && found.name !== null && found.name !== undefined) return String(found.name);
    return String(value);
  }

  /** Проверяет наличие code в lookup-записи. */
  function lookupSelection(row) {
    var code = row && row.code;
    if (code === null || code === undefined || String(code).trim() === '') {
      return { ok: false, message: 'Для выбранной записи не задан code' };
    }
    return { ok: true, value: typeof code === 'string' ? code.trim() : code };
  }

  return {
    fieldFor: fieldFor,
    storedValue: storedValue,
    isFilled: isFilled,
    parse: parse,
    updateFields: updateFields,
    displayValue: displayValue,
    lookupSelection: lookupSelection
  };
});
