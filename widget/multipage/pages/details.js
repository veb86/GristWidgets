/**
 * Модуль страницы "Детали"
 * 
 * Отображает детальную информацию о текущей записи
 * Поддерживает работу с таблицами Grist (как в edittable)
 * 
 * @module DetailsModule
 */

var DetailsModule = (function() {
    'use strict';

    // ========================================
    // ПРИВАТНЫЕ ПЕРЕМЕННЫЕ
    // ========================================

    /**
     * Текущая запись из Grist
     * @type {Object|null}
     */
    var currentRecord = null;

    /**
     * Список всех записей
     * @type {Array}
     */
    var recordsList = [];

    /**
     * Экземпляр Tabulator
     * @type {Object|null}
     */
    var tabulatorInstance = null;

    /**
     * Текущая выбранная таблица
     * @type {string|null}
     */
    var currentTableId = null;

    /**
     * Текущие записи таблицы
     * @type {Array}
     */
    var tableRecords = [];

    /**
     * Текущие колонки таблицы
     * @type {Array}
     */
    var tableColumns = [];

    /**
     * Метаданные колонок
     * @type {Array}
     */
    var columnMetadata = [];

    // ========================================
    // ПУБЛИЧНЫЕ МЕТОДЫ
    // ========================================

    /**
     * Инициализация модуля
     */
    function init() {
        console.log('[DetailsModule] Инициализация страницы "Детали"');
        setupEventListeners();
        loadTablesList();
    }

    /**
     * Обработать получение записи из Grist
     * @param {Object} record - Данные записи
     */
    function onRecord(record) {
        currentRecord = record;
        console.log('[DetailsModule] Получена запись для страницы деталей');
        renderRecordInfo();
    }

    /**
     * Обработать получение списка записей из Grist
     * @param {Array} records - Массив записей
     */
    function onRecords(records) {
        recordsList = records;
        console.log('[DetailsModule] Получено записей:', records.length);
    }

    /**
     * Вызывается при навигации на эту страницу
     */
    function onNavigate() {
        console.log('[DetailsModule] Переход на страницу деталей');
        renderRecordInfo();
        if (!tabulatorInstance && currentTableId) {
            renderTable();
        }
    }

    /**
     * Загрузить список таблиц
     */
    async function loadTablesList() {
        try {
            var tables = await AppModule.loadTables();
            var tableSelect = document.getElementById('details-table-select');
            
            if (tableSelect) {
                tableSelect.innerHTML = '<option value="">-- Выберите таблицу --</option>';

                if (tables && tables.id && Array.isArray(tables.id)) {
                    for (var i = 0; i < tables.id.length; i++) {
                        var id = tables.id[i];
                        var name = tables.tableId[i] || 'N/A';

                        // Пропустить внутренние таблицы Grist
                        if (!name.startsWith('_grist')) {
                            var option = document.createElement('option');
                            option.value = name;
                            option.textContent = name;
                            tableSelect.appendChild(option);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('[DetailsModule] Ошибка загрузки списка таблиц:', error);
            AppModule.showStatusMessage('Ошибка загрузки таблиц: ' + error.message, 'error');
        }
    }

    /**
     * Загрузить данные выбранной таблицы
     * @param {string} tableId - ID таблицы
     */
    async function loadTableData(tableId) {
        try {
            currentTableId = tableId;
            
            // Загрузить данные таблицы
            var tableData = await AppModule.loadTableData(tableId);
            
            // Загрузить метаданные колонок
            var metadata = await AppModule.loadTableMetadata(tableId);
            columnMetadata = metadata;

            if (!tableData || !tableData.id || !Array.isArray(tableData.id)) {
                AppModule.showStatusMessage('Таблица пуста или не содержит данных', 'warning');
                clearTable();
                return;
            }

            // Преобразовать данные
            var records = [];
            var columns = [];

            for (var i = 0; i < tableData.id.length; i++) {
                var record = { id: tableData.id[i] };
                for (var col in tableData) {
                    if (col !== 'id' && tableData.hasOwnProperty(col)) {
                        record[col] = tableData[col][i];
                    }
                }
                records.push(record);
            }

            // Получить список колонок
            if (records.length > 0) {
                columns = Object.keys(records[0]).filter(function(key) {
                    return key !== 'id';
                });
            }

            tableRecords = records;
            tableColumns = columns;

            // Отрисовать таблицу
            renderTable();

            AppModule.showStatusMessage('Загружено ' + records.length + ' записей из таблицы "' + tableId + '"', 'success');
        } catch (error) {
            console.error('[DetailsModule] Ошибка загрузки данных таблицы:', error);
            AppModule.showStatusMessage('Ошибка загрузки данных: ' + error.message, 'error');
        }
    }

    /**
     * Проверить, является ли колонка формульной
     * @param {string} colName - Имя колонки
     * @returns {boolean}
     */
    function isColumnFormula(colName) {
        for (var i = 0; i < columnMetadata.length; i++) {
            if (columnMetadata[i].colId === colName || columnMetadata[i].label === colName) {
                return columnMetadata[i].isFormula;
            }
        }
        return false;
    }

    // ========================================
    // ПРИВАТНЫЕ МЕТОДЫ
    // ========================================

    /**
     * Настроить обработчики событий
     */
    function setupEventListeners() {
        // Обработчик изменения выбора таблицы
        var tableSelect = document.getElementById('details-table-select');
        if (tableSelect) {
            tableSelect.addEventListener('change', function() {
                var selectedTableId = this.value;
                if (selectedTableId) {
                    loadTableData(selectedTableId);
                } else {
                    clearTable();
                }
            });
        }

        // Обработчик кнопки добавления строки
        var addRowBtn = document.getElementById('details-add-row-btn');
        if (addRowBtn) {
            addRowBtn.addEventListener('click', function() {
                if (tabulatorInstance) {
                    addNewRow();
                } else {
                    AppModule.showStatusMessage('Сначала выберите таблицу', 'warning');
                }
            });
        }
    }

    /**
     * Отрисовать информацию о записи
     */
    function renderRecordInfo() {
        var recordSection = document.getElementById('details-record-section');
        var recordDataPre = document.getElementById('details-record-data');

        if (recordSection && recordDataPre) {
            if (currentRecord && Object.keys(currentRecord).length > 0) {
                var formattedData = formatRecordData(currentRecord);
                recordDataPre.textContent = formattedData;
                recordSection.style.display = 'block';
            } else {
                recordSection.style.display = 'none';
            }
        }
    }

    /**
     * Отрисовать таблицу
     */
    function renderTable() {
        clearTable();

        var container = document.getElementById('details-table-container');
        if (!container) return;

        // Подготовить колонки для Tabulator
        var tabulatorColumns = tableColumns.map(function(col) {
            var isFormula = isColumnFormula(col);

            var columnDef = {
                title: col,
                field: col,
                headerTooltip: true
            };

            if (!isFormula) {
                columnDef.editor = "input";
            } else {
                columnDef.headerCssClass = "formula-column-header";
                columnDef.cssClass = "formula-column-cell";
            }

            return columnDef;
        });

        // Добавить колонку с кнопками действий
        tabulatorColumns.push({
            title: "Действия",
            field: "controls",
            width: 180,
            hozAlign: "center",
            formatter: function(cell) {
                var rowData = cell.getRow().getData();
                var rowId = rowData.id;

                if (rowId && typeof rowId === 'number') {
                    return '<button class="btn btn-sm btn-primary update-btn">Изменить</button> <button class="btn btn-sm btn-danger delete-btn">Удалить</button>';
                } else {
                    return '<button class="btn btn-sm btn-success save-btn">Сохранить</button>';
                }
            },
            cellClick: function(e, cell) {
                var rowData = cell.getRow().getData();
                var rowId = rowData.id;

                if (e.target.classList.contains('update-btn')) {
                    updateRowInGrist(rowId, rowData, cell.getRow());
                } else if (e.target.classList.contains('delete-btn')) {
                    deleteRecordFromGrist(rowId, cell.getRow());
                } else if (e.target.classList.contains('save-btn')) {
                    saveNewRecordToGrist(rowData, cell.getRow());
                }
            }
        });

        // Создать таблицу
        tabulatorInstance = new Tabulator("#details-table-container", {
            data: tableRecords,
            columns: tabulatorColumns,
            height: "500px",
            layout: "fitColumns",
            movableColumns: true,
            responsiveLayout: "hide",
            tooltips: true,
            pagination: true,
            paginationSize: 20,
            paginationCounter: "rows",
            cellEdited: function(cell) {
                var field = cell.getField();
                var rowId = cell.getRow().getData().id;

                if (isColumnFormula(field)) {
                    cell.setValue(cell.getOldValue());
                    AppModule.showStatusMessage('Невозможно редактировать формульный столбец "' + field + '"', 'warning');
                    return;
                }

                if (!rowId || typeof rowId === 'string') {
                    // Новая строка - локальное обновление
                } else {
                    // Пометить строку как изменённую
                    var updateBtn = cell.getRow().getElement().querySelector('.update-btn');
                    if (updateBtn) {
                        updateBtn.classList.add('btn-warning');
                        updateBtn.textContent = 'Изменить*';
                    }
                }
            }
        });
    }

    /**
     * Очистить таблицу
     */
    function clearTable() {
        if (tabulatorInstance) {
            try {
                tabulatorInstance.destroy();
            } catch (e) {
                console.warn('[DetailsModule] Ошибка при уничтожении таблицы:', e);
            }
            tabulatorInstance = null;
        }
        var container = document.getElementById('details-table-container');
        if (container) {
            container.innerHTML = '';
        }
    }

    /**
     * Добавить новую строку
     */
    function addNewRow() {
        var newRecord = { id: 'new' };
        
        tableColumns.forEach(function(col) {
            newRecord[col] = '';
        });

        tabulatorInstance.addRow(newRecord, true);
    }

    /**
     * Обновить строку в Grist
     */
    async function updateRowInGrist(rowId, rowData, row) {
        if (!currentTableId) return;

        try {
            var updateObj = {};
            
            tableColumns.forEach(function(col) {
                if (!isColumnFormula(col) && col !== 'id') {
                    if (typeof rowData[col] !== 'undefined') {
                        updateObj[col] = rowData[col];
                    }
                }
            });

            if (Object.keys(updateObj).length === 0) {
                AppModule.showStatusMessage('Нет полей для обновления', 'warning');
                return;
            }

            await AppModule.updateRecord(currentTableId, rowId, updateObj);
            
            AppModule.showStatusMessage('Запись ID ' + rowId + ' успешно обновлена', 'success');

            var updateBtn = row.getElement().querySelector('.update-btn');
            if (updateBtn) {
                updateBtn.classList.remove('btn-warning');
                updateBtn.textContent = 'Изменить';
            }
        } catch (error) {
            console.error('[DetailsModule] Ошибка обновления записи:', error);
            AppModule.showStatusMessage('Ошибка обновления: ' + error.message, 'error');
        }
    }

    /**
     * Удалить запись из Grist
     */
    async function deleteRecordFromGrist(rowId, row) {
        if (!currentTableId || !confirm('Удалить запись #' + rowId + '?')) return;

        try {
            await AppModule.deleteRecord(currentTableId, rowId);
            
            AppModule.showStatusMessage('Запись ID ' + rowId + ' успешно удалена', 'success');
            
            // Перезагрузить таблицу
            loadTableData(currentTableId);
        } catch (error) {
            console.error('[DetailsModule] Ошибка удаления записи:', error);
            AppModule.showStatusMessage('Ошибка удаления: ' + error.message, 'error');
        }
    }

    /**
     * Сохранить новую запись в Grist
     */
    async function saveNewRecordToGrist(rowData, row) {
        if (!currentTableId) return;

        try {
            var columnValues = {};
            
            tableColumns.forEach(function(col) {
                if (!isColumnFormula(col) && col !== 'id') {
                    if (typeof rowData[col] !== 'undefined' && rowData[col] !== '') {
                        columnValues[col] = [rowData[col]];
                    } else {
                        columnValues[col] = [''];
                    }
                }
            });

            if (Object.keys(columnValues).length === 0) {
                AppModule.showStatusMessage('Нет данных для сохранения', 'warning');
                return;
            }

            await AppModule.addRecord(currentTableId, columnValues);
            
            AppModule.showStatusMessage('Запись успешно создана', 'success');
            
            // Перезагрузить таблицу
            loadTableData(currentTableId);
        } catch (error) {
            console.error('[DetailsModule] Ошибка создания записи:', error);
            AppModule.showStatusMessage('Ошибка создания: ' + error.message, 'error');
        }
    }

    /**
     * Форматировать данные записи
     */
    function formatRecordData(record) {
        var output = [];
        
        for (var key in record) {
            if (record.hasOwnProperty(key) && key !== 'id') {
                var value = record[key];
                if (typeof value === 'object' && value !== null) {
                    value = JSON.stringify(value);
                }
                output.push(key + ': ' + value);
            }
        }

        if (record.id) {
            output.unshift('ID: ' + record.id);
        }

        return output.join('\n');
    }

    // ========================================
    // ЭКСПОРТ ПУБЛИЧНОГО API
    // ========================================

    return {
        init: init,
        onRecord: onRecord,
        onRecords: onRecords,
        onNavigate: onNavigate,
        loadTablesList: loadTablesList,
        loadTableData: loadTableData,
        isColumnFormula: isColumnFormula
    };
})();
