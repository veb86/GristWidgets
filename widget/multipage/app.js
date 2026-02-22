/**
 * Главный модуль приложения Multipage Widget
 * 
 * Роутер, навигация, интеграция с Grist API.
 * Управляет жизненным циклом экранов.
 * 
 * @module AppModule
 */

var AppModule = (function() {
    'use strict';

    // ========================================
    // КОНСТАНТЫ
    // ========================================

    var STORAGE_KEY = 'multipage_widget_state';
    var AVAILABLE_SCREENS = ['home', 'details', 'settings'];

    // ========================================
    // ПРИВАТНЫЕ ПЕРЕМЕННЫЕ
    // ========================================

    /**
     * Текущий активный экран
     * @type {string|null}
     */
    var currentScreen = null;

    /**
     * Предыдущий экран (для анимаций)
     * @type {string|null}
     */
    var previousScreen = null;

    /**
     * Текущая запись из Grist
     * @type {Object|null}
     */
    var currentRecord = null;

    /**
     * Список записей из Grist
     * @type {Array}
     */
    var recordsList = [];

    /**
     * Настройки виджета
     * @type {Object}
     */
    var widgetSettings = {
        autoSwitch: 'disabled',
        defaultPage: 'home'
    };

    /**
     * Загруженные HTML-шаблоны экранов (кэш)
     * @type {Object.<string, string>}
     */
    var templatesCache = {};

    /**
     * Загруженные JS-модули экранов (кэш)
     * @type {Object}
     */
    var modulesCache = {};

    /**
     * Текущий активный модуль экрана
     * @type {Object|null}
     */
    var activeModule = null;

    // ========================================
    // ПУБЛИЧНЫЕ МЕТОДЫ
    // ========================================

    /**
     * Инициализировать приложение
     */
    function initializeApp() {
        console.log('[AppModule] Инициализация Multipage Widget...');

        // Инициализируем менеджер подписок
        SubscriptionsManager.init();

        // Загружаем настройки
        loadSettings();

        // Инициализируем Grist API
        initializeGrist();

        // Восстанавливаем состояние
        restoreState();

        // Настраиваем обработчики
        setupEventListeners();

        console.log('[AppModule] Инициализация завершена');
    }

    /**
     * Навигация к указанному экрану
     * @param {string} screenName - Имя экрана
     * @param {Object} options - Опции
     */
    async function navigate(screenName, options) {
        options = options || {};

        // Валидация
        if (AVAILABLE_SCREENS.indexOf(screenName) === -1) {
            console.warn('[AppModule] Экран не найден:', screenName);
            showStatusMessage('Экран "' + screenName + '" не найден', 'error');
            return;
        }

        console.log('[AppModule] Навигация к экрану:', screenName);

        previousScreen = currentScreen;
        currentScreen = screenName;

        // Устанавливаем текущий экран в менеджере подписок (очистит предыдущий)
        SubscriptionsManager.setCurrentScreen(screenName);

        // Обновляем UI навигации
        updateNavigation(screenName);

        // Показываем индикатор загрузки
        showLoading();

        try {
            // Загружаем HTML шаблон
            var html = await loadTemplate(screenName);

            // Загружаем JS модуль
            var module = await loadModule(screenName);

            // Уничтожаем предыдущий модуль
            if (activeModule && activeModule.destroy) {
                activeModule.destroy();
            }

            // Рендерим контент
            renderContent(html);

            // Инициализируем новый модуль
            activeModule = module;
            
            // Передаём контекст с доступом к API
            var context = createContext();
            
            if (activeModule && activeModule.init) {
                activeModule.init(context);
            }

            // Обновляем URL hash
            if (!options.silent) {
                window.location.hash = 'view=' + screenName;
            }

            // Сохраняем состояние
            saveState();

            // Скрываем индикатор загрузки
            hideLoading();

            // Анимация появления
            triggerEnterAnimation();

        } catch (error) {
            console.error('[AppModule] Ошибка навигации:', error);
            hideLoading();
            showStatusMessage('Ошибка загрузки экрана: ' + error.message, 'error');
        }
    }

    /**
     * Получить текущий экран
     * @returns {string|null}
     */
    function getCurrentScreen() {
        return currentScreen;
    }

    /**
     * Получить текущую запись
     * @returns {Object|null}
     */
    function getCurrentRecord() {
        return currentRecord;
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
     * @param {string} message - Текст
     * @param {string} type - Тип (success, error, warning, info)
     */
    function showStatusMessage(message, type) {
        type = type || 'info';
        var container = document.getElementById('status-message');
        if (!container) return;

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
                return await grist.docApi.fetchTable('_grist_Tables');
            } catch (error) {
                console.error('[AppModule] Ошибка загрузки таблиц:', error);
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
                return await grist.docApi.fetchTable(tableId);
            } catch (error) {
                console.error('[AppModule] Ошибка загрузки данных таблицы:', error);
                throw error;
            }
        }
        return null;
    }

    /**
     * Загрузить метаданные таблицы
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

                if (!tableRecord) return [];

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
                return await grist.docApi.applyUserActions([
                    ['UpdateRecord', tableId, rowId, updateObj]
                ]);
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
                return await grist.docApi.applyUserActions([
                    ['RemoveRecord', tableId, rowId]
                ]);
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

                return await grist.docApi.applyUserActions([
                    ['BulkAddRecord', tableId, rowIds, columnValues]
                ]);
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
     * Создать контекст для модуля экрана
     * @returns {Object}
     */
    function createContext() {
        return {
            // Навигация
            navigate: navigate,
            getCurrentScreen: getCurrentScreen,

            // Данные Grist
            currentRecord: currentRecord,
            recordsList: recordsList,

            // API Grist
            grist: typeof grist !== 'undefined' ? grist : null,
            subscribe: SubscriptionsManager.subscribe.bind(SubscriptionsManager),

            // Утилиты
            showStatusMessage: showStatusMessage,

            // API таблиц
            loadTables: loadTables,
            loadTableData: loadTableData,
            loadTableMetadata: loadTableMetadata,
            updateRecord: updateRecord,
            deleteRecord: deleteRecord,
            addRecord: addRecord,

            // Настройки
            getSettings: function() { return Object.assign({}, widgetSettings); },
            updateSettings: updateSettings
        };
    }

    /**
     * Инициализация Grist API
     */
    function initializeGrist() {
        if (typeof grist !== 'undefined') {
            // ВАЖНО: Сначала вызываем grist.ready() перед любыми подписками
            // Это обязательное требование Grist API
            // Примечание: не передаём callback-функции в ready(), т.к. они не клонируются
            grist.ready({
                requiredAccess: 'full'
            });

            console.log('[AppModule] grist.ready() вызван, подписываемся на события...');

            // Подписка на изменения текущей записи (глобальная)
            var unsubscribe = grist.onRecord(function(record) {
                handleRecordChange(record);
            });

            // Регистрируем подписку для глобального контекста
            SubscriptionsManager.subscribe(unsubscribe, 'global');

            // Подписка на изменения списка записей
            var unsubscribeRecords = grist.onRecords(function(records) {
                handleRecordsChange(records);
            });

            SubscriptionsManager.subscribe(unsubscribeRecords, 'global');

            console.log('[AppModule] Grist API инициализирован');
        } else {
            console.warn('[AppModule] Grist API не найден. Режим разработки.');
            emulateDevelopmentMode();
        }
    }

    /**
     * Обработать изменение записи
     * @param {Object} record - Данные записи
     */
    function handleRecordChange(record) {
        currentRecord = record;
        console.log('[AppModule] Получена запись:', record);

        // Обновляем индикатор
        updateRecordIndicator(record);

        // Уведомляем активный модуль
        if (activeModule && activeModule.onRecord) {
            activeModule.onRecord(record);
        }

        // Автопереключение по статусу
        if (widgetSettings.autoSwitch === 'enabled' && record) {
            handleAutoSwitch(record);
        }
    }

    /**
     * Обработать изменение списка записей
     * @param {Array} records - Массив записей
     */
    function handleRecordsChange(records) {
        recordsList = records;
        console.log('[AppModule] Получено записей:', records.length);

        if (activeModule && activeModule.onRecords) {
            activeModule.onRecords(records);
        }
    }

    /**
     * Обработать автоматическое переключение по статусу
     * @param {Object} record - Данные записи
     */
    function handleAutoSwitch(record) {
        var status = record.Status || record.status;

        if (status === 'Done' || status === 'done') {
            console.log('[AppModule] AutoSwitch: Status = Done');
            navigate('details');
        } else if (status === 'Draft' || status === 'draft') {
            console.log('[AppModule] AutoSwitch: Status = Draft');
            navigate('home');
        }
    }

    /**
     * Загрузить HTML шаблон экрана
     * @param {string} screenName - Имя экрана
     * @returns {Promise<string>}
     */
    async function loadTemplate(screenName) {
        // Проверяем кэш
        if (templatesCache[screenName]) {
            console.log('[AppModule] Шаблон загружен из кэша:', screenName);
            return templatesCache[screenName];
        }

        // Загружаем через fetch
        var response = await fetch('pages/' + screenName + '.html');
        
        if (!response.ok) {
            throw new Error('Не удалось загрузить шаблон: ' + screenName);
        }

        var html = await response.text();
        templatesCache[screenName] = html;
        console.log('[AppModule] Шаблон загружен:', screenName);
        
        return html;
    }

    /**
     * Загрузить JS модуль экрана
     * @param {string} screenName - Имя экрана
     * @returns {Promise<Object>}
     */
    async function loadModule(screenName) {
        // Проверяем кэш
        if (modulesCache[screenName]) {
            console.log('[AppModule] Модуль загружен из кэша:', screenName);
            return modulesCache[screenName];
        }

        // Динамическая загрузка скрипта
        return new Promise(function(resolve, reject) {
            var script = document.createElement('script');
            script.src = 'pages/' + screenName + '.js';
            script.onload = function() {
                // Модуль должен экспортировать себя в глобальную область
                var moduleName = screenName.charAt(0).toUpperCase() + screenName.slice(1) + 'Module';
                var module = window[moduleName];
                
                if (module) {
                    modulesCache[screenName] = module;
                    console.log('[AppModule] Модуль загружен:', screenName);
                    resolve(module);
                } else {
                    reject(new Error('Модуль ' + moduleName + ' не найден'));
                }
            };
            script.onerror = function() {
                reject(new Error('Не удалось загрузить модуль: ' + screenName));
            };
            document.head.appendChild(script);
        });
    }

    /**
     * Отрендерить контент в контейнере
     * @param {string} html - HTML разметка
     */
    function renderContent(html) {
        var appContainer = document.getElementById('app');
        if (!appContainer) {
            console.error('[AppModule] Контейнер #app не найден');
            return;
        }

        // Плавное скрытие старого контента
        appContainer.style.opacity = '0';
        appContainer.style.transition = 'opacity 0.2s ease';

        setTimeout(function() {
            appContainer.innerHTML = html;
            
            // Плавное появление нового контента
            appContainer.style.opacity = '1';
        }, 200);
    }

    /**
     * Показать индикатор загрузки
     */
    function showLoading() {
        var appContainer = document.getElementById('app');
        if (!appContainer) return;

        appContainer.innerHTML = '<div class="loading-container">' +
            '<div class="spinner-border text-primary" role="status">' +
            '<span class="visually-hidden">Загрузка...</span>' +
            '</div>' +
            '<p class="mt-2">Загрузка экрана...</p>' +
            '</div>';
    }

    /**
     * Скрыть индикатор загрузки
     */
    function hideLoading() {
        // Индикатор будет заменён при рендере
    }

    /**
     * Обновить UI навигации
     * @param {string} screenName - Текущий экран
     */
    function updateNavigation(screenName) {
        var navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(function(link) {
            link.classList.remove('active');
            if (link.getAttribute('data-screen') === screenName) {
                link.classList.add('active');
            }
        });
    }

    /**
     * Обновить индикатор записи
     * @param {Object} record - Данные записи
     */
    function updateRecordIndicator(record) {
        var indicator = document.getElementById('record-indicator');
        if (!indicator) return;

        if (record && record.id) {
            indicator.textContent = 'Запись #' + record.id;
            indicator.classList.remove('bg-secondary');
            indicator.classList.add('bg-success');
        } else {
            indicator.textContent = 'Нет записи';
            indicator.classList.remove('bg-success');
            indicator.classList.add('bg-secondary');
        }
    }

    /**
     * Триггер анимации появления
     */
    function triggerEnterAnimation() {
        var appContainer = document.getElementById('app');
        if (!appContainer) return;

        appContainer.classList.add('screen-enter');
        setTimeout(function() {
            appContainer.classList.remove('screen-enter');
        }, 400);
    }

    /**
     * Настроить обработчики событий
     */
    function setupEventListeners() {
        // Клики по навигации
        var navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(function(link) {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                var screenName = this.getAttribute('data-screen');
                if (screenName) {
                    navigate(screenName);
                }
            });
        });

        // Изменение hash в URL
        window.addEventListener('hashchange', function() {
            var hash = window.location.hash;
            var match = hash.match(/view=(\w+)/);
            if (match && match[1]) {
                var screenName = match[1];
                if (AVAILABLE_SCREENS.indexOf(screenName) !== -1) {
                    navigate(screenName, { silent: true });
                }
            }
        });
    }

    /**
     * Сохранить состояние в localStorage
     */
    function saveState() {
        var state = {
            currentScreen: currentScreen,
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
        var screenToLoad = null;

        // Проверяем URL hash
        var hash = window.location.hash;
        var match = hash.match(/view=(\w+)/);
        if (match && match[1] && AVAILABLE_SCREENS.indexOf(match[1]) !== -1) {
            screenToLoad = match[1];
        } else {
            // Проверяем localStorage
            try {
                var stored = localStorage.getItem(STORAGE_KEY);
                if (stored) {
                    var state = JSON.parse(stored);
                    if (state.currentScreen && AVAILABLE_SCREENS.indexOf(state.currentScreen) !== -1) {
                        screenToLoad = state.currentScreen;
                    }
                }
            } catch (e) {
                console.warn('[AppModule] Не удалось восстановить состояние:', e);
            }
        }

        // Если нет сохранённого состояния, используем настройки
        if (!screenToLoad) {
            screenToLoad = widgetSettings.defaultPage || 'home';
        }

        // Загружаем экран
        navigate(screenToLoad, { silent: true });
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
    }

    /**
     * Эмуляция режима разработки
     */
    function emulateDevelopmentMode() {
        console.log('[AppModule] Режим разработки: эмуляция данных Grist');

        setTimeout(function() {
            handleRecordChange({
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
        navigate: navigate,
        getCurrentScreen: getCurrentScreen,
        getCurrentRecord: getCurrentRecord,
        updateSettings: updateSettings,
        showStatusMessage: showStatusMessage,
        loadTables: loadTables,
        loadTableData: loadTableData,
        loadTableMetadata: loadTableMetadata,
        updateRecord: updateRecord,
        deleteRecord: deleteRecord,
        addRecord: addRecord
    };
})();

// Инициализация при загрузке DOM
document.addEventListener('DOMContentLoaded', function() {
    AppModule.initializeApp();
});
