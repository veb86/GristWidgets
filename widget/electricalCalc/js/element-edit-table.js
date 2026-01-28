/**
 * Web Component для редактирования таблицы
 */
class ElementEditTable extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    // Стили для компонента
    const style = document.createElement('style');
    style.textContent = `
      :host {
        display: block;
        height: 100%;
        width: 100%;
      }
      
      .container {
        height: 100%;
        padding: 10px;
        box-sizing: border-box;
      }
      
      .table-selector {
        margin-bottom: 15px;
      }
      
      .table-selector label {
        display: block;
        margin-bottom: 5px;
        font-weight: bold;
      }
      
      .table-selector select {
        width: 100%;
        padding: 5px;
      }
      
      #add-row-btn {
        margin-bottom: 10px;
        padding: 8px 15px;
        background-color: #007bff;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
      }
      
      #add-row-btn:hover {
        background-color: #0056b3;
      }
      
      #status-message {
        margin-bottom: 10px;
        padding: 8px;
        border-radius: 4px;
        display: none;
      }
      
      #status-message.success {
        background-color: #d4edda;
        color: #155724;
        display: block;
      }
      
      #status-message.error {
        background-color: #f8d7da;
        color: #721c24;
        display: block;
      }
      
      #table-container {
        height: calc(100% - 120px);
        overflow: auto;
      }
      
      .tabulator {
        height: 100%;
      }
    `;
    
    // HTML содержимое компонента
    const template = document.createElement('template');
    template.innerHTML = `
      <div class="container">
        <div class="table-selector">
          <label for="table-select"><strong>Выберите таблицу:</strong></label>
          <select id="table-select">
            <option value="">-- Загрузка таблиц... --</option>
          </select>
          <div class="form-text">Выберите таблицу для редактирования данных</div>
        </div>

        <div class="mb-3">
          <button id="add-row-btn">Добавить строку</button>
        </div>
        
        <div id="status-message"></div>
        <div id="table-container"></div>
      </div>
    `;
    
    // Добавляем стили и шаблон в shadow DOM
    this.shadowRoot.appendChild(style);
    this.shadowRoot.appendChild(template.content.cloneNode(true));
    
    // Инициализация свойств
    this.table = null;
    this.currentTableName = '';
    this.unsubscribeFn = null;
    this.tableSelect = null;
    this.addRowBtn = null;
    this.statusMessage = null;
    this.tableContainer = null;
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
    this.tableSelect = this.shadowRoot.getElementById('table-select');
    this.addRowBtn = this.shadowRoot.getElementById('add-row-btn');
    this.statusMessage = this.shadowRoot.getElementById('status-message');
    this.tableContainer = this.shadowRoot.getElementById('table-container');
    
    // Настройка обработчиков событий
    this.setupEventListeners();
    
    // Загрузка списка таблиц
    this.loadTableList();
    
    // Подписка на обновления данных через AppHost
    this.subscribeToDataUpdates();
  }
  
  setupEventListeners() {
    // Обработчик изменения выбранной таблицы
    this.tableSelect.addEventListener('change', (e) => {
      this.currentTableName = e.target.value;
      if (this.currentTableName) {
        this.loadTableData(this.currentTableName);
      }
    });
    
    // Обработчик добавления новой строки
    this.addRowBtn.addEventListener('click', () => {
      this.addRow();
    });
  }
  
  async loadTableList() {
    try {
      // Загружаем список таблиц из Grist API
      if (window.grist) {
        const tables = await window.grist.docApi.listTables();
        this.populateTableSelect(tables);
      } else {
        // Если Grist API недоступен, используем тестовые данные
        this.populateTableSelect(['Table1', 'Table2', 'Table3']);
      }
    } catch (error) {
      console.error('Error loading table list:', error);
      this.showMessage('Ошибка загрузки списка таблиц', 'error');
    }
  }
  
  populateTableSelect(tables) {
    // Очищаем текущие опции
    this.tableSelect.innerHTML = '<option value="">-- Выберите таблицу --</option>';
    
    // Добавляем новые опции
    tables.forEach(table => {
      const option = document.createElement('option');
      option.value = table;
      option.textContent = table;
      this.tableSelect.appendChild(option);
    });
  }
  
  async loadTableData(tableName) {
    try {
      this.showMessage('Загрузка данных...', 'info');
      
      // Загружаем данные таблицы из Grist API
      let tableData;
      if (window.grist) {
        tableData = await window.grist.docApi.fetchTable(tableName);
      } else {
        // Тестовые данные, если Grist API недоступен
        tableData = {
          table_name: tableName,
          column_metadata: [
            { id: 'id', type: 'Int' },
            { id: 'name', type: 'Text' },
            { id: 'description', type: 'Text' }
          ],
          table_data: [
            [1, 'Item 1', 'Description 1'],
            [2, 'Item 2', 'Description 2'],
            [3, 'Item 3', 'Description 3']
          ]
        };
      }
      
      // Инициализируем Tabulator с полученными данными
      this.initializeTable(tableData);
      
      this.showMessage(`Данные таблицы ${tableName} загружены`, 'success');
    } catch (error) {
      console.error('Error loading table data:', error);
      this.showMessage('Ошибка загрузки данных таблицы', 'error');
    }
  }
  
  initializeTable(tableData) {
    // Очищаем контейнер таблицы
    this.tableContainer.innerHTML = '';
    
    // Подготовка данных для Tabulator
    const columns = this.prepareColumns(tableData.column_metadata);
    const rows = this.prepareRows(tableData.table_data, tableData.column_metadata);
    
    // Создаем таблицу Tabulator
    this.table = new Tabulator(this.tableContainer, {
      data: rows,
      layout: "fitColumns",
      columns: columns,
      height: "100%",
      movableColumns: true,
      columnHeaderVertAlign: "bottom",
      cellEdited: (cell) => {
        this.handleCellEdit(cell);
      }
    });
  }
  
  prepareColumns(columnMetadata) {
    // Подготовка колонок для Tabulator
    return columnMetadata.map(col => {
      return {
        title: col.id,
        field: col.id,
        editor: true,
        headerTooltip: true
      };
    });
  }
  
  prepareRows(tableData, columnMetadata) {
    // Подготовка строк для Tabulator
    return tableData.map(row => {
      const obj = {};
      columnMetadata.forEach((col, index) => {
        obj[col.id] = row[index];
      });
      return obj;
    });
  }
  
  handleCellEdit(cell) {
    // Обработка редактирования ячейки
    const fieldName = cell.getField();
    const newValue = cell.getValue();
    const rowData = cell.getRow().getData();
    
    // Отправляем событие об изменении данных
    this.dispatchEvent(new CustomEvent('cell-edited', {
      detail: { 
        field: fieldName, 
        value: newValue, 
        rowData: rowData,
        tableName: this.currentTableName
      },
      bubbles: true,
      composed: true
    }));
    
    // Если доступен Grist API, применяем изменения
    if (window.grist) {
      this.applyChangesToGrist(fieldName, newValue, rowData);
    }
  }
  
  async applyChangesToGrist(fieldName, newValue, rowData) {
    try {
      // Подготовка действия для обновления записи
      const rowId = rowData.id || rowData.ID || Object.values(rowData)[0]; // Простая логика получения ID
      
      // Применяем действие через Grist API
      await window.grist.docApi.applyUserActions([
        ["UpdateRecord", this.currentTableName, rowId, {[fieldName]: newValue}]
      ]);
      
      this.showMessage('Данные успешно обновлены', 'success');
    } catch (error) {
      console.error('Error applying changes to Grist:', error);
      this.showMessage('Ошибка обновления данных', 'error');
    }
  }
  
  async addRow() {
    if (!this.currentTableName) {
      this.showMessage('Выберите таблицу', 'error');
      return;
    }
    
    try {
      // Подготовка новой строки с пустыми значениями
      const newRow = {};
      
      // Получаем структуру таблицы для создания новой строки
      if (window.grist) {
        const tableInfo = await window.grist.docApi.fetchTable(this.currentTableName);
        tableInfo.column_metadata.forEach(col => {
          newRow[col.id] = ''; // Инициализируем пустыми значениями
        });
      }
      
      // Добавляем новую строку в таблицу
      if (this.table) {
        this.table.addData([newRow]);
        
        // Если доступен Grist API, добавляем запись
        if (window.grist) {
          await window.grist.docApi.applyUserActions([
            ["AddRecord", this.currentTableName, null, newRow]
          ]);
          
          this.showMessage('Новая строка добавлена', 'success');
        }
      }
    } catch (error) {
      console.error('Error adding row:', error);
      this.showMessage('Ошибка добавления строки', 'error');
    }
  }
  
  subscribeToDataUpdates() {
    // Подписываемся на обновления данных через AppHost
    this.unsubscribeFn = window.AppHost.subscribe((data) => {
      if (data && data.type === 'records' && data.tableName === this.currentTableName) {
        this.processRecords(data.data);
      }
    });
  }
  
  processRecords(records) {
    // Обрабатываем полученные записи и обновляем таблицу
    if (this.table && records) {
      const rows = this.prepareRows(records.table_data, records.column_metadata);
      this.table.setData(rows);
    }
  }
  
  showMessage(message, type) {
    // Показываем сообщение пользователю
    this.statusMessage.textContent = message;
    this.statusMessage.className = type;
    
    // Автоматически скрываем сообщение через 3 секунды
    setTimeout(() => {
      this.statusMessage.className = '';
    }, 3000);
  }
}

// Регистрируем Web Component
customElements.define('element-edit-table', ElementEditTable);