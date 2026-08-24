const test = require('node:test');
const assert = require('node:assert/strict');

const DataUtils = require('../js/data-utils.js');
const UgoTree = require('../js/ugo-tree.js');
const SvgLoader = require('../js/svg-loader.js');
const UgoRepository = require('../js/ugo-repository.js');

test('converts column-oriented Grist data into records', () => {
  assert.deepEqual(DataUtils.rows({
    id: [1, 2],
    name: ['Светильники', 'Светильник 2х36'],
    parent_id: [0, ['L', 1]]
  }), [
    { id: 1, name: 'Светильники', parent_id: 0 },
    { id: 2, name: 'Светильник 2х36', parent_id: ['L', 1] }
  ]);
});

test('builds a sorted hierarchy from Grist reference values', () => {
  const tree = UgoTree.build([
    { id: 3, name: 'Бета', parent_id: ['L', 1], sort1: 2, sort2: null },
    { id: 1, name: 'Светильники', parent_id: null, sort1: 1, sort2: null },
    { id: 5, name: 'Альфа', parent_id: ['L', 1], sort1: 2, sort2: null },
    { id: 4, name: 'Розетки', parent_id: 0, sort1: 2, sort2: 1 },
    { id: 2, name: 'Первый', parent_id: ['L', 1], sort1: 1, sort2: 3 }
  ]);

  assert.deepEqual(tree.map((node) => node.id), [1, 4]);
  assert.deepEqual(tree[0].children.map((node) => node.id), [2, 5, 3]);
});

test('keeps orphan and cyclic records visible and terminates safely', () => {
  const tree = UgoTree.build([
    { id: 1, name: 'Сирота', parent_id: ['L', 99] },
    { id: 2, name: 'Цикл 1', parent_id: ['L', 3] },
    { id: 3, name: 'Цикл 2', parent_id: ['L', 2] }
  ]);
  const ids = [];
  (function visit(nodes) {
    nodes.forEach((node) => { ids.push(node.id); visit(node.children); });
  })(tree);
  assert.deepEqual(ids.sort((a, b) => a - b), [1, 2, 3]);
});

test('finds the selected UGO and all ancestor ids from SYSTEM', () => {
  const records = [
    { id: 1, parent_id: null, ugo_dxf: '' },
    { id: 2, parent_id: ['L', 1], ugo_dxf: 'LIGHT_2_36' },
    { id: 3, parent_id: ['L', 2], ugo_dxf: 'CHILD' }
  ];
  assert.equal(UgoTree.findByDxf(records, 'LIGHT_2_36').id, 2);
  assert.deepEqual(UgoTree.ancestorIds(records, 3), [1, 2]);
});

test('normalizes safe SVG names while rejecting traversal and URLs', () => {
  assert.equal(SvgLoader.fileName('light_600_600'), 'light_600_600.svg');
  assert.equal(SvgLoader.fileName('light 2x36.svg'), 'light 2x36.svg');
  assert.equal(SvgLoader.fileName(''), null);
  assert.equal(SvgLoader.fileName('../secret'), null);
  assert.equal(SvgLoader.fileName('https://example.com/a.svg'), null);
  assert.equal(SvgLoader.urlFor('light_600_600', './svg/'), './svg/light_600_600.svg');
});

test('loads both source tables in parallel and detects SYSTEM value column', async () => {
  const calls = [];
  const repository = UgoRepository.create({ docApi: {
    fetchTable: async (name) => {
      calls.push(name);
      return name === 'InsertUGO'
        ? { id: [1], name: ['Лампа'] }
        : { id: [8], param: ['nameUGO'], string_value: ['LIGHT'] };
    },
    applyUserActions: async () => {}
  }});
  const data = await repository.load();
  assert.deepEqual(calls.sort(), ['InsertUGO', 'SYSTEM']);
  assert.equal(data.systemRecord.id, 8);
  assert.equal(data.valueColumn, 'string_value');
  assert.equal(data.selectedValue, 'LIGHT');
});

test('writes or clears name through one UpdateRecord action', async () => {
  const actions = [];
  const repository = UgoRepository.create({ docApi: {
    fetchTable: async () => ({}),
    applyUserActions: async (batch) => actions.push(...batch)
  }});
  await repository.saveSelection({ id: 8 }, 'value', 'LIGHT_2_36');
  await repository.saveSelection({ id: 8 }, 'value', null);
  assert.deepEqual(actions, [
    ['UpdateRecord', 'SYSTEM', 8, { value: 'LIGHT_2_36' }],
    ['UpdateRecord', 'SYSTEM', 8, { value: '' }]
  ]);
});

test('reports missing tables and missing nameUGO separately', async () => {
  const missingInsert = UgoRepository.create({ docApi: {
    fetchTable: async (name) => {
      if (name === 'InsertUGO') throw new Error('table not found');
      return { id: [1], param: ['nameUGO'], value: [''] };
    }
  }});
  await assert.rejects(missingInsert.load(), /Не найдена таблица InsertUGO/);

  const missingParam = UgoRepository.create({ docApi: {
    fetchTable: async (name) => name === 'InsertUGO'
      ? { id: [], name: [] }
      : { id: [1], param: ['other'], value: [''] }
  }});
  await assert.rejects(missingParam.load(), /В таблице SYSTEM отсутствует параметр nameUGO/);
});
