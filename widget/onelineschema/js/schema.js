/**
 * Модуль для отрисовки схемы
 *
 * Этот модуль отвечает за визуализацию однолинейной схемы с использованием SVG и D3.js.
 *
 * @module SchemaModule
 */

var SchemaModule = (function() {
  'use strict';

  // ========================================
  // ПРИВАТНЫЕ ПЕРЕМЕННЫЕ
  // ========================================

  let svgContainer = null;
  let schemaContainer = null;
  let svg = null;
  let zoom = null;

  // Кэш для загруженных SVG иконок
  const svgCache = {};

  // ========================================
  // ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
  // ========================================

  /**
   * Очистить контейнер схемы
   */
  function clearSchema() {
    if (svg) {
      svg.selectAll("*").remove();
    }
    if (schemaContainer) {
      schemaContainer.innerHTML = '';
    }
  }

  /**
   * Инициализировать SVG контейнер
   */
  function initializeSvgContainer() {
    schemaContainer = document.getElementById('schema-container');
    if (!schemaContainer) {
      console.error('Контейнер схемы не найден!');
      return false;
    }

    // Очищаем контейнер
    clearSchema();

    // Создаем SVG элемент
    svg = d3.select(schemaContainer)
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('preserveAspectRatio', 'xMinYMin meet');

    // Добавляем группу для содержимого
    svg.append('g').attr('class', 'content');

    // Инициализируем зум
    zoom = d3.zoom()
      .scaleExtent([0.1, 10])
      .on('zoom', function(event) {
        d3.select('.content').attr('transform', event.transform);
      });

    svg.call(zoom);

    return true;
  }

  /**
   * Загрузить SVG иконку по имени файла
   * @param {string} fileName - Имя SVG файла без расширения
   * @returns {Promise<string>} Обещание с содержимым SVG
   */
  async function loadSvgIcon(fileName) {
    // Проверяем кэш
    if (svgCache[fileName]) {
      return svgCache[fileName];
    }

    try {
      // Пытаемся загрузить SVG файл
      const response = await fetch(`./svg/${fileName}.svg`);
      if (!response.ok) {
        throw new Error(`SVG файл не найден: ./svg/${fileName}.svg`);
      }

      const svgText = await response.text();
      // Сохраняем в кэш
      svgCache[fileName] = svgText;
      return svgText;
    } catch (error) {
      console.warn(`Не удалось загрузить SVG иконку: ${fileName}.svg`, error);
      // Возвращаем стандартную иконку если не найдена
      try {
        const response = await fetch('./svg/default.svg');
        const svgText = await response.text();
        svgCache[fileName] = svgText;
        return svgText;
      } catch (defaultError) {
        console.error('Не удалось загрузить стандартную иконку:', defaultError);
        return '<svg width="40" height="20"><rect width="40" height="20" fill="#ccc" stroke="#999"/></svg>';
      }
    }
  }

  /**
   * Отрисовать схему на основе координат
   * @param {Array} data - Массив данных устройств
   */
  async function drawCoordinateSchema(data) {
    if (!svg) return;

    const content = svg.select('.content');

    // Определяем максимальные координаты для размера SVG
    let maxX = 0;
    let maxY = 0;

    for (const item of data) {
      const ptX = item.ptX || 0;
      const ptY = item.ptY || 0;

      if (ptX > maxX) maxX = ptX;
      if (ptY > maxY) maxY = ptY;
    }

    // Устанавливаем размеры SVG с учетом отступов
    svg.attr('viewBox', `0 0 ${maxX + 100} ${maxY + 100}`);

    // Отрисовываем каждое устройство по координатам
    for (const item of data) {
      const ptX = item.ptX || 0;
      const ptY = item.ptY || 0;
      const ugo = item.ugo || 'default';

      await drawDeviceAtCoordinates(content, item, ptX, ptY, ugo);
    }
  }

  /**
   * Отрисовать устройство по координатам
   * @param {Object} selection - D3 selection
   * @param {Object} item - Данные устройства
   * @param {number} x - X координата
   * @param {number} y - Y координата
   * @param {string} ugo - Имя SVG файла
   */
  async function drawDeviceAtCoordinates(selection, item, x, y, ugo) {
    // Загружаем SVG иконку по имени из UGO
    const icon = await loadSvgIcon(ugo);

    // Получаем значения масштабирования, если они есть
    const scaleX = item.scaleX || item.scalex || item.SCALEX || 1;
    const scaleY = item.scaleY || item.scaley || item.SCALEY || 1;

    // Создаем группу для устройства
    const g = selection.append('g')
      .attr('class', 'device coordinate')
      .attr('data-id', item.id)
      .attr('data-type', item.type || '')
      .attr('data-brand', item.brand || '')
      .attr('data-feeder-name', item.feeder_name || '')
      .attr('data-feeder-num', item.feeder_num || '')
      .attr('data-ugo', ugo)
      .attr('data-scale-x', scaleX)
      .attr('data-scale-y', scaleY);

    // Добавляем внутреннюю группу с трансформацией для масштабирования и позиционирования
    const transformGroup = g.append('g')
      .attr('transform', `translate(${x}, ${y}) scale(${scaleX}, ${scaleY})`);

    // Добавляем SVG иконку во внутреннюю группу
    transformGroup.append('g')
      .html(icon);

    // Добавляем обводку (рамочку) для подсветки при наведении
    // Создаем прямоугольник с учетом масштабирования из таблицы
    const bbox = getBBoxFromSVGString(icon); // Получаем размеры SVG
    const rect = g.append('rect')  // Добавляем прямоугольник в основную группу (до применения масштаба)
      .attr('x', x)  // Позиционируем относительно исходных координат
      .attr('y', y)
      .attr('width', (bbox.width || 40) * scaleX)  // Умножаем на масштаб из таблицы
      .attr('height', (bbox.height || 20) * scaleY)
      .attr('fill', 'none')
      .attr('stroke', 'transparent')
      .attr('stroke-width', 2)
      .attr('pointer-events', 'all') // Разрешаем события мыши на прямоугольнике
      .attr('class', 'highlight-rect');

    // Добавляем текстовую информацию рядом с устройством
    if (item.brand || item.feeder_num) {
      g.append('text')
        .attr('x', x + 25 * scaleX)  // Учитываем масштаб при позиционировании текста
        .attr('y', y - 5)
        .attr('font-size', '10px')
        .attr('text-anchor', 'start')
        .text(`${item.brand || ''} ${item.feeder_num ? '#' + item.feeder_num : ''}`);
    }

    // Обработчик наведения мыши - показываем рамочку
    g.on('mouseover', function(event) {
      rect.attr('stroke', '#007bff')
          .attr('stroke-width', 2)
          .attr('stroke-dasharray', '4,2');
    });

    // Обработчик ухода мыши - скрываем рамочку
    g.on('mouseout', function(event) {
      rect.attr('stroke', 'transparent');
    });

    // Обработчик клика - открываем панель информации
    g.on('click', function(event) {
      showDeviceInfoPanel(item);
    });
  }

  /**
   * Получить размеры SVG элемента из строки
   * @param {string} svgString - Строка SVG
   * @returns {Object} Объект с размерами (x, y, width, height)
   */
  function getBBoxFromSVGString(svgString) {
    // Создаем временный элемент для определения размеров
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = svgString;
    tempDiv.style.visibility = 'hidden';
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    document.body.appendChild(tempDiv);

    const svgElement = tempDiv.querySelector('svg') || tempDiv.firstElementChild;

    if (svgElement) {
      // Используем getBoundingClientRect для получения фактического размера на экране
      const rect = svgElement.getBoundingClientRect();
      // Убираем временный элемент
      document.body.removeChild(tempDiv);

      // Возвращаем размеры, основанные на фактическом отображении
      return { x: 0, y: 0, width: rect.width, height: rect.height };
    } else {
      // Убираем временный элемент, если не нашли SVG
      document.body.removeChild(tempDiv);
    }

    // Значения по умолчанию
    return { x: 0, y: 0, width: 40, height: 20 };
  }

  /**
   * Отрисовать схему для одного фидера (старый метод для совместимости)
   * @param {Object} feederData - Данные фидера
   * @param {string} feederName - Имя фидера
   * @param {number} feederIndex - Индекс фидера для позиционирования
   */
  async function drawFeederSchema(feederData, feederName, feederIndex) {
    if (!svg) return;

    const content = svg.select('.content');
    const startY = 50 + feederIndex * 300; // Начальная позиция для каждого фидера

    // Добавляем заголовок фидера
    content.append('text')
      .attr('x', 50)
      .attr('y', startY - 20)
      .attr('font-size', '16px')
      .attr('font-weight', 'bold')
      .text(`Фидер: ${feederName}`);

    // Группируем данные по feeder_row (основные автоматы)
    const mainAutomats = {};
    feederData.forEach(item => {
      const row = item.feeder_row || 0;
      if (!mainAutomats[row]) {
        mainAutomats[row] = [];
      }
      mainAutomats[row].push(item);
    });

    // Сортируем основные автоматы по номеру ряда
    const sortedRows = Object.keys(mainAutomats).sort((a, b) => parseInt(a) - parseInt(b));

    // Отрисовываем каждый основной автомат и его модули
    for (let i = 0; i < sortedRows.length; i++) {
      const row = sortedRows[i];
      const automatData = mainAutomats[row];
      const mainItem = automatData[0]; // Первый элемент - основной автомат

      const x = 100;
      const y = startY + i * 60; // Вертикальное расстояние между автоматами

      // Отрисовываем основной автомат
      await drawDevice(content, mainItem, x, y, 'main');

      // Отрисовываем модули (все кроме первого, который основной автомат)
      if (automatData.length > 1) {
        for (let j = 1; j < automatData.length; j++) {
          const moduleItem = automatData[j];
          const moduleX = x + 80 + (j-1) * 60; // Горизонтальное расстояние между модулями
          const moduleY = y;

          // Рисуем соединительную линию
          content.append('line')
            .attr('x1', x + 40)
            .attr('y1', y + 10)
            .attr('x2', moduleX)
            .attr('y2', moduleY + 10)
            .attr('stroke', '#6c757d')
            .attr('stroke-width', 1);

          // Отрисовываем модуль
          await drawDevice(content, moduleItem, moduleX, moduleY, 'module');
        }
      }
    }
  }

  /**
   * Отрисовать устройство (старый метод для совместимости)
   * @param {Object} selection - D3 selection
   * @param {Object} item - Данные устройства
   * @param {number} x - X координата
   * @param {number} y - Y координата
   * @param {string} type - Тип устройства ('main' или 'module')
   */
  async function drawDevice(selection, item, x, y, type) {
    // Используем UGO поле для определения SVG иконки, если оно доступно
    const ugoValue = item.ugo || item.UGO || item['ugo'] || null;
    let icon;

    if (ugoValue) {
      // Если есть UGO значение, используем его для загрузки SVG
      icon = await loadSvgIcon(ugoValue);
    } else {
      // Иначе используем старую логику с типом устройства
      const deviceType = item.type || item.Type || 'default';
      icon = await loadSvgIcon(deviceType.toLowerCase());
    }

    // Получаем значения масштабирования, если они есть
    const scaleX = item.scaleX || item.scalex || item.SCALEX || 1;
    const scaleY = item.scaleY || item.scaley || item.SCALEY || 1;

    // Создаем группу для устройства
    const g = selection.append('g')
      .attr('class', `device ${type}`)
      .attr('data-id', item.id)
      .attr('data-type', item.type || item.Type || '')
      .attr('data-brand', item.brand || item.Brand || '')
      .attr('data-feeder-name', item.feeder_name || item['feeder-name'] || item['feederName'] || item.FEEDER_NAME || '')
      .attr('data-feeder-num', item.feeder_num || item['feeder-num'] || item['feederNum'] || item.FEEDER_NUM || '')
      .attr('data-ugo', ugoValue || '')
      .attr('data-scale-x', scaleX)
      .attr('data-scale-y', scaleY);

    // Добавляем внутреннюю группу с трансформацией для масштабирования и позиционирования
    const transformGroup = g.append('g')
      .attr('transform', `translate(${x}, ${y}) scale(${scaleX}, ${scaleY})`);

    // Добавляем SVG иконку во внутреннюю группу
    transformGroup.append('g')
      .html(icon);

    // Добавляем обводку (рамочку) для подсветки при наведении
    // Создаем прямоугольник с учетом масштабирования из таблицы
    const bbox = getBBoxFromSVGString(icon); // Получаем размеры SVG
    const rect = g.append('rect')  // Добавляем прямоугольник в основную группу (до применения масштаба)
      .attr('x', x)  // Позиционируем относительно исходных координат
      .attr('y', y)
      .attr('width', (bbox.width || 40) * scaleX)  // Умножаем на масштаб из таблицы
      .attr('height', (bbox.height || 20) * scaleY)
      .attr('fill', 'none')
      .attr('stroke', 'transparent')
      .attr('stroke-width', 2)
      .attr('pointer-events', 'all') // Разрешаем события мыши на прямоугольнике
      .attr('class', 'highlight-rect');

    // Добавляем текстовую информацию
    const brandInfo = item.brand || item.Brand || item.type || item.Type || '';
    const feederNum = item.feeder_num || item['feeder-num'] || item['feederNum'] || item.FEEDER_NUM || '';
    const displayText = `${brandInfo} ${feederNum ? '#' + feederNum : ''}`;

    g.append('text')
      .attr('x', x + 20 * scaleX)  // Учитываем масштаб при позиционировании текста
      .attr('y', y + 35 * scaleY)  // Учитываем масштаб при позиционировании текста
      .attr('font-size', '10px')
      .attr('text-anchor', 'middle')
      .text(displayText);

    // Обработчик наведения мыши - показываем рамочку
    g.on('mouseover', function(event) {
      rect.attr('stroke', '#007bff')
          .attr('stroke-width', 2)
          .attr('stroke-dasharray', '4,2');
    });

    // Обработчик ухода мыши - скрываем рамочку
    g.on('mouseout', function(event) {
      rect.attr('stroke', 'transparent');
    });

    // Обработчик клика - открываем панель информации
    g.on('click', function(event) {
      showDeviceInfoPanel(item);
    });
  }

  // ========================================
  // ПУБЛИЧНЫЕ МЕТОДЫ
  // ========================================

  /**
   * Инициализировать контейнер для схемы
   */
  function initializeSchemaContainer() {
    return initializeSvgContainer();
  }

  /**
   * Отрисовать схему на основе данных
   * @param {Object} data - Данные для отрисовки
   * @param {Object} config - Конфигурация отрисовки
   */
  async function drawSchema(data, config) {
    if (!initializeSchemaContainer()) {
      return;
    }

    console.log('Отрисовка схемы с конфигурацией:', config);

    // Объединяем все данные из всех фидеров для проверки наличия координат
    const allData = [];
    Object.values(data).forEach(feederData => {
      allData.push(...feederData);
    });

    // Проверяем, есть ли в данных поля ptX и ptY (координаты)
    const hasCoordinates = allData.length > 0 &&
                          (allData[0].hasOwnProperty('ptX') || allData[0].hasOwnProperty('ptx')) &&
                          (allData[0].hasOwnProperty('ptY') || allData[0].hasOwnProperty('pty'));

    // Если есть координаты, используем новый режим отрисовки
    if (hasCoordinates) {
      // Сортируем по manualSort если поле существует
      if (allData.length > 0 && allData[0].hasOwnProperty('manualSort')) {
        allData.sort((a, b) => (a.manualSort || 0) - (b.manualSort || 0));
      }

      await drawCoordinateSchema(allData);
    } else {
      // Иначе используем старый режим группировки по фидерам
      if (config.groupByFeeder) {
        // Отрисовываем каждый фидер отдельно
        let feederIndex = 0;
        for (const feederName of Object.keys(data)) {
          await drawFeederSchema(data[feederName], feederName, feederIndex);
          feederIndex++;
        }
      } else {
        // Отрисовываем все данные как один фидер
        await drawFeederSchema(allData, 'Все данные', 0);
      }
    }

    // Применяем масштаб
    if (svg && config.scale && config.scale !== 1) {
      svg.transition().duration(750)
        .call(zoom.scaleTo, config.scale);
    }
  }

  /**
   * Показать панель информации об устройстве с возможностью редактирования
   * @param {Object} item - Данные устройства
   */
  function showDeviceInfoPanel(item) {
    // Удаляем существующую панель, если она есть
    const existingPanel = document.getElementById('device-info-panel');
    if (existingPanel) {
      existingPanel.remove();
    }

    // Создаем панель информации
    const panel = document.createElement('div');
    panel.id = 'device-info-panel';
    panel.style.position = 'fixed';
    panel.style.top = '10px';
    panel.style.right = '10px';
    panel.style.width = '400px';
    panel.style.maxHeight = 'calc(100vh - 20px)';
    panel.style.backgroundColor = 'white';
    panel.style.border = '1px solid #ccc';
    panel.style.borderRadius = '5px';
    panel.style.padding = '15px';
    panel.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
    panel.style.overflowY = 'auto';
    panel.style.zIndex = '1000';
    panel.style.fontFamily = 'Arial, sans-serif';

    // Заголовок панели
    const title = document.createElement('h3');
    title.textContent = 'Информация об устройстве';
    title.style.marginTop = '0';
    title.style.marginBottom = '15px';
    title.style.borderBottom = '1px solid #eee';
    title.style.paddingBottom = '5px';
    panel.appendChild(title);

    // Кнопка закрытия
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.style.position = 'absolute';
    closeBtn.style.top = '5px';
    closeBtn.style.right = '5px';
    closeBtn.style.background = 'none';
    closeBtn.style.border = 'none';
    closeBtn.style.fontSize = '20px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.color = '#999';
    closeBtn.onclick = function() {
      panel.remove();
    };
    panel.appendChild(closeBtn);

    // Создаем форму для редактирования
    const form = document.createElement('form');
    form.id = 'device-edit-form';
    form.style.marginTop = '10px';

    // Создаем таблицу для отображения и редактирования данных
    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.style.marginBottom = '15px';

    // Определяем категории полей для лучшей организации
    const locationFields = ['ptX', 'ptY', 'scaleX', 'scaleY']; // Координаты и масштаб
    const identificationFields = ['id', 'feeder_name', 'feeder_num', 'Type', 'Brand']; // Идентификация
    const otherFields = []; // Все остальные поля

    // Классифицируем поля
    Object.keys(item).forEach(key => {
      if (!locationFields.includes(key) && !identificationFields.includes(key)) {
        otherFields.push(key);
      }
    });

    // Функция для создания строки таблицы
    function createFieldRow(key, value, isReadOnly = false) {
      const row = document.createElement('tr');

      const keyCell = document.createElement('td');
      // Добавляем пояснения к названиям полей
      let displayName = key;
      switch(key) {
        case 'ptX':
          displayName = 'Координата X';
          break;
        case 'ptY':
          displayName = 'Координата Y';
          break;
        case 'scaleX':
          displayName = 'Масштаб X';
          break;
        case 'scaleY':
          displayName = 'Масштаб Y';
          break;
        case 'feeder_name':
          displayName = 'Имя фидера';
          break;
        case 'feeder_num':
          displayName = 'Номер фидера';
          break;
        case 'Type':
          displayName = 'Тип устройства';
          break;
        case 'Brand':
          displayName = 'Бренд';
          break;
        case 'UGO':
          displayName = 'Имя SVG файла';
          break;
        case 'feeder_row':
          displayName = 'Ряд фидера';
          break;
        case 'feeder_col':
          displayName = 'Колонка фидера';
          break;
        case 'manualSort':
          displayName = 'Сортировка вручную';
          break;
        default:
          displayName = key;
      }

      keyCell.textContent = displayName;
      keyCell.style.fontWeight = 'bold';
      keyCell.style.border = '1px solid #ddd';
      keyCell.style.padding = '8px';
      keyCell.style.backgroundColor = '#f5f5f5';
      keyCell.style.verticalAlign = 'top';
      keyCell.style.width = '40%';

      const valueCell = document.createElement('td');
      valueCell.style.border = '1px solid #ddd';
      valueCell.style.padding = '8px';
      valueCell.style.width = '60%';

      if (isReadOnly) {
        // Для readonly полей просто отображаем значение
        valueCell.textContent = value !== null && value !== undefined ? value.toString() : '';
      } else {
        // Для редактируемых полей создаем input
        const input = document.createElement('input');
        input.type = 'text';
        input.name = key;
        input.value = value !== null && value !== undefined ? value.toString() : '';
        input.style.width = '100%';
        input.style.padding = '4px';
        input.style.border = '1px solid #ccc';
        input.style.borderRadius = '3px';
        valueCell.appendChild(input);
      }

      row.appendChild(keyCell);
      row.appendChild(valueCell);
      return row;
    }

    // Добавляем поля в определенном порядке: сначала идентификация, потом координаты, потом остальные
    [...identificationFields, ...locationFields, ...otherFields].forEach(key => {
      if (item.hasOwnProperty(key)) {
        const isReadOnly = (key === 'id'); // id делаем readonly
        const row = createFieldRow(key, item[key], isReadOnly);
        table.appendChild(row);
      }
    });

    form.appendChild(table);

    // Кнопки управления
    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.gap = '10px';
    buttonContainer.style.marginTop = '15px';

    // Кнопка сохранения
    const saveBtn = document.createElement('button');
    saveBtn.type = 'submit';
    saveBtn.textContent = 'Сохранить';
    saveBtn.className = 'btn btn-success';
    saveBtn.style.flex = '1';
    saveBtn.style.backgroundColor = '#28a745';
    saveBtn.style.color = 'white';
    saveBtn.style.border = 'none';
    saveBtn.style.padding = '8px';
    saveBtn.style.borderRadius = '4px';
    saveBtn.style.cursor = 'pointer';

    // Кнопка удаления
    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.textContent = 'Удалить';
    deleteBtn.className = 'btn btn-danger';
    deleteBtn.style.flex = '1';
    deleteBtn.style.backgroundColor = '#dc3545';
    deleteBtn.style.color = 'white';
    deleteBtn.style.border = 'none';
    deleteBtn.style.padding = '8px';
    deleteBtn.style.borderRadius = '4px';
    deleteBtn.style.cursor = 'pointer';
    deleteBtn.onclick = async function() {
      if (confirm('Вы уверены, что хотите удалить это устройство?')) {
        try {
          // Удаляем запись из Grist
          await grist.docApi.applyUserActions([
            ['RemoveRecord', 'Schema', item.id]  // Предполагаем, что таблица называется 'Schema'
          ]);

          // Закрываем панель
          panel.remove();

          // Обновляем схему
          const config = ConfigModule.getConfig();
          const data = await DataModule.loadData(config.table || 'Schema');
          await SchemaModule.drawSchema(data, config);

          UIModule.showStatusMessage('Устройство успешно удалено', 'success');
        } catch (error) {
          console.error('Ошибка при удалении устройства:', error);
          UIModule.showStatusMessage(`Ошибка при удалении: ${error.message}`, 'error');
        }
      }
    };

    buttonContainer.appendChild(saveBtn);
    buttonContainer.appendChild(deleteBtn);

    // Обработка отправки формы
    form.onsubmit = async function(e) {
      e.preventDefault();

      try {
        // Собираем обновленные данные
        const formData = new FormData(form);
        const updateObj = {};

        for (let [key, value] of formData.entries()) {
          // Проверяем, изменилось ли значение
          if (item[key] !== value) {
            // Пытаемся преобразовать числовые значения
            if (!isNaN(value) && value.trim() !== '') {
              updateObj[key] = Number(value);
            } else {
              updateObj[key] = value;
            }
          }
        }

        // Если нет изменений, выходим
        if (Object.keys(updateObj).length === 0) {
          UIModule.showStatusMessage('Нет изменений для сохранения', 'info');
          return;
        }

        // Обновляем запись в Grist
        await grist.docApi.applyUserActions([
          ['UpdateRecord', 'Schema', item.id, updateObj]  // Предполагаем, что таблица называется 'Schema'
        ]);

        // Обновляем схему
        const config = ConfigModule.getConfig();
        const data = await DataModule.loadData(config.table || 'Schema');
        await SchemaModule.drawSchema(data, config);

        UIModule.showStatusMessage('Устройство успешно обновлено', 'success');
      } catch (error) {
        console.error('Ошибка при обновлении устройства:', error);
        UIModule.showStatusMessage(`Ошибка при обновлении: ${error.message}`, 'error');
      }
    };

    form.appendChild(buttonContainer);
    panel.appendChild(form);

    // Добавляем панель к документу
    document.body.appendChild(panel);
  }

  // ========================================
  // ЭКСПОРТ ПУБЛИЧНОГО API
  // ========================================

  return {
    drawSchema: drawSchema,
    clearSchema: clearSchema,
    initializeSchemaContainer: initializeSchemaContainer
  };
})();