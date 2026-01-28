/**
 * Web Component для отображения однолинейной схемы
 */
class ElementOneLineSchema extends HTMLElement {
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
        display: flex;
        flex-direction: column;
      }
      
      .controls {
        display: flex;
        gap: 10px;
        margin-bottom: 15px;
        flex-wrap: wrap;
      }
      
      .control-group {
        display: flex;
        flex-direction: column;
        gap: 5px;
      }
      
      .control-group label {
        font-size: 12px;
        font-weight: bold;
      }
      
      .control-group input, .control-group select {
        padding: 5px;
        font-size: 12px;
      }
      
      #schema-container {
        flex: 1;
        border: 1px solid #ddd;
        background-color: #f9f9f9;
        overflow: auto;
        position: relative;
      }
      
      #status-bar {
        margin-top: 10px;
        padding: 8px;
        background-color: #f0f0f0;
        border: 1px solid #ddd;
        font-size: 12px;
      }
      
      .schema-element {
        position: absolute;
        border: 1px solid #333;
        background-color: #fff;
        padding: 8px;
        border-radius: 4px;
        cursor: move;
        user-select: none;
        min-width: 80px;
        text-align: center;
        font-size: 12px;
      }
      
      .schema-element.selected {
        border: 2px solid #007bff;
        box-shadow: 0 0 5px rgba(0, 123, 255, 0.5);
      }
      
      .schema-connection {
        position: absolute;
        background-color: #333;
        z-index: 1;
      }
      
      .zoom-controls {
        display: flex;
        gap: 5px;
        align-items: center;
      }
      
      .zoom-controls button {
        padding: 5px 10px;
        background-color: #007bff;
        color: white;
        border: none;
        border-radius: 3px;
        cursor: pointer;
        font-size: 12px;
      }
      
      .zoom-controls button:hover {
        background-color: #0056b3;
      }
      
      .zoom-level {
        font-size: 12px;
        min-width: 60px;
        text-align: center;
      }
    `;
    
    // HTML содержимое компонента
    const template = document.createElement('template');
    template.innerHTML = `
      <div class="container">
        <div class="controls">
          <div class="control-group">
            <label>Тип элемента:</label>
            <select id="element-type">
              <option value="breaker">Выключатель</option>
              <option value="transformer">Трансформатор</option>
              <option value="cable">Кабель</option>
              <option value="motor">Двигатель</option>
              <option value="generator">Генератор</option>
            </select>
          </div>
          
          <div class="control-group">
            <label>Название:</label>
            <input type="text" id="element-name" placeholder="Введите название">
          </div>
          
          <div class="control-group">
            <label>Цвет:</label>
            <input type="color" id="element-color" value="#ffffff">
          </div>
          
          <div class="zoom-controls">
            <button id="zoom-in">+</button>
            <div class="zoom-level" id="zoom-level">100%</div>
            <button id="zoom-out">-</button>
          </div>
          
          <button id="add-element">Добавить элемент</button>
          <button id="clear-schema">Очистить</button>
        </div>
        
        <div id="schema-container"></div>
        
        <div id="status-bar">
          <span id="status-text">Готово к работе</span>
        </div>
      </div>
    `;
    
    // Добавляем стили и шаблон в shadow DOM
    this.shadowRoot.appendChild(style);
    this.shadowRoot.appendChild(template.content.cloneNode(true));
    
    // Инициализация свойств
    this.elements = [];
    this.connections = [];
    this.selectedElement = null;
    this.zoomLevel = 100;
    this.isDragging = false;
    this.dragOffsetX = 0;
    this.dragOffsetY = 0;
    this.unsubscribeFn = null;
    
    // Элементы DOM
    this.schemaContainer = null;
    this.elementTypeSelect = null;
    this.elementNameInput = null;
    this.elementColorInput = null;
    this.addElementBtn = null;
    this.clearSchemaBtn = null;
    this.zoomInBtn = null;
    this.zoomOutBtn = null;
    this.zoomLevelDisplay = null;
    this.statusText = null;
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
    this.schemaContainer = this.shadowRoot.getElementById('schema-container');
    this.elementTypeSelect = this.shadowRoot.getElementById('element-type');
    this.elementNameInput = this.shadowRoot.getElementById('element-name');
    this.elementColorInput = this.shadowRoot.getElementById('element-color');
    this.addElementBtn = this.shadowRoot.getElementById('add-element');
    this.clearSchemaBtn = this.shadowRoot.getElementById('clear-schema');
    this.zoomInBtn = this.shadowRoot.getElementById('zoom-in');
    this.zoomOutBtn = this.shadowRoot.getElementById('zoom-out');
    this.zoomLevelDisplay = this.shadowRoot.getElementById('zoom-level');
    this.statusText = this.shadowRoot.getElementById('status-text');
    
    // Настройка обработчиков событий
    this.setupEventListeners();
    
    // Инициализация схемы
    this.initializeSchema();
    
    // Подписка на обновления данных через AppHost
    this.subscribeToDataUpdates();
  }
  
  setupEventListeners() {
    // Обработчик добавления элемента
    this.addElementBtn.addEventListener('click', () => {
      this.addElement();
    });
    
    // Обработчик очистки схемы
    this.clearSchemaBtn.addEventListener('click', () => {
      this.clearSchema();
    });
    
    // Обработчики масштабирования
    this.zoomInBtn.addEventListener('click', () => {
      this.zoomIn();
    });
    
    this.zoomOutBtn.addEventListener('click', () => {
      this.zoomOut();
    });
    
    // Обработчик клика по контейнеру схемы
    this.schemaContainer.addEventListener('click', (e) => {
      if (e.target === this.schemaContainer) {
        this.deselectElement();
      }
    });
    
    // Обработчики для перетаскивания элементов
    this.schemaContainer.addEventListener('mousedown', (e) => {
      if (e.target.classList.contains('schema-element')) {
        this.startDrag(e);
      }
    });
    
    document.addEventListener('mousemove', (e) => {
      if (this.isDragging) {
        this.doDrag(e);
      }
    });
    
    document.addEventListener('mouseup', () => {
      if (this.isDragging) {
        this.stopDrag();
      }
    });
  }
  
  initializeSchema() {
    // Инициализация пустой схемы
    this.updateStatus('Схема инициализирована');
  }
  
  addElement() {
    const elementType = this.elementTypeSelect.value;
    const elementName = this.elementNameInput.value || `Элемент ${this.elements.length + 1}`;
    const elementColor = this.elementColorInput.value;
    
    // Создаем уникальный ID для элемента
    const elementId = `elem_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    
    // Создаем объект элемента
    const element = {
      id: elementId,
      type: elementType,
      name: elementName,
      color: elementColor,
      x: Math.floor(Math.random() * (this.schemaContainer.clientWidth - 100)),
      y: Math.floor(Math.random() * (this.schemaContainer.clientHeight - 50)),
      width: 80,
      height: 40
    };
    
    // Добавляем элемент в массив
    this.elements.push(element);
    
    // Отрисовываем элемент
    this.renderElement(element);
    
    // Очищаем поля ввода
    this.elementNameInput.value = '';
    
    this.updateStatus(`Добавлен элемент: ${elementName}`);
  }
  
  renderElement(element) {
    // Создаем DOM элемент для схемы
    const elementDiv = document.createElement('div');
    elementDiv.className = 'schema-element';
    elementDiv.id = element.id;
    elementDiv.style.left = `${element.x}px`;
    elementDiv.style.top = `${element.y}px`;
    elementDiv.style.backgroundColor = element.color;
    elementDiv.textContent = element.name;
    
    // Добавляем обработчик клика для выделения
    elementDiv.addEventListener('click', (e) => {
      e.stopPropagation();
      this.selectElement(element);
    });
    
    // Добавляем элемент в контейнер
    this.schemaContainer.appendChild(elementDiv);
  }
  
  selectElement(element) {
    // Снимаем выделение с предыдущего элемента
    this.deselectElement();
    
    // Выделяем новый элемент
    this.selectedElement = element;
    
    // Добавляем класс выделения
    const elementDiv = this.shadowRoot.getElementById(element.id);
    if (elementDiv) {
      elementDiv.classList.add('selected');
    }
    
    this.updateStatus(`Выделен элемент: ${element.name}`);
  }
  
  deselectElement() {
    // Снимаем выделение с текущего элемента
    if (this.selectedElement) {
      const elementDiv = this.shadowRoot.getElementById(this.selectedElement.id);
      if (elementDiv) {
        elementDiv.classList.remove('selected');
      }
      this.selectedElement = null;
    }
  }
  
  startDrag(e) {
    if (!this.selectedElement) return;
    
    this.isDragging = true;
    const rect = e.target.getBoundingClientRect();
    this.dragOffsetX = e.clientX - rect.left;
    this.dragOffsetY = e.clientY - rect.top;
    
    e.target.style.cursor = 'grabbing';
  }
  
  doDrag(e) {
    if (!this.isDragging || !this.selectedElement) return;
    
    // Вычисляем новые координаты
    const containerRect = this.schemaContainer.getBoundingClientRect();
    let newX = e.clientX - containerRect.left - this.dragOffsetX;
    let newY = e.clientY - containerRect.top - this.dragOffsetY;
    
    // Ограничиваем перемещение внутри контейнера
    newX = Math.max(0, Math.min(newX, this.schemaContainer.clientWidth - this.selectedElement.width));
    newY = Math.max(0, Math.min(newY, this.schemaContainer.clientHeight - this.selectedElement.height));
    
    // Обновляем позицию элемента
    this.selectedElement.x = newX;
    this.selectedElement.y = newY;
    
    const elementDiv = this.shadowRoot.getElementById(this.selectedElement.id);
    if (elementDiv) {
      elementDiv.style.left = `${newX}px`;
      elementDiv.style.top = `${newY}px`;
    }
  }
  
  stopDrag() {
    this.isDragging = false;
    
    if (this.selectedElement) {
      const elementDiv = this.shadowRoot.getElementById(this.selectedElement.id);
      if (elementDiv) {
        elementDiv.style.cursor = 'move';
      }
    }
  }
  
  clearSchema() {
    // Очищаем массивы элементов и соединений
    this.elements = [];
    this.connections = [];
    
    // Очищаем контейнер схемы
    this.schemaContainer.innerHTML = '';
    
    // Сбрасываем выделение
    this.deselectElement();
    
    this.updateStatus('Схема очищена');
  }
  
  zoomIn() {
    if (this.zoomLevel < 200) {
      this.zoomLevel += 10;
      this.applyZoom();
    }
  }
  
  zoomOut() {
    if (this.zoomLevel > 50) {
      this.zoomLevel -= 10;
      this.applyZoom();
    }
  }
  
  applyZoom() {
    // Применяем масштаб к контейнеру схемы
    this.schemaContainer.style.transform = `scale(${this.zoomLevel / 100})`;
    this.schemaContainer.style.transformOrigin = 'top left';
    
    // Обновляем отображение уровня масштаба
    this.zoomLevelDisplay.textContent = `${this.zoomLevel}%`;
  }
  
  subscribeToDataUpdates() {
    // Подписываемся на обновления данных через AppHost
    this.unsubscribeFn = window.AppHost.subscribe((data) => {
      if (data && data.type === 'schema-data') {
        this.processSchemaData(data.data);
      }
    });
  }
  
  processSchemaData(schemaData) {
    // Обрабатываем полученные данные схемы
    this.updateStatus('Обновление схемы...');
    
    // Очищаем текущую схему
    this.clearSchema();
    
    // Восстанавливаем элементы из данных
    if (schemaData && schemaData.elements) {
      this.elements = [...schemaData.elements];
      
      // Отрисовываем все элементы
      this.elements.forEach(element => {
        this.renderElement(element);
      });
    }
    
    this.updateStatus(`Загружено ${this.elements.length} элементов`);
  }
  
  updateStatus(message) {
    // Обновляем текст статуса
    if (this.statusText) {
      this.statusText.textContent = message;
    }
  }
  
  // Метод для сохранения схемы
  getSchemaData() {
    return {
      elements: this.elements,
      connections: this.connections,
      zoomLevel: this.zoomLevel
    };
  }
  
  // Метод для установки данных схемы
  setSchemaData(data) {
    this.processSchemaData(data);
  }
}

// Регистрируем Web Component
customElements.define('element-one-line-schema', ElementOneLineSchema);