const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const widgetDirectory = path.resolve(__dirname, '..');

test('every local script referenced by index.html exists', () => {
  const html = fs.readFileSync(path.join(widgetDirectory, 'index.html'), 'utf8');
  const sources = Array.from(html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/gi), (match) => match[1]);
  const localSources = sources.filter((source) => !/^(?:[a-z]+:)?\/\//i.test(source));

  assert.ok(localSources.length > 0, 'index.html should reference local scripts');
  for (const source of localSources) {
    assert.ok(
      fs.existsSync(path.resolve(widgetDirectory, source)),
      `Local script does not exist: ${source}`
    );
  }
});
