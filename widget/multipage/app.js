/**
 * Главный модуль приложения Multipage Widget
 * 
 * Этот модуль отвечает за:
 * - Инициализацию приложения
 * - Навигацию между страницами
 * - Интеграцию с Grist API
 * - Управление состоянием виджета
 * 
 * @module AppModule
 */

var AppModule = (function(HomeModule, DetailsModule, SettingsModule) {
    'use strict';

    // ========================================
    // КОНСТАНТЫ
    // ========================================

    // Доступные страницы
    var PAGES = {
        HOME: 'home',
        DETAILS: 'details',
        SETTINGS: 'settings'
    };

    // Ключ для localStorage
    var STORAGE_KEY = 'multipage_widget_state';

    // ========================================
    // ПРИВАТНЫЕ ПЕРЕМЕННЫЕ
    // ========================================

    /**
     * Текущая активная страница
     * @type {string}
     */
    var currentPage = PAGES.HOME;

    /**
     * Текущая запись из Grist
     * @type {Object|null}
     */
    var currentRecord = null;

    /**
     * Настройки виджета
     * @type {Object}
     */
    var widgetSettings = {
        autoSwitch: 'disabled',
        defaultPage: PAGES.HOME
    };

    /**
     * История навигации для анимаций
     * @type {Array}
     */
    var navigationHistory = [];

    // ========================================
    // ПУБЛИЧНЫЕ МЕТОДЫ
    // ========================================

    /**
     * Инициализировать приложение
     */
    function initializeApp() {
        console.log('[AppModule] Инициализация Multipage Widget...');

        // Загружаем настройки из localStorage
        loadSettings();

        // Инициализируем Grist API
        initializeGrist();

        // Инициализируем модули страниц
        HomeModule.init();
        DetailsModule.init();
        SettingsModule.init(widgetSettings);

        // Восстанавливаем состояние из URL или localStorage
        restoreState();

        // Навешиваем обработчики событий
        setupEventListeners();

        console.log('[AppModule] Инициализация завершена');
    }

    /**
     * Навигация к указанной странице
     * @param {string} pageId - Идентификатор страницы (home, details, settings)
     * @param {Object} options - Дополнительные опции
     */
    function navigateTo(pageId, options) {
        options = options || {};
        
        if (!PAGES[pageId.toUpperCase()]) {
            console.warn('[AppModule] Страница не найдена:', pageId);
            return;
        }

        console.log('[AppModule] Навигация к странице:', pageId);

        var previousPage = currentPage;
        currentPage = pageId;

        // Скрываем все страницы
        hideAllPages();

        // Показываем целевую страницу с анимацией
        var targetPage = document.getElementById('page-' + pageId);
        if (targetPage) {
            // Определяем направление анимации
            var animationClass = getAnimationClass(previousPage, pageId);
            targetPage.classList.add(animationClass);
            targetPage.style.display = 'block';

            // Удаляем класс анимации после завершения
            setTimeout(function() {
                targetPage.classList.remove(animationClass);
            }, 400);
        }

        // Обновляем навигацию в UI
        updateNavigation(pageId);

        // Обновляем URL hash
        if (!options.silent) {
            window.location.hash = 'view=' + pageId;
        }

        // Сохраняем в историю
        navigationHistory.push(pageId);
        if (navigationHistory.length > 10) {
            navigationHistory.shift();
        }

        // Сохраняем состояние
        saveState();

        // Вызываем хуки модулей при переходе
        onNavigateToPage(pageId);
    }

    /**
     * Получить текущую страницу
     * @returns {string}
     */
    function getCurrentPage() {
        return currentPage;
    }

    /**
     * Обработать данные записи из Grist
     * @param {Object} record - Данные записи
     */
    function handleRecord(record) {
        currentRecord = record;
        
        console.log('[AppModule] Получена запись:', record);

        // Обновляем индикатор записи
        updateRecordIndicator(record);

        // Передаем данные модулям страниц
        HomeModule.onRecord(record);
        DetailsModule.onRecord(record);
        SettingsModule.onRecord(record);

        // Автоматическое переключение по статусу (если включено)
        if (widgetSettings.autoSwitch === 'enabled' && record) {
            handleAutoSwitch(record);
        }
    }

    /**
     * Обработать список записей из Grist
     * @param {Array} records - Массив записей
     */
    function handleRecords(records) {
        console.log('[AppModule] Получено записей:', records.length);
        
        HomeModule.onRecords(records);
        DetailsModule.onRecords(records);
        SettingsModule.onRecords(records);
    }

    /**
     * Обновить настройки виджета
     * @param {Object} newSettings - Новые настройки
     */
    function updateSettings(newSettings) {
        widgetSettings = Object.assign({}, widgetSettings, newSettings);
        saveSettings();
        console.log('[AppModule] Настройки обновлены:', widgetSettings);
    }

    /**
     * Показать сообщение о статусе
     * @param {string} message - Текст сообщения
     * @param {string} type - Тип сообщения (success, error, warning, info)
     */
    function showStatusMessage(message, type) {
        type = type || 'info';
        var container = document.getElementById('status-message');
        
        var alert = document.createElement('div');
        alert.className = 'alert alert-' + type + ' alert-dismissible fade show';
        alert.role = 'alert';
        alert.textContent = message;
        
        var closeButton = document.createElement('button');
        closeButton.type = 'button';
        closeButton.className = 'btn-close';
        closeButton.setAttribute('data-bs-dismiss', 'alert');
        closeButton.setAttribute('aria-label', 'Close');
        
        alert.appendChild(closeButton);
        container.appendChild(alert);

        // Автоматическое удаление через 5 секунд
        setTimeout(function() {
            if (alert.parentNode) {
                alert.parentNode.removeChild(alert);
            }
        }, 5000);
    }

    /**
     * Загрузить список таблиц из Grist
     * @returns {Promise<Object>}
     */
    async function loadTables() {
        if (typeof grist !== 'undefined') {
            try {
                var tables = await grist.docApi.fetchTable('_grist_Tables');
                return tables;
            } catch (error) {
                console.error('[AppModule] Ошибка загрузки списка таблиц:', error);
                throw error;
            }
        }
        return null;
    }

    /**
     * Загрузить данные таблицы
     * @param {string} tableId - ID таблицы
     * @returns {Promise<Object>}
     */
    async function loadTableData(tableId) {
        if (typeof grist !== 'undefined') {
            try {
                var tableData = await grist.docApi.fetchTable(tableId);
                return tableData;
            } catch (error) {
                console.error('[AppModule] Ошибка загрузки данных таблицы:', error);
                throw error;
            }
        }
        return null;
    }

    /**
     * Загрузить метаданные столбцов таблицы
     * @param {string} tableId - ID таблицы
     * @returns {Promise<Array>}
     */
    async function loadTableMetadata(tableId) {
        if (typeof grist !== 'undefined') {
            try {
                var columnMetadata = await grist.docApi.fetchTable('_grist_Tables_column');
                var tableInfo = await grist.docApi.fetchTable('_grist_Tables');
                
                var tableRecord = null;
                for (var i = 0; i < tableInfo.tableId.length; i++) {
                    if (tableInfo.tableId[i] === tableId) {
                        tableRecord = { id: tableInfo.id[i], tableId: tableInfo.tableId[i] };
                        break;
                    }
                }

                if (!tableRecord) {
                    return [];
                }

                var tableIdInternal = tableRecord.id;
                var filteredColumns = [];
                
                for (var j = 0; j < columnMetadata.id.length; j++) {
                    if (columnMetadata.parentId[j] === tableIdInternal) {
                        filteredColumns.push({
                            id: columnMetadata.id[j],
                            parentId: columnMetadata.parentId[j],
                            colId: columnMetadata.colId[j],
                            label: columnMetadata.label[j],
                            type: columnMetadata.type[j],
                            isFormula: columnMetadata.isFormula[j],
                            formula: columnMetadata.formula[j]
                        });
                    }
                }

                return filteredColumns;
            } catch (error) {
                console.error('[AppModule] Ошибка загрузки метаданных:', error);
                return [];
            }
        }
        return [];
    }

    /**
     * Обновить запись в Grist
     * @param {string} tableId - ID таблицы
     * @param {number} rowId - ID строки
     * @param {Object} updateObj - Объект с полями
     * @returns {Promise}
     */
    async function updateRecord(tableId, rowId, updateObj) {
        if (typeof grist !== 'undefined') {
            try {
                var result = await grist.docApi.applyUserActions([
                    ['UpdateRecord', tableId, rowId, updateObj]
                ]);
                return result;
            } catch (error) {
                console.error('[AppModule] Ошибка обновления записи:', error);
                throw error;
            }
        }
    }

    /**
     * Удалить запись из Grist
     * @param {string} tableId - ID таблицы
     * @param {number} rowId - ID строки
     * @returns {Promise}
     */
    async function deleteRecord(tableId, rowId) {
        if (typeof grist !== 'undefined') {
            try {
                var result = await grist.docApi.applyUserActions([
                    ['RemoveRecord', tableId, rowId]
                ]);
                return result;
            } catch (error) {
                console.error('[AppModule] Ошибка удаления записи:', error);
                throw error;
            }
        }
    }

    /**
     * Добавить запись в Grist
     * @param {string} tableId - ID таблицы
     * @param {Object} columnValues - Данные в формате {colName: [value]}
     * @returns {Promise}
     */
    async function addRecord(tableId, columnValues) {
        if (typeof grist !== 'undefined') {
            try {
                var firstKey = Object.keys(columnValues)[0];
                var numRecords = columnValues[firstKey] ? columnValues[firstKey].length : 0;
                var rowIds = Array(numRecords).fill(null);

                var result = await grist.docApi.applyUserActions([
                    ['BulkAddRecord', tableId, rowIds, columnValues]
                ]);
                return result;
            } catch (error) {
                console.error('[AppModule] Ошибка добавления записи:', error);
                throw error;
            }
        }
    }

    // ========================================
    // ПРИВАТНЫЕ МЕТОДЫ
    // ========================================

    /**
     * Инициализация Grist API
     */
    function initializeGrist() {
        if (typeof grist !== 'undefined') {
            // Подписка на изменения текущей записи
            grist.onRecord(function(record) {
                handleRecord(record);
            });

            // Подписка на изменения списка записей
            grist.onRecords(function(records) {
                handleRecords(records);
            });

            // Подписка на изменения опций виджета
            grist.onOptions(function(options) {
                console.log('[AppModule] Изменены опции виджета:', options);
            });

            console.log('[AppModule] Grist API инициализирован');
        } else {
            console.warn('[AppModule] Grist API не найден. Запуск в режиме разработки.');
            // Режим разработки - эмуляция данных
            emulateDevelopmentMode();
        }
    }

    /**
     * Скрыть все страницы
     */
    function hideAllPages() {
        var pages = document.querySelectorAll('.page-content');
        pages.forEach(function(page) {
            page.style.display = 'none';
            page.classList.remove('page-enter', 'page-enter-from-right', 'page-enter-from-left');
        });
    }

    /**
     * Получить класс анимации на основе направления перехода
     * @param {string} fromPage - Предыдущая страница
     * @param {string} toPage - Целевая страница
     * @returns {string}
     */
    function getAnimationClass(fromPage, toPage) {
        var pageOrder = [PAGES.HOME, PAGES.DETAILS, PAGES.SETTINGS];
        var fromIndex = pageOrder.indexOf(fromPage);
        var toIndex = pageOrder.indexOf(toPage);

        if (toIndex > fromIndex) {
            return 'page-enter-from-right';
        } else if (toIndex < fromIndex) {
            return 'page-enter-from-left';
        } else {
            return 'page-enter';
        }
    }

    /**
     * Обновить UI навигации
     * @param {string} pageId - Текущая страница
     */
    function updateNavigation(pageId) {
        var navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(function(link) {
            link.classList.remove('active');
            if (link.getAttribute('data-page') === pageId) {
                link.classList.add('active');
            }
        });
    }

    /**
     * Обновить индикатор текущей записи
     * @param {Object} record - Данные записи
     */
    function updateRecordIndicator(record) {
        var indicator = document.getElementById('record-indicator');
        
        if (record && record.id) {
            indicator.textContent = 'Запись #' + record.id;
            indicator.classList.remove('bg-secondary');
            indicator.classList.add('bg-success', 'active');
        } else {
            indicator.textContent = 'Нет записи';
            indicator.classList.remove('bg-success', 'active');
            indicator.classList.add('bg-secondary');
        }
    }

    /**
     * Обработать автоматическое переключение по статусу
     * @param {Object} record - Данные записи
     */
    function handleAutoSwitch(record) {
        // Проверяем поле Status
        var status = record.Status || record.status;
        
        if (status === 'Done' || status === 'done') {
            console.log('[AppModule] AutoSwitch: Status = Done, переход к деталям');
            navigateTo(PAGES.DETAILS);
        } else if (status === 'Draft' || status === 'draft') {
            console.log('[AppModule] AutoSwitch: Status = Draft, переход к главной');
            navigateTo(PAGES.HOME);
        }
    }

    /**
     * Вызвать хуки модулей при переходе на страницу
     * @param {string} pageId - Идентификатор страницы
     */
    function onNavigateToPage(pageId) {
        switch (pageId) {
            case PAGES.HOME:
                HomeModule.onNavigate();
                break;
            case PAGES.DETAILS:
                DetailsModule.onNavigate();
                break;
            case PAGES.SETTINGS:
                SettingsModule.onNavigate();
                break;
        }
    }

    /**
     * Настроить обработчики событий
     */
    function setupEventListeners() {
        // Обработка кликов по навигации
        var navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(function(link) {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                var pageId = this.getAttribute('data-page');
                if (pageId) {
                    navigateTo(pageId);
                }
            });
        });

        // Обработка изменения hash в URL
        window.addEventListener('hashchange', function() {
            var hash = window.location.hash;
            var match = hash.match(/view=(\w+)/);
            if (match && match[1]) {
                var pageId = match[1];
                if (PAGES[pageId.toUpperCase()]) {
                    navigateTo(pageId, { silent: true });
                }
            }
        });

        // Обработка отправки формы настроек
        var settingsForm = document.getElementById('settings-form');
        if (settingsForm) {
            settingsForm.addEventListener('submit', function(e) {
                e.preventDefault();
                saveSettingsFromForm();
            });
        }
    }

    /**
     * Сохранить настройки из формы
     */
    function saveSettingsFromForm() {
        var autoSwitch = document.getElementById('auto-switch').value;
        var defaultPage = document.getElementById('default-page').value;

        updateSettings({
            autoSwitch: autoSwitch,
            defaultPage: defaultPage
        });

        showStatusMessage('Настройки сохранены', 'success');
    }

    /**
     * Сохранить состояние виджета в localStorage
     */
    function saveState() {
        var state = {
            currentPage: currentPage,
            timestamp: Date.now()
        };
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch (e) {
            console.warn('[AppModule] Не удалось сохранить состояние:', e);
        }
    }

    /**
     * Восстановить состояние из localStorage или URL
     */
    function restoreState() {
        // Сначала проверяем URL hash
        var hash = window.location.hash;
        var match = hash.match(/view=(\w+)/);
        if (match && match[1] && PAGES[match[1].toUpperCase()]) {
            currentPage = match[1];
        } else {
            // Если нет hash, пробуем localStorage
            try {
                var stored = localStorage.getItem(STORAGE_KEY);
                if (stored) {
                    var state = JSON.parse(stored);
                    if (state.currentPage && PAGES[state.currentPage.toUpperCase()]) {
                        currentPage = state.currentPage;
                    }
                }
            } catch (e) {
                console.warn('[AppModule] Не удалось восстановить состояние:', e);
            }
        }

        // Если настройки указывают на другую страницу по умолчанию
        if (currentPage === PAGES.HOME && widgetSettings.defaultPage !== PAGES.HOME) {
            currentPage = widgetSettings.defaultPage;
        }

        // Переходим на восстановленную страницу
        navigateTo(currentPage, { silent: true });
    }

    /**
     * Сохранить настройки в localStorage
     */
    function saveSettings() {
        try {
            localStorage.setItem(STORAGE_KEY + '_settings', JSON.stringify(widgetSettings));
        } catch (e) {
            console.warn('[AppModule] Не удалось сохранить настройки:', e);
        }
    }

    /**
     * Загрузить настройки из localStorage
     */
    function loadSettings() {
        try {
            var stored = localStorage.getItem(STORAGE_KEY + '_settings');
            if (stored) {
                widgetSettings = JSON.parse(stored);
            }
        } catch (e) {
            console.warn('[AppModule] Не удалось загрузить настройки:', e);
        }

        // Обновляем форму настроек
        var autoSwitchSelect = document.getElementById('auto-switch');
        var defaultPageSelect = document.getElementById('default-page');
        
        if (autoSwitchSelect) {
            autoSwitchSelect.value = widgetSettings.autoSwitch || 'disabled';
        }
        if (defaultPageSelect) {
            defaultPageSelect.value = widgetSettings.defaultPage || PAGES.HOME;
        }
    }

    /**
     * Эмуляция режима разработки (когда Grist API недоступен)
     */
    function emulateDevelopmentMode() {
        console.log('[AppModule] Режим разработки: эмуляция данных Grist');
        
        // Эмуляция записи через 1 секунду
        setTimeout(function() {
            handleRecord({
                id: 1,
                Name: 'Тестовая запись',
                Status: 'Draft',
                Description: 'Это тестовая запись для разработки'
            });
        }, 1000);
    }

    // ========================================
    // ЭКСПОРТ ПУБЛИЧНОГО API
    // ========================================

    return {
        initializeApp: initializeApp,
        navigateTo: navigateTo,
        getCurrentPage: getCurrentPage,
        handleRecord: handleRecord,
        handleRecords: handleRecords,
        updateSettings: updateSettings,
        showStatusMessage: showStatusMessage,
        loadTables: loadTables,
        loadTableData: loadTableData,
        loadTableMetadata: loadTableMetadata,
        updateRecord: updateRecord,
        deleteRecord: deleteRecord,
        addRecord: addRecord
    };
})(HomeModule, DetailsModule, SettingsModule);

// Инициализировать приложение при загрузке DOM
document.addEventListener('DOMContentLoaded', function() {
    AppModule.initializeApp();
});
