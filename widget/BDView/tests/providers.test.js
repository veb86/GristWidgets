const test = require('node:test');
const assert = require('node:assert/strict');
const CategoryTree = require('../js/category-tree.js');
const ColumnProvider = require('../js/column-provider.js');
const DeviceProvider = require('../js/device-provider.js');
const ParameterProvider = require('../js/parameter-provider.js');
const SelectedDeviceWriter = require('../js/selected-device-writer.js');
const TableBuilder = require('../js/table-builder.js');
const SystemMonitor = require('../js/system-monitor.js');

test('reads selectedGroupID and normalizes Grist reference values', () => {
  assert.equal(SystemMonitor.selectedGroupId([
    { param: 'other', value: 3 },
    { param: 'selectedGroupID', value: ['L', 21] }
  ]), 21);
  assert.equal(SystemMonitor.selectedGroupId([]), null);
});

test('recursively includes every descendant and terminates on cycles', () => {
  const categories = [
    { id: 2, parent_id: 0 }, { id: 20, parent_id: 2 },
    { id: 21, parent_id: 20 }, { id: 2, parent_id: 21 }, { id: 99, parent_id: 0 }
  ];
  assert.deepEqual(CategoryTree.descendantIds(categories, '2'), [2, 20, 21]);
});

test('prepends permanent device columns to ordered schema-driven columns', () => {
  const links = [
    { category_id: 2, parameter_id: 4, manualSort: 3 },
    { category_id: 2, parameter_id: 1, manualSort: 1 },
    { category_id: 20, parameter_id: 2, manualSort: 2 }
  ];
  const definitions = [
    { id: 1, name: 'Мощность', unit: 'Вт', data_type: 'float' },
    { id: 2, name: 'Напряжение', unit: 'В', data_type: 'float' },
    { id: 4, name: 'IP', unit: '', data_type: 'string' }
  ];
  const parameters = ColumnProvider.forCategory(links, definitions, 2);
  assert.deepEqual(parameters.map((item) => item.id), [1, 4]);
  const onAdd = () => {};
  const columns = TableBuilder.columns(parameters, onAdd);
  assert.equal(columns[0].field, '_add');
  assert.equal(columns[0].title, '');
  assert.equal(columns[0].headerSort, false);
  assert.equal(columns[0].frozen, true);
  assert.equal(typeof columns[0].cellClick, 'function');
  assert.match(columns[0].formatter(), />\+</);
  let selectedId = null;
  let propagationStopped = false;
  const action = TableBuilder.actionColumn((id) => { selectedId = id; });
  action.cellClick({ stopPropagation: () => { propagationStopped = true; } }, {
    getRow: () => ({ getData: () => ({ id: 73 }) })
  });
  assert.equal(selectedId, 73);
  assert.equal(propagationStopped, true);
  assert.deepEqual(columns.slice(1), [
    { title: 'Наименование', field: 'name', sorter: 'string', headerFilter: 'input', headerFilterFunc: 'like', headerFilterLiveFilter: true, headerSort: true },
    { title: 'Модель', field: 'model', sorter: 'string', headerFilter: 'input', headerFilterFunc: 'like', headerFilterLiveFilter: true, headerSort: true },
    { title: 'Производитель', field: 'manufacturer', sorter: 'string', headerFilter: 'input', headerFilterFunc: 'like', headerFilterLiveFilter: true, headerSort: true },
    { title: 'Мощность, Вт', field: 'parameter_1', sorter: 'number', headerFilter: 'input', headerFilterFunc: 'like', headerFilterLiveFilter: true, headerSort: true },
    { title: 'IP', field: 'parameter_4', sorter: 'string', headerFilter: 'input', headerFilterFunc: 'like', headerFilterLiveFilter: true, headerSort: true }
  ]);
});

test('filters descendant devices and maps typed parameters in one pass', () => {
  const devices = DeviceProvider.forCategories([
    { id: 10, categories_id: 2, name: 'Светильник', model: 'L-10', manufacturer: 'Завод 1' },
    { id: 11, categories_id: 20, name: 'Автомат', model: null, manufacturer: 'Завод 2' },
    { id: 12, categories_id: 99, name: 'Розетка', model: 'R-12', manufacturer: 'Завод 3' }
  ], [2, 20, 21]);
  const values = ParameterProvider.mapForDevices([
    { device_id: 10, parameter_id: 1, value_float: 10, value_int: 0, value_string: '' },
    { device_id: 10, parameter_id: 4, value_float: null, value_int: null, value_string: 'IP54' },
    { device_id: 11, parameter_id: 5, value_float: null, value_int: 4000, value_string: '' },
    { device_id: 12, parameter_id: 4, value_float: null, value_int: null, value_string: 'ignored' }
  ], devices.map((device) => device.id), [{ id: 1, dataType: 'float' }, { id: 4, dataType: 'string' }, { id: 5, dataType: 'int' }]);
  assert.deepEqual(TableBuilder.rows(devices, [{ id: 1 }, { id: 4 }, { id: 5 }], values), [
    { id: 10, name: 'Светильник', model: 'L-10', manufacturer: 'Завод 1', parameter_1: 10, parameter_4: 'IP54', parameter_5: '' },
    { id: 11, name: 'Автомат', model: '', manufacturer: 'Завод 2', parameter_1: '', parameter_4: '', parameter_5: 4000 }
  ]);
});

test('adds a new device to SelDevices with quantity one', async () => {
  const actions = [];
  const add = SelectedDeviceWriter.create({ docApi: {
    fetchTable: async (name) => {
      assert.equal(name, 'SelDevices');
      return { id: [], dev_id: [], quantity: [] };
    },
    applyUserActions: async (batch) => actions.push(...batch)
  } });

  assert.deepEqual(await add(['L', 42]), { created: true, quantity: 1 });
  assert.deepEqual(actions, [
    ['AddRecord', 'SelDevices', null, { dev_id: 42, quantity: 1 }]
  ]);
});

test('increments quantity when the device already exists in SelDevices', async () => {
  const actions = [];
  const add = SelectedDeviceWriter.create({ docApi: {
    fetchTable: async () => ({
      id: [7, 8],
      dev_id: [['L', 41], ['L', 42]],
      quantity: [3, 5]
    }),
    applyUserActions: async (batch) => actions.push(...batch)
  } });

  assert.deepEqual(await add(42), { created: false, quantity: 6 });
  assert.deepEqual(actions, [
    ['UpdateRecord', 'SelDevices', 8, { quantity: 6 }]
  ]);
});

test('serializes rapid additions so quantity updates are not lost', async () => {
  const selected = { id: [8], dev_id: [['L', 42]], quantity: [1] };
  let inFlight = 0;
  let maxInFlight = 0;
  const add = SelectedDeviceWriter.create({ docApi: {
    fetchTable: async () => structuredClone(selected),
    applyUserActions: async (batch) => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setImmediate(resolve));
      selected.quantity[0] = batch[0][3].quantity;
      inFlight -= 1;
    }
  } });

  assert.deepEqual(await Promise.all([add(42), add(42)]), [
    { created: false, quantity: 2 },
    { created: false, quantity: 3 }
  ]);
  assert.equal(maxInFlight, 1);
  assert.equal(selected.quantity[0], 3);
});
