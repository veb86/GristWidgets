(function(root, factory) {
  'use strict';
  var moduleValue = factory(root.InsertDevValueLogic);
  if (typeof module === 'object' && module.exports) module.exports = moduleValue;
  root.InsertDevParameterView = moduleValue;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(ValueLogic) {
  'use strict';

  /** Создаёт индикатор заполненности параметра. */
  function createIndicator(parameter) {
    var indicator = document.createElement('span');
    var filled = ValueLogic.isFilled(parameter);
    indicator.className = 'fill-indicator ' + (filled ? 'fill-indicator--filled' : '');
    indicator.textContent = filled ? '●' : '○';
    indicator.title = filled ? 'Параметр заполнен' :
      'Параметр не заполнен';
    indicator.setAttribute('aria-label', indicator.title);
    return indicator;
  }

  /** Создаёт подпись с привязкой к редактору. */
  function createLabel(parameter, inputId) {
    var label = document.createElement('label');
    label.className = 'parameter-name';
    label.htmlFor = inputId;
    label.textContent = parameter.parameter || 'Без названия';
    return label;
  }

  /** Создаёт редактор и подписывает его сохранение. */
  function createEditor(parameter, displayValue, onSave) {
    var type = String(parameter.type || '').trim().toLowerCase();
    if (type === 'boolean') return createBooleanEditor(parameter, onSave);
    var input = document.createElement('input');
    input.className = 'value-input';
    input.type = 'text';
    input.value = displayValue;
    if (parameter.parametr_column) {
      input.readOnly = true;
      input.setAttribute('aria-readonly', 'true');
      return input;
    }
    if (type === 'float') input.inputMode = 'decimal';
    if (type === 'int') input.inputMode = 'numeric';
    var initialValue = input.value;

    /** Передаёт изменённое значение слою приложения. */
    function save() {
      if (input.value === initialValue) return;
      onSave(input.value, input).then(function(saved) {
        if (saved) initialValue = input.value;
      });
    }
    input.addEventListener('blur', save);
    input.addEventListener('keydown', function(event) {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      input.blur();
    });
    return input;
  }

  /** Создаёт выбор Да/Нет с пустым вариантом. */
  function createBooleanEditor(parameter, onSave) {
    var select = document.createElement('select');
    select.className = 'value-input';
    [['', '—'], ['true', 'Да'], ['false', 'Нет']].forEach(function(optionData) {
      var option = document.createElement('option');
      option.value = optionData[0];
      option.textContent = optionData[1];
      select.appendChild(option);
    });
    var stored = ValueLogic.storedValue(parameter);
    select.value = stored === true ? 'true' : stored === false ? 'false' : '';
    select.addEventListener('change', function() {
      var value = select.value === '' ? null : select.value === 'true';
      onSave(value, select);
    });
    return select;
  }

  /** Собирает одну строку параметра. */
  function createRow(parameter, sources, handlers) {
    var row = document.createElement('div');
    row.className = 'parameter-row';
    row.dataset.recordId = parameter.id;
    var editorWrap = document.createElement('div');
    editorWrap.className = 'editor-wrap';
    var inputId = 'parameter-' + parameter.id;
    var displayValue = ValueLogic.displayValue(parameter, sources);
    var editor = createEditor(parameter, displayValue, function(raw, element) {
      return handlers.save(parameter, raw, element);
    });
    editor.id = inputId;
    editorWrap.appendChild(editor);
    if (parameter.parametr_column) editorWrap.appendChild(createLookupButton(parameter, handlers));
    var unit = document.createElement('span');
    unit.className = 'parameter-unit';
    unit.textContent = parameter.unit || '';
    row.append(createIndicator(parameter), createLabel(parameter, inputId), editorWrap, unit);
    return row;
  }

  /** Создаёт кнопку открытия таблицы-источника. */
  function createLookupButton(parameter, handlers) {
    var button = document.createElement('button');
    button.className = 'lookup-button';
    button.type = 'button';
    button.textContent = 'Выбрать';
    var parameterName = parameter.parameter || 'параметра';
    button.setAttribute('aria-label', 'Выбрать значение для ' + parameterName);
    button.addEventListener('click', function() { handlers.openLookup(parameter); });
    return button;
  }

  /** Полностью перестраивает список параметров. */
  function render(container, parameters, sources, handlers) {
    var fragment = document.createDocumentFragment();
    if (!parameters.length) {
      var empty = document.createElement('p');
      empty.className = 'empty-state';
      empty.textContent = 'В таблице InsertDev нет параметров';
      fragment.appendChild(empty);
    }
    parameters.forEach(function(parameter) {
      fragment.appendChild(createRow(parameter, sources, handlers));
    });
    container.replaceChildren(fragment);
  }

  return { render: render, createRow: createRow };
});
