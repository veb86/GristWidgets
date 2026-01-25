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

  // SVG иконки для различных типов устройств
  const deviceIcons = {
    'АВ': null,
    'АВДТ': null,
    'default': null
  };

  // Загрузка SVG иконок
  const avSvg = d3.xml('./svg/av.svg').then(svg => svg.documentElement.outerHTML);
  const avdtSvg = d3.xml('./svg/avdt.svg').then(svg => svg.documentElement.outerHTML);
  const defaultSvg = d3.xml('./svg/default.svg').then(svg => svg.documentElement.outerHTML);

  // Инициализация иконок после загрузки
  Promise.all([avSvg, avdtSvg, defaultSvg]).then(([av, avdt, def]) => {
    deviceIcons['АВ'] = av;
    deviceIcons['АВДТ'] = avdt;
    deviceIcons['default'] = def;
  });

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
   * Отрисовать схему для одного фидера
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
   * Отрисовать устройство
   * @param {Object} selection - D3 selection
   * @param {Object} item - Данные устройства
   * @param {number} x - X координата
   * @param {number} y - Y координата
   * @param {string} type - Тип устройства ('main' или 'module')
   */
  async function drawDevice(selection, item, x, y, type) {
    const deviceType = item.type || 'default';
    let icon = deviceIcons[deviceType] || deviceIcons['default'];

    // Если иконка еще не загружена, ждем её загрузки
    if (!icon) {
      if (deviceType === 'АВ') {
        icon = await avSvg;
      } else if (deviceType === 'АВДТ') {
        icon = await avdtSvg;
      } else {
        icon = await defaultSvg;
      }
    }

    // Создаем группу для устройства
    const g = selection.append('g')
      .attr('class', `device ${type}`)
      .attr('transform', `translate(${x}, ${y})`)
      .attr('data-id', item.id)
      .attr('data-type', deviceType)
      .attr('data-brand', item.brand || '')
      .attr('data-feeder-row', item.feeder_row || '')
      .attr('data-feeder-col', item.feeder_col || '');

    // Добавляем SVG иконку
    g.append('g')
      .html(icon);

    // Добавляем текстовую информацию
    g.append('text')
      .attr('x', 20)
      .attr('y', 35)
      .attr('font-size', '10px')
      .attr('text-anchor', 'middle')
      .text(`${item.feeder_row || 'N/A'}: ${item.brand || ''}`);

    // Добавляем обработчик клика
    g.on('click', function(event) {
      console.log('Клик по устройству:', item);
      // Здесь можно добавить обработку клика
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

    // Ждем загрузки всех SVG иконок
    await Promise.all([avSvg, avdtSvg, defaultSvg]);

    // Если нужно группировать по фидерам
    if (config.groupByFeeder) {
      // Отрисовываем каждый фидер отдельно
      let feederIndex = 0;
      for (const feederName of Object.keys(data)) {
        await drawFeederSchema(data[feederName], feederName, feederIndex);
        feederIndex++;
      }
    } else {
      // Отрисовываем все данные как один фидер
      const allData = [];
      Object.values(data).forEach(feederData => {
        allData.push(...feederData);
      });
      await drawFeederSchema(allData, 'Все данные', 0);
    }

    // Применяем масштаб
    if (svg && config.scale && config.scale !== 1) {
      svg.transition().duration(750)
        .call(zoom.scaleTo, config.scale);
    }
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