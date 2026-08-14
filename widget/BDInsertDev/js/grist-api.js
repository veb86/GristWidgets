(function(root, factory) {
  'use strict';
  var dataUtils = root.InsertDevDataUtils;
  var valueLogic = root.InsertDevValueLogic;
  if (!dataUtils && typeof require === 'function') dataUtils = require('./data-utils.js');
  if (!valueLogic && typeof require === 'function') valueLogic = require('./value-logic.js');
  var moduleValue = factory(dataUtils, valueLogic);
  if (typeof module === 'object' && module.exports) module.exports = moduleValue;
  root.InsertDevGristApi = moduleValue;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(DataUtils, ValueLogic) {
  'use strict';
  var TABLE_NAME = 'InsertDev';

  /** Возвращает требуемое сообщение об отсутствующей таблице. */
  function missingTableMessage(tableName) {
    return 'Таблица "' + tableName + '" не найдена';
  }

  /** Создаёт интерфейс чтения и записи Grist. */
  function create(gristApi) {
    if (!gristApi || !gristApi.docApi) throw new Error('Grist API недоступен');
    var writeQueue = Promise.resolve();

    /** Загружает InsertDev и уникальные таблицы-источники. */
    async function load() {
      var parameters = DataUtils.toRows(await gristApi.docApi.fetchTable(TABLE_NAME));
      parameters = DataUtils.sortParameters(parameters);
      var names = DataUtils.sourceNames(parameters);
      var sources = new Map();
      var errors = new Map();
      await Promise.all(names.map(async function(name) {
        try {
          sources.set(name, DataUtils.toRows(await gristApi.docApi.fetchTable(name)));
        } catch (error) {
          console.error('[BDInsertDev] Не удалось загрузить ' + name, error);
          errors.set(name, missingTableMessage(name));
        }
      }));
      return { parameters: parameters, sources: sources, errors: errors };
    }

    /** Обновляет нужное поле и очищает остальные value-поля. */
    function update(recordId, type, value) {
      var operation = writeQueue.then(function() {
        return gristApi.docApi.applyUserActions([
          ['UpdateRecord', TABLE_NAME, recordId, ValueLogic.updateFields(type, value)]
        ]);
      });
      writeQueue = operation.catch(function() {});
      return operation;
    }

    return { load: load, update: update };
  }

  return { TABLE_NAME: TABLE_NAME, create: create, missingTableMessage: missingTableMessage };
});
