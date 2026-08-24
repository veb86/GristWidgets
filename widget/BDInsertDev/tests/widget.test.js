const test = require('node:test');
const assert = require('node:assert/strict');
const DataUtils = require('../js/data-utils.js');
const ValueLogic = require('../js/value-logic.js');
const GristApi = require('../js/grist-api.js');
const DataMonitor = require('../js/data-monitor.js');
const SourceDialog = require('../js/source-dialog.js');

test('sorts parameters by sort1 and then sort2 without losing source order', () => {
  const rows = [
    { id: 1, sort1: 2, sort2: null },
    { id: 2, sort1: 1, sort2: 3 },
    { id: 3, sort1: 1, sort2: 1 },
    { id: 4, sort1: 1, sort2: null }
  ];

  assert.deepEqual(DataUtils.sortParameters(rows).map((row) => row.id), [4, 3, 2, 1]);
});

test('accepts finite floats with comma and rejects partial numbers', () => {
  assert.deepEqual(ValueLogic.parse('float', ' -10,5 '), { ok: true, value: -10.5 });
  assert.deepEqual(ValueLogic.parse('float', '10 кВт'), {
    ok: false,
    message: 'Введите корректное числовое значение'
  });
  assert.deepEqual(ValueLogic.parse('float', '1,2,3'), {
    ok: false,
    message: 'Введите корректное числовое значение'
  });
});

test('accepts only integer syntax and preserves empty values as null', () => {
  assert.deepEqual(ValueLogic.parse('int', '-5'), { ok: true, value: -5 });
  assert.deepEqual(ValueLogic.parse('int', ''), { ok: true, value: null });
  assert.deepEqual(ValueLogic.parse('int', '10.0'), {
    ok: false,
    message: 'Введите корректное целое число'
  });
});

test('treats numeric zero and both booleans as filled', () => {
  assert.equal(ValueLogic.isFilled({ type: 'float', value_float: 0 }), true);
  assert.equal(ValueLogic.isFilled({ type: 'int', value_int: 0 }), true);
  assert.equal(ValueLogic.isFilled({ type: 'boolean', value_boolean: false }), true);
  assert.equal(ValueLogic.isFilled({ type: 'string', value_string: '' }), false);
  assert.equal(ValueLogic.isFilled({ type: 'boolean', value_boolean: null }), false);
});

test('displays lookup names while retaining unmatched codes', () => {
  const sources = new Map([['Categories', [
    { id: 1, name: 'Кабели силовые', code: 'CABLE_POWER' }
  ]]]);
  const selected = {
    type: 'string',
    parametr_column: 'Categories',
    value_string: 'CABLE_POWER'
  };
  const unmatched = { ...selected, value_string: 'UNKNOWN' };

  assert.equal(ValueLogic.displayValue(selected, sources), 'Кабели силовые');
  assert.equal(ValueLogic.displayValue(unmatched, sources), 'UNKNOWN');
});

test('builds one update that clears every nonmatching value column', () => {
  assert.deepEqual(ValueLogic.updateFields('int', 12), {
    value_float: null,
    value_int: 12,
    value_string: null,
    value_boolean: null
  });
});

test('writes exact InsertDev action and serializes rapid updates', async () => {
  const calls = [];
  let active = 0;
  let maximum = 0;
  const api = GristApi.create({ docApi: {
    fetchTable: async () => ({ id: [] }),
    applyUserActions: async (actions) => {
      active += 1;
      maximum = Math.max(maximum, active);
      await new Promise((resolve) => setImmediate(resolve));
      calls.push(actions);
      active -= 1;
    }
  } });

  await Promise.all([api.update(7, 'int', 12), api.update(7, 'boolean', false)]);
  assert.equal(maximum, 1);
  assert.deepEqual(calls, [
    [['UpdateRecord', 'InsertDev', 7, ValueLogic.updateFields('int', 12)]],
    [['UpdateRecord', 'InsertDev', 7, ValueLogic.updateFields('boolean', false)]]
  ]);
});

test('loads each referenced source table once and reports missing tables', async () => {
  const fetched = [];
  const originalError = console.error;
  console.error = () => {};
  const api = GristApi.create({ docApi: {
    fetchTable: async (name) => {
      fetched.push(name);
      if (name === 'Missing') throw new Error('No such table');
      if (name === 'InsertDev') {
        return {
          id: [1, 2, 3],
          parameter: ['A', 'B', 'C'],
          parametr_column: ['Categories', 'Categories', 'Missing']
        };
      }
      return { id: [1], name: ['Первый'], parent_id: [null], code: ['A'], sort1: [0] };
    },
    applyUserActions: async () => {}
  } });

  const result = await api.load();
  console.error = originalError;
  assert.deepEqual(fetched, ['InsertDev', 'Categories', 'Missing']);
  assert.deepEqual(Array.from(result.sources.keys()), ['Categories']);
  assert.equal(result.errors.get('Missing'), 'Таблица "Missing" не найдена');
});

test('rejects selecting a source row without code', () => {
  assert.deepEqual(ValueLogic.lookupSelection({ code: null }), {
    ok: false,
    message: 'Для выбранной записи не задан code'
  });
  assert.deepEqual(ValueLogic.lookupSelection({ code: ' C-1 ' }), {
    ok: true,
    value: 'C-1'
  });
});

test('formats Grist references with their source table name', () => {
  assert.equal(SourceDialog.formatReference(['L', 12], 'Categories'), 'Categories[12]');
  assert.equal(SourceDialog.formatReference(['R', 'Categories', 7], 'Other'), 'Categories[7]');
  assert.equal(SourceDialog.formatReference(null, 'Categories'), '');
});

test('data signature changes when lookup name or code changes', () => {
  const base = {
    parameters: [{ id: 1, value_string: 'A' }],
    sources: new Map([['Categories', [{ id: 1, name: 'Первый', code: 'A' }]]]),
    errors: new Map()
  };
  const changed = {
    ...base,
    sources: new Map([['Categories', [{ id: 1, name: 'Новый', code: 'A' }]]])
  };

  assert.notEqual(DataMonitor.signature(base), DataMonitor.signature(changed));
});
