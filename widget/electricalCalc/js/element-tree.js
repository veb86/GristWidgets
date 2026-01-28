/**
 * Web Component для дерева иерархии устройств
 */
class ElementTree extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    // Стили для компонента
    const style = document.createElement('style');
    style.textContent = `
      :host {
        display: block;
        height: 100%;
      }
      
      #tree-container {
        height: calc(100% - 60px);
        overflow: auto;
        padding: 10px;
      }
      
      #settings-panel {
        display: none;
        background: #f8f9fa;
        padding: 15px;
        border-bottom: 1px solid #ddd;
      }
      
      #settings-panel.active {
        display: block;
      }
      
      .settings-row {
        margin-bottom: 10px;
        display: flex;
        align-items: center;
      }
      
      .settings-row label {
        width: 180px;
        font-size: 12px;
        margin-right: 10px;
      }
      
      .settings-row input, .settings-row select {
        flex: 1;
        padding: 5px;
        font-size: 12px;
      }
      
      #settings-toggle {
        position: absolute;
        top: 10px;
        right: 10px;
        z-index: 1000;
        background: #f0f0f0;
        border: 1px solid #ccc;
        border-radius: 3px;
        padding: 5px 10px;
        cursor: pointer;
      }
      
      #status {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        background: #f8f9fa;
        padding: 5px 10px;
        border-top: 1px solid #ddd;
        font-size: 12px;
        height: 30px;
      }
    `;
    
    // HTML содержимое компонента
    const template = document.createElement('template');
    template.innerHTML = `
      <button id="settings-toggle">⚙️</button>
      <div id="settings-panel">
        <div class="settings-row">
          <label>Поле ID устройства:</label>
          <input type="text" id="field-id" value="NMO_BaseName" placeholder="NMO_BaseName">
        </div>
        <div class="settings-row">
          <label>Поле родителя:</label>
          <input type="text" id="field-parent" value="HeadDeviceName" placeholder="HeadDeviceName">
        </div>
        <div class="settings-row">
          <label>Поле флага иерархии:</label>
          <input type="text" id="field-flag" value="icanbeheadunit" placeholder="icanbeheadunit">
        </div>
        <div class="settings-row">
          <label>Поле отображения:</label>
          <input type="text" id="field-display" value="NMO_BaseName" placeholder="Оставьте пустым = ID">
        </div>
        <div class="settings-row">
          <label>Целевая таблица для фильтрации:</label>
          <select id="target-table">
            <option value="">Текущая таблица</option>
          </select>
        </div>
      </div>
      <div id="tree-container">
        <div id="tree"></div>
      </div>
      <div id="status">
        <span class="loading"></span>
        <span id="status-text">Инициализация...</span>
      </div>
    `;
    
    // Добавляем стили и шаблон в shadow DOM
    this.shadowRoot.appendChild(style);
    this.shadowRoot.appendChild(template.content.cloneNode(true));
    
    // Инициализация свойств
    this.treeData = [];
    this.unsubscribeFn = null;
  }
  
  connectedCallback() {
    // Инициализация компонента при подключении к DOM
    this.initializeComponent();
  }
  
  disconnectedCallback() {
    // Очистка при отключении от DOM
    if (this.unsubscribeFn) {
      this.unsubscribeFn();
    }
  }
  
  initializeComponent() {
    // Получаем элементы DOM
    this.treeContainer = this.shadowRoot.getElementById('tree');
    this.statusText = this.shadowRoot.getElementById('status-text');
    this.settingsToggle = this.shadowRoot.getElementById('settings-toggle');
    this.settingsPanel = this.shadowRoot.getElementById('settings-panel');
    
    // Настройка обработчиков событий
    this.setupEventListeners();
    
    // Инициализация дерева
    this.initializeTree();
    
    // Подписка на обновления данных через AppHost
    this.subscribeToDataUpdates();
  }
  
  setupEventListeners() {
    // Обработчик переключения панели настроек
    this.settingsToggle.addEventListener('click', () => {
      this.settingsPanel.classList.toggle('active');
    });
    
    // Обработчики для элементов настроек
    const fieldIdInput = this.shadowRoot.getElementById('field-id');
    const fieldParentInput = this.shadowRoot.getElementById('field-parent');
    const fieldFlagInput = this.shadowRoot.getElementById('field-flag');
    const fieldDisplayInput = this.shadowRoot.getElementById('field-display');
    
    fieldIdInput.addEventListener('change', (e) => {
      this.fieldId = e.target.value;
      this.updateTree();
    });
    
    fieldParentInput.addEventListener('change', (e) => {
      this.fieldParent = e.target.value;
      this.updateTree();
    });
    
    fieldFlagInput.addEventListener('change', (e) => {
      this.fieldFlag = e.target.value;
      this.updateTree();
    });
    
    fieldDisplayInput.addEventListener('change', (e) => {
      this.fieldDisplay = e.target.value;
      this.updateTree();
    });
  }
  
  initializeTree() {
    // Устанавливаем начальные значения полей
    this.fieldId = this.shadowRoot.getElementById('field-id').value;
    this.fieldParent = this.shadowRoot.getElementById('field-parent').value;
    this.fieldFlag = this.shadowRoot.getElementById('field-flag').value;
    this.fieldDisplay = this.shadowRoot.getElementById('field-display').value;
    
    // Инициализация jsTree
    $(this.treeContainer).jstree({
      'core': {
        'data': []
      },
      'plugins': ['search']
    });
    
    // Обработчик выбора узла в дереве
    $(this.treeContainer).on('select_node.jstree', (e, data) => {
      // Отправляем событие о выборе узла
      const selectedId = data.node.id;
      window.AppHost.setSelectedRows([selectedId]);
      
      // Отправляем кастомное событие
      this.dispatchEvent(new CustomEvent('node-selected', {
        detail: { nodeId: selectedId, nodeData: data.node },
        bubbles: true,
        composed: true
      }));
    });
    
    this.updateStatus('Готово');
  }
  
  subscribeToDataUpdates() {
    // Подписываемся на обновления данных через AppHost
    this.unsubscribeFn = window.AppHost.subscribe((data) => {
      if (data && data.type === 'records') {
        this.processRecords(data.data);
      }
    });
  }
  
  processRecords(records) {
    // Обрабатываем полученные записи и строим дерево
    this.updateStatus('Обновление дерева...');
    
    // Преобразуем записи в древовидную структуру
    this.treeData = this.buildTreeFromRecords(records);
    
    // Обновляем дерево
    this.updateTree();
  }
  
  buildTreeFromRecords(records) {
    if (!records || records.length === 0) {
      return [];
    }
    
    // Определяем индексы колонок
    const idColIndex = this.getColumnIndex(records, this.fieldId);
    const parentColIndex = this.getColumnIndex(records, this.fieldParent);
    const flagColIndex = this.getColumnIndex(records, this.fieldFlag);
    const displayColIndex = this.getColumnIndex(records, this.fieldDisplay);
    
    // Создаем карту записей по ID
    const recordMap = {};
    records.forEach(record => {
      const id = record[idColIndex];
      if (id !== undefined && id !== null) {
        recordMap[id] = record;
      }
    });
    
    // Строим дерево
    const nodes = [];
    records.forEach(record => {
      const id = record[idColIndex];
      const parentId = record[parentColIndex];
      const flagValue = record[flagColIndex];
      const displayValue = record[displayColIndex] || id;
      
      if (id !== undefined && id !== null) {
        const node = {
          id: id.toString(),
          text: displayValue,
          parent: parentId && parentId !== '' ? parentId.toString() : '#',
          state: { opened: true },
          data: { record: record }
        };
        
        // Добавляем иконку в зависимости от типа устройства
        if (flagValue) {
          node.icon = 'folder';
        } else {
          node.icon = 'file';
        }
        
        nodes.push(node);
      }
    });
    
    return nodes;
  }
  
  getColumnIndex(records, columnName) {
    // Находим индекс колонки по имени
    if (records.columns && records.columns.columnNames) {
      return records.columns.columnNames.indexOf(columnName);
    }
    return -1;
  }
  
  updateTree() {
    if (!this.treeData || this.treeData.length === 0) {
      return;
    }
    
    // Обновляем дерево с новыми данными
    $(this.treeContainer).jstree(true).settings.core.data = this.treeData;
    $(this.treeContainer).jstree(true).refresh();
    
    this.updateStatus(`Загружено ${this.treeData.length} элементов`);
  }
  
  updateStatus(message) {
    if (this.statusText) {
      this.statusText.textContent = message;
    }
  }
}

// Регистрируем Web Component
customElements.define('element-tree', ElementTree);