/**
 * Модуль страницы "Настройки"
 * 
 * Управление настройками виджета:
 * - Автоматическое переключение страниц
 * - Страница по умолчанию
 * - Дополнительные опции
 * 
 * @module SettingsModule
 */

var SettingsModule = (function() {
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
     * Текущие настройки виджета
     * @type {Object}
     */
    var widgetSettings = {
        autoSwitch: 'disabled',
        defaultPage: 'home'
    };

    /**
     * Доступные опции для страницы по умолчанию
     * @type {Array}
     */
    var availablePages = [
        { value: 'home', label: 'Главная' },
        { value: 'details', label: 'Детали' },
        { value: 'settings', label: 'Настройки' }
    ];

    // ========================================
    // ПУБЛИЧНЫЕ МЕТОДЫ
    // ========================================

    /**
     * Инициализация модуля
     * @param {Object} settings - Настройки из AppModule
     */
    function init(settings) {
        console.log('[SettingsModule] Инициализация страницы "Настройки"');
        
        if (settings) {
            widgetSettings = Object.assign({}, widgetSettings, settings);
        }
        
        render();
        setupFormHandlers();
    }

    /**
     * Обработать получение записи из Grist
     * @param {Object} record - Данные записи
     */
    function onRecord(record) {
        currentRecord = record;
        console.log('[SettingsModule] Получена запись для страницы настроек');
    }

    /**
     * Обработать получение списка записей из Grist
     * @param {Array} records - Массив записей
     */
    function onRecords(records) {
        recordsList = records;
        console.log('[SettingsModule] Получено записей:', records.length);
    }

    /**
     * Вызывается при навигации на эту страницу
     */
    function onNavigate() {
        console.log('[SettingsModule] Переход на страницу настроек');
        render();
        syncFormWithSettings();
    }

    /**
     * Обновить настройки виджета
     * @param {Object} newSettings - Новые настройки
     */
    function updateSettings(newSettings) {
        widgetSettings = Object.assign({}, widgetSettings, newSettings);
        
        // Уведомляем AppModule об изменениях
        if (typeof AppModule !== 'undefined' && AppModule.updateSettings) {
            AppModule.updateSettings(widgetSettings);
        }
        
        console.log('[SettingsModule] Настройки обновлены:', widgetSettings);
    }

    /**
     * Сбросить настройки к значениям по умолчанию
     */
    function resetToDefaults() {
        widgetSettings = {
            autoSwitch: 'disabled',
            defaultPage: 'home'
        };
        
        updateSettings(widgetSettings);
        syncFormWithSettings();
        
        AppModule.showStatusMessage('Настройки сброшены к значениям по умолчанию', 'info');
    }

    /**
     * Экспортировать настройки в JSON
     * @returns {string}
     */
    function exportSettings() {
        return JSON.stringify(widgetSettings, null, 2);
    }

    /**
     * Импортировать настройки из JSON
     * @param {string} jsonString - JSON строка с настройками
     * @returns {boolean}
     */
    function importSettings(jsonString) {
        try {
            var imported = JSON.parse(jsonString);
            
            // Валидация импортированных настроек
            if (typeof imported.autoSwitch === 'string') {
                widgetSettings.autoSwitch = imported.autoSwitch;
            }
            if (typeof imported.defaultPage === 'string') {
                widgetSettings.defaultPage = imported.defaultPage;
            }
            
            updateSettings(widgetSettings);
            syncFormWithSettings();
            
            AppModule.showStatusMessage('Настройки успешно импортированы', 'success');
            return true;
        } catch (e) {
            console.error('[SettingsModule] Ошибка импорта настроек:', e);
            AppModule.showStatusMessage('Ошибка импорта: неверный формат JSON', 'error');
            return false;
        }
    }

    // ========================================
    // ПРИВАТНЫЕ МЕТОДЫ
    // ========================================

    /**
     * Отрисовка содержимого страницы
     */
    function render() {
        // Дополнительная информация о записи
        var recordInfoDiv = document.getElementById('settings-record-info');
        
        if (recordInfoDiv) {
            if (currentRecord && currentRecord.id) {
                recordInfoDiv.style.display = 'block';
                recordInfoDiv.innerHTML = '<strong>Активная запись:</strong> #' + currentRecord.id;
            } else {
                recordInfoDiv.style.display = 'none';
            }
        }
    }

    /**
     * Настроить обработчики формы
     */
    function setupFormHandlers() {
        var settingsForm = document.getElementById('settings-form');
        
        if (settingsForm) {
            // Обработчик отправки формы уже установлен в app.js
            // Добавляем кнопку сброса
            var resetBtn = document.createElement('button');
            resetBtn.type = 'button';
            resetBtn.className = 'btn btn-outline-secondary mt-2';
            resetBtn.textContent = '↺ Сбросить настройки';
            resetBtn.onclick = resetToDefaults;
            
            // Вставляем кнопку после кнопки сохранения
            var submitBtn = settingsForm.querySelector('button[type="submit"]');
            if (submitBtn && submitBtn.parentNode) {
                submitBtn.parentNode.insertBefore(resetBtn, submitBtn.nextSibling);
            }
        }
    }

    /**
     * Синхронизировать форму с текущими настройками
     */
    function syncFormWithSettings() {
        var autoSwitchSelect = document.getElementById('auto-switch');
        var defaultPageSelect = document.getElementById('default-page');
        
        if (autoSwitchSelect) {
            autoSwitchSelect.value = widgetSettings.autoSwitch || 'disabled';
        }
        
        if (defaultPageSelect) {
            defaultPageSelect.value = widgetSettings.defaultPage || 'home';
        }
    }

    /**
     * Получить доступные страницы для выбора
     * @returns {Array}
     */
    function getAvailablePages() {
        return availablePages.slice();
    }

    /**
     * Проверить, включено ли автоматическое переключение
     * @returns {boolean}
     */
    function isAutoSwitchEnabled() {
        return widgetSettings.autoSwitch === 'enabled';
    }

    /**
     * Получить текущую страницу по умолчанию
     * @returns {string}
     */
    function getDefaultPage() {
        return widgetSettings.defaultPage;
    }

    /**
     * Получить все настройки
     * @returns {Object}
     */
    function getAllSettings() {
        return Object.assign({}, widgetSettings);
    }

    // ========================================
    // ЭКСПОРТ ПУБЛИЧНОГО API
    // ========================================

    return {
        init: init,
        onRecord: onRecord,
        onRecords: onRecords,
        onNavigate: onNavigate,
        updateSettings: updateSettings,
        resetToDefaults: resetToDefaults,
        exportSettings: exportSettings,
        importSettings: importSettings,
        getAvailablePages: getAvailablePages,
        isAutoSwitchEnabled: isAutoSwitchEnabled,
        getDefaultPage: getDefaultPage,
        getAllSettings: getAllSettings
    };
})();
