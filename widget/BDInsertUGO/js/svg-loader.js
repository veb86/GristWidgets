(function(root, factory) {
  'use strict';
  var moduleValue = factory();
  if (typeof module === 'object' && module.exports) module.exports = moduleValue;
  root.BDInsertUGOSvgLoader = moduleValue;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';

  function fileName(value) {
    var name = String(value || '').trim();
    if (!name || name.indexOf('/') !== -1 || name.indexOf('\\') !== -1 || name.indexOf('..') !== -1 || name.indexOf(':') !== -1) return null;
    return /\.svg$/i.test(name) ? name : name + '.svg';
  }

  function urlFor(value, basePath) {
    var name = fileName(value);
    if (!name) return null;
    var base = String(basePath || './svg/');
    if (base.charAt(base.length - 1) !== '/') base += '/';
    return base + encodeURIComponent(name).replace(/%20/g, ' ');
  }

  return { fileName: fileName, urlFor: urlFor };
});
