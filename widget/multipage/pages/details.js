/**
 * Модуль страницы "Детали"
 * 
 * Отображает список таблиц Grist и позволяет работать с данными.
 * 
 * Экспорт интерфейса:
 * - init(context) - инициализация
 * - destroy() - очистка ресурсов
 * - onRecord(record) - обработка записи (опционально)
 * - onRecords(records) - обработка списка записей (опционально)
 */

var DetailsModule = (function() {
    'use strict';

    /**
     * Контекст экрана
     * @type {Object|null}
     */
    var context = null;

    /**
     * Текущая запись из Grist
     * @type {Object|null}
     */
    var currentRecord = null;

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
     * Данные таблицы
     * @type {Array}
     */
    var tableRecords = [];

    /**
     * Колонки таблицы
     * @type {Array}
     */
    var tableColumns = [];

    /**
     * Метаданные колонок
     * @type {Array}
     */
    var columnMetadata = [];

    /**
     * Обработчики событий
     * @type {Array}
     */
    var eventHandlers = [];

    /**
     * Инициализация модуля
     * @param {Object} ctx - Контекст от AppModule
     */
    function init(ctx) {
        context = ctx;
        console.log('[DetailsModule] Инициализация');

        currentRecord = ctx.currentRecord;

        // Рендерим и загружаем таблицы
        renderRecordInfo();
        loadTablesList();

        // Навешиваем обработчики
        setupEventListeners();
    }

    /**
     * Очистка ресурсов
     */
    function destroy() {
        console.log('[DetailsModule] Уничтожение');

        // Уничтожаем Tabulator
        if (tabulatorInstance) {
            try {
                tabulatorInstance.destroy();
            } catch (e) {
                console.warn('[DetailsModule] Ошибка при уничтожении таблицы:', e);
            }
            tabulatorInstance = null;
        }

        // Снимаем обработчики событий
        eventHandlers.forEach(function(handler) {
            if (handler.element && handler.event && handler.fn) {
                handler.element.removeEventListener(handler.event, handler.fn);
            }
        });
        eventHandlers = [];

        // Очищаем данные
        context = null;
        currentRecord = null;
        currentTableId = null;
        tableRecords = [];
        tableColumns = [];
        columnMetadata = [];
    }

    /**
     * Обработка изменения записи
     * @param {Object} record - Данные записи
     */
    function onRecord(record) {
        currentRecord = record;
        console.log('[DetailsModule] Получена запись');
        renderRecordInfo();
    }

    /**
     * Настроить обработчики событий
     */
    function setupEventListeners() {
        // Селектор таблиц
        var tableSelect = document.getElementById('details-table-select');
        if (tableSelect) {
            var changeHandler = function() {
                var selectedTableId = this.value;
                if (selectedTableId) {
                    loadTableData(selectedTableId);
                } else {
                    clearTable();
                }
            };
            tableSelect.addEventListener('change', changeHandler);
            eventHandlers.push({ element: tableSelect, event: 'change', fn: changeHandler });
        }

        // Кнопка добавления строки
        var addRowBtn = document.getElementById('details-add-row-btn');
        if (addRowBtn) {
            var clickHandler = function() {
                if (tabulatorInstance) {
                    addNewRow();
                } else {
                    context.showStatusMessage('Сначала выберите таблицу', 'warning');
                }
            };
            addRowBtn.addEventListener('click', clickHandler);
            eventHandlers.push({ element: addRowBtn, event: 'click', fn: clickHandler });
        }
    }

    /**
     * Загрузить список таблиц
     */
    async function loadTablesList() {
        try {
            var tables = await context.loadTables();
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
            context.showStatusMessage('Ошибка загрузки таблиц: ' + error.message, 'error');
        }
    }

    /**
     * Загрузить данные выбранной таблицы
     * @param {string} tableId - ID таблицы
     */
    async function loadTableData(tableId) {
        try {
            currentTableId = tableId;

            // Загружаем данные и метаданные параллельно
            var tableData = await context.loadTableData(tableId);
            var metadata = await context.loadTableMetadata(tableId);
            columnMetadata = metadata;

            if (!tableData || !tableData.id || !Array.isArray(tableData.id)) {
                context.showStatusMessage('Таблица пуста или не содержит данных', 'warning');
                clearTable();
                return;
            }

            // Преобразуем данные
            var records = [];
            for (var i = 0; i < tableData.id.length; i++) {
                var record = { id: tableData.id[i] };
                for (var col in tableData) {
                    if (col !== 'id' && tableData.hasOwnProperty(col)) {
                        record[col] = tableData[col][i];
                    }
                }
                records.push(record);
            }

            // Получаем список колонок
            var columns = [];
            if (records.length > 0) {
                columns = Object.keys(records[0]).filter(function(key) {
                    return key !== 'id';
                });
            }

            tableRecords = records;
            tableColumns = columns;

            // Отрисовываем таблицу
            renderTable();

            context.showStatusMessage('Загружено ' + records.length + ' записей из таблицы "' + tableId + '"', 'success');
        } catch (error) {
            console.error('[DetailsModule] Ошибка загрузки данных таблицы:', error);
            context.showStatusMessage('Ошибка загрузки данных: ' + error.message, 'error');
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

    /**
     * Отрисовать информацию о записи
     */
    function renderRecordInfo() {
        var recordSection = document.getElementById('details-record-section');
        var recordDataPre = document.getElementById('details-record-data');

        if (recordSection && recordDataPre) {
            if (currentRecord && Object.keys(currentRecord).length > 0) {
                recordDataPre.textContent = formatRecordData(currentRecord);
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

        // Подготавливаем колонки для Tabulator
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

        // Добавляем колонку с кнопками действий
        tabulatorColumns.push({
            title: "Действия",
            field: "controls",
            width: 180,
            hozAlign: "center",
            formatter: function(cell) {
                var rowData = cell.getRow().getData();
                var rowId = rowData.id;

                if (rowId && typeof rowId === 'number') {
                    return '<button class="btn btn-sm btn-primary update-btn">Изменить</button> ' +
                           '<button class="btn btn-sm btn-danger delete-btn">Удалить</button>';
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

        // Создаём таблицу
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
                    context.showStatusMessage('Невозможно редактировать формульный столбец "' + field + '"', 'warning');
                    return;
                }

                if (!rowId || typeof rowId === 'string') {
                    // Новая строка - локальное обновление
                } else {
                    // Помечаем строку как изменённую
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
                context.showStatusMessage('Нет полей для обновления', 'warning');
                return;
            }

            await context.updateRecord(currentTableId, rowId, updateObj);

            context.showStatusMessage('Запись ID ' + rowId + ' успешно обновлена', 'success');

            var updateBtn = row.getElement().querySelector('.update-btn');
            if (updateBtn) {
                updateBtn.classList.remove('btn-warning');
                updateBtn.textContent = 'Изменить';
            }
        } catch (error) {
            console.error('[DetailsModule] Ошибка обновления записи:', error);
            context.showStatusMessage('Ошибка обновления: ' + error.message, 'error');
        }
    }

    /**
     * Удалить запись из Grist
     */
    async function deleteRecordFromGrist(rowId, row) {
        if (!currentTableId || !confirm('Удалить запись #' + rowId + '?')) return;

        try {
            await context.deleteRecord(currentTableId, rowId);

            context.showStatusMessage('Запись ID ' + rowId + ' успешно удалена', 'success');

            // Перезагружаем таблицу
            loadTableData(currentTableId);
        } catch (error) {
            console.error('[DetailsModule] Ошибка удаления записи:', error);
            context.showStatusMessage('Ошибка удаления: ' + error.message, 'error');
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
                context.showStatusMessage('Нет данных для сохранения', 'warning');
                return;
            }

            await context.addRecord(currentTableId, columnValues);

            context.showStatusMessage('Запись успешно создана', 'success');

            // Перезагружаем таблицу
            loadTableData(currentTableId);
        } catch (error) {
            console.error('[DetailsModule] Ошибка создания записи:', error);
            context.showStatusMessage('Ошибка создания: ' + error.message, 'error');
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
        destroy: destroy,
        onRecord: onRecord
    };
})();
