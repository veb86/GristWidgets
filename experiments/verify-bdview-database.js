const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const CategoryTree = require('../widget/BDView/js/category-tree.js');
const ColumnProvider = require('../widget/BDView/js/column-provider.js');
const DeviceProvider = require('../widget/BDView/js/device-provider.js');
const ParameterProvider = require('../widget/BDView/js/parameter-provider.js');
const TableBuilder = require('../widget/BDView/js/table-builder.js');

function query(table) {
  return JSON.parse(execFileSync('sqlite3', ['-json', 'BDNEW_ZCAD.grist', `select * from "${table}"`], { encoding: 'utf8' }) || '[]');
}

const categories = query('Categories');
const categoryParameters = query('CategoryParameters');
const devices = query('Devices');
const parameters = query('Parameters');
const deviceParameters = query('DeviceParameters');

const categoryIds = CategoryTree.descendantIds(categories, 2);
const selectedParameters = ColumnProvider.forCategory(categoryParameters, parameters, 2);
const selectedDevices = DeviceProvider.forCategories(devices, categoryIds);
const values = ParameterProvider.mapForDevices(deviceParameters, selectedDevices.map((device) => device.id), selectedParameters);
const rows = TableBuilder.rows(selectedDevices, selectedParameters, values);

assert.ok(categoryIds.includes(2));
assert.deepEqual(selectedParameters.map((parameter) => parameter.name), ['Мощность', 'Напряжение', 'Цветовая температура']);
assert.equal(rows.length, 1);
assert.deepEqual(rows[0], { id: 1, parameter_1: 10, parameter_2: 220, parameter_4: 4000 });
console.log('BDView database verification passed:', { categoryIds: categoryIds.length, columns: selectedParameters.length, rows: rows.length });
