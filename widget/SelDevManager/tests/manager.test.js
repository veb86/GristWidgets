const test = require('node:test');
const assert = require('node:assert/strict');
const DataUtils = require('../js/data-utils.js');
const GristApi = require('../js/grist-api.js');
const QuantityManager = require('../js/quantity-manager.js');
const TableBuilder = require('../js/table-builder.js');

test('converts Grist column data into rows and preserves column order', () => {
  const table = {
    id: [4, 8],
    dev_id: [['L', 12], ['L', 20]],
    quantity: [1, 3],
    Note: ['Первый', null]
  };

  assert.deepEqual(DataUtils.toRows(table), [
    { id: 4, dev_id: ['L', 12], quantity: 1, Note: 'Первый' },
    { id: 8, dev_id: ['L', 20], quantity: 3, Note: null }
  ]);
  assert.deepEqual(DataUtils.columnNames(table), ['id', 'dev_id', 'quantity', 'Note']);
});

test('builds visible column settings in configured order with custom titles', () => {
  const source = {
    id: [4],
    dev_id: [['L', 12]],
    quantity: [2],
    Note: ['Первый'],
    manualSort: [99]
  };
  const settings = {
    id: [1, 2, 3, 4],
    namecol: ['Note', 'manualSort', 'quantity', 'dev_id'],
    view: [true, true, true, true],
    name: ['Примечание', 'Служебный', 'Количество', 'Устройство'],
    sort: [30, 5, 20, 10]
  };

  assert.deepEqual(DataUtils.configuredColumns(source, settings), [
    { field: 'dev_id', title: 'Устройство' },
    { field: 'quantity', title: 'Количество' },
    { field: 'Note', title: 'Примечание' }
  ]);
});

test('hides disabled, unknown and system columns from configured settings', () => {
  const source = { id: [4], quantity: [2], Note: ['Первый'] };
  const settings = {
    id: [1, 2, 3, 4, 5],
    namecol: ['id', 'quantity', 'Note', 'Missing', 'quantity'],
    view: [true, true, false, true, true],
    name: ['ID', '', 'Примечание', 'Нет', 'Дубликат'],
    sort: [1, 2, 3, 4, 5]
  };

  assert.deepEqual(DataUtils.configuredColumns(source, settings), [
    { field: 'quantity', title: 'quantity' }
  ]);
});

test('treats only enabled boolean settings as visible', () => {
  const source = { id: [4], quantity: [2], Note: ['Первый'] };
  const settings = {
    id: [1, 2],
    namecol: ['quantity', 'Note'],
    view: [true, false],
    name: ['Количество', 'Примечание'],
    sort: [1, 2]
  };

  assert.deepEqual(DataUtils.configuredColumns(source, settings), [
    { field: 'quantity', title: 'Количество' }
  ]);
});

test('loads devices with display settings and sends exact Grist actions', async () => {
  const calls = [];
  const fetches = [];
  const api = GristApi.create({ docApi: {
    fetchTable: async (name) => {
      fetches.push(name);
      if (name === 'SelDevicesSet') {
        return { id: [1], namecol: ['quantity'], view: [true], name: ['Количество'], sort: [1] };
      }
      return { id: [2], quantity: [5] };
    },
    applyUserActions: async (actions) => calls.push(actions)
  } });

  assert.deepEqual(await api.load(), {
    table: { id: [2], quantity: [5] },
    rows: [{ id: 2, quantity: 5 }],
    columns: [{ field: 'quantity', title: 'Количество' }]
  });
  assert.deepEqual(fetches, ['SelDevices', 'SelDevicesSet']);
  await api.update(2, 'quantity', 6);
  await api.remove(2);
  await api.removeAll([2, 7]);

  assert.deepEqual(calls, [
    [['UpdateRecord', 'SelDevices', 2, { quantity: 6 }]],
    [['RemoveRecord', 'SelDevices', 2]],
    [['BulkRemoveRecord', 'SelDevices', [2, 7]]]
  ]);
});

test('increments quantity and updates Grist immediately', async () => {
  const updates = [];
  const manager = QuantityManager.create({
    update: async (id, field, value) => updates.push([id, field, value]),
    remove: async () => assert.fail('remove must not be called')
  });

  assert.deepEqual(await manager.increase({ id: 9, quantity: 2 }), {
    removed: false,
    quantity: 3
  });
  assert.deepEqual(updates, [[9, 'quantity', 3]]);
});

test('decrements quantity above one without asking for confirmation', async () => {
  let confirmations = 0;
  const updates = [];
  const manager = QuantityManager.create({
    update: async (id, field, value) => updates.push([id, field, value]),
    remove: async () => assert.fail('remove must not be called')
  }, async () => {
    confirmations += 1;
    return true;
  });

  assert.deepEqual(await manager.decrease({ id: 9, quantity: 2 }), {
    removed: false,
    quantity: 1
  });
  assert.equal(confirmations, 0);
  assert.deepEqual(updates, [[9, 'quantity', 1]]);
});

test('never persists zero and removes quantity one only after confirmation', async () => {
  const updates = [];
  const removals = [];
  const answers = [false, true];
  const manager = QuantityManager.create({
    update: async (...args) => updates.push(args),
    remove: async (id) => removals.push(id)
  }, async () => answers.shift());

  assert.deepEqual(await manager.decrease({ id: 5, quantity: 1 }), {
    removed: false,
    quantity: 1
  });
  assert.deepEqual(await manager.decrease({ id: 5, quantity: 1 }), {
    removed: true,
    quantity: 0
  });
  assert.deepEqual(updates, []);
  assert.deepEqual(removals, [5]);
});

test('places fixed service columns around quantity and uses configured titles', () => {
  const handlers = {
    remove: () => {},
    increase: () => {},
    decrease: () => {},
    edit: () => {}
  };
  const columns = TableBuilder.columns([
    { field: 'dev_id', title: 'Устройство' },
    { field: 'quantity', title: 'Количество' },
    { field: 'Note', title: 'Примечание' }
  ], handlers);

  assert.deepEqual(columns.map((column) => column.title), [
    'X', 'Устройство', 'Количество', '+', '-', 'Примечание'
  ]);
  assert.equal(columns[0].headerSort, false);
  assert.equal(columns[0].editor, false);
  assert.equal(columns[0].cssClass, 'service-cell service-cell--remove');
  assert.equal(columns[1].field, 'dev_id');
  assert.equal(columns[1].editor, 'input');
  assert.equal(columns[2].field, 'quantity');
  assert.equal(columns[2].editor, 'number');
  assert.equal(columns[3].headerSort, false);
  assert.equal(columns[4].headerSort, false);
  assert.equal(columns[5].editor, 'input');
});

test('service column callbacks receive the selected row', () => {
  const received = [];
  const columns = TableBuilder.columns([{ field: 'quantity', title: 'Количество' }], {
    remove: (row) => received.push(['remove', row]),
    increase: (row) => received.push(['increase', row]),
    decrease: (row) => received.push(['decrease', row]),
    edit: () => {}
  });
  const row = { id: 15, quantity: 4 };
  const cell = { getRow: () => ({ getData: () => row }) };

  columns[0].cellClick({}, cell);
  columns[2].cellClick({}, cell);
  columns[3].cellClick({}, cell);
  assert.deepEqual(received, [
    ['remove', row], ['increase', row], ['decrease', row]
  ]);
});
