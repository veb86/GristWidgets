const test = require('node:test');
const assert = require('node:assert/strict');
const CategoryTree = require('../js/category-tree.js');
const ColumnProvider = require('../js/column-provider.js');
const DeviceProvider = require('../js/device-provider.js');
const ParameterProvider = require('../js/parameter-provider.js');
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

test('builds ordered schema-driven columns with live substring filters', () => {
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
  assert.deepEqual(TableBuilder.columns(parameters), [
    { title: 'Мощность, Вт', field: 'parameter_1', sorter: 'number', headerFilter: 'input', headerFilterFunc: 'like', headerFilterLiveFilter: true, headerSort: true },
    { title: 'IP', field: 'parameter_4', sorter: 'string', headerFilter: 'input', headerFilterFunc: 'like', headerFilterLiveFilter: true, headerSort: true }
  ]);
});

test('filters descendant devices and maps typed parameters in one pass', () => {
  const devices = DeviceProvider.forCategories([
    { id: 10, categories_id: 2 }, { id: 11, categories_id: 20 }, { id: 12, categories_id: 99 }
  ], [2, 20, 21]);
  const values = ParameterProvider.mapForDevices([
    { device_id: 10, parameter_id: 1, value_float: 10, value_int: 0, value_string: '' },
    { device_id: 10, parameter_id: 4, value_float: null, value_int: null, value_string: 'IP54' },
    { device_id: 11, parameter_id: 5, value_float: null, value_int: 4000, value_string: '' },
    { device_id: 12, parameter_id: 4, value_float: null, value_int: null, value_string: 'ignored' }
  ], devices.map((device) => device.id), [{ id: 1, dataType: 'float' }, { id: 4, dataType: 'string' }, { id: 5, dataType: 'int' }]);
  assert.deepEqual(TableBuilder.rows(devices, [{ id: 1 }, { id: 4 }, { id: 5 }], values), [
    { id: 10, parameter_1: 10, parameter_4: 'IP54', parameter_5: '' },
    { id: 11, parameter_1: '', parameter_4: '', parameter_5: 4000 }
  ]);
});
