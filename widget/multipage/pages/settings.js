/**
 * Модуль страницы "Настройки"
 * 
 * Управление настройками виджета.
 * 
 * Экспорт интерфейса:
 * - init(context) - инициализация
 * - destroy() - очистка ресурсов
 * - onRecord(record) - обработка записи (опционально)
 * - onRecords(records) - обработка списка записей (опционально)
 */

var SettingsModule = (function() {
    'use strict';

    /**
     * Контекст экрана
     * @type {Object|null}
     */
    var context = null;

    /**
     * Локальные настройки
     * @type {Object}
     */
    var localSettings = {
        autoSwitch: 'disabled',
        defaultPage: 'home'
    };

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
        console.log('[SettingsModule] Инициализация');

        // Загружаем текущие настройки
        var settings = ctx.getSettings ? ctx.getSettings() : {};
        localSettings = Object.assign({}, localSettings, settings);

        // Рендерим форму
        renderForm();

        // Настраиваем обработчики
        setupEventListeners();

        // Обновляем информацию
        updateSubscriptionInfo();
    }

    /**
     * Очистка ресурсов
     */
    function destroy() {
        console.log('[SettingsModule] Уничтожение');

        // Снимаем обработчики
        eventHandlers.forEach(function(handler) {
            if (handler.element && handler.event && handler.fn) {
                handler.element.removeEventListener(handler.event, handler.fn);
            }
        });
        eventHandlers = [];

        context = null;
    }

    /**
     * Обработка изменения записи
     * @param {Object} record - Данные записи
     */
    function onRecord(record) {
        // Настройки не зависят от записи
    }

    /**
     * Настроить обработчики событий
     */
    function setupEventListeners() {
        // Форма настроек
        var settingsForm = document.getElementById('settings-form');
        if (settingsForm) {
            var submitHandler = function(e) {
                e.preventDefault();
                saveSettings();
            };
            settingsForm.addEventListener('submit', submitHandler);
            eventHandlers.push({ element: settingsForm, event: 'submit', fn: submitHandler });
        }

        // Кнопка сброса
        var resetBtn = document.getElementById('reset-settings-btn');
        if (resetBtn) {
            var resetHandler = function() {
                resetSettings();
            };
            resetBtn.addEventListener('click', resetHandler);
            eventHandlers.push({ element: resetBtn, event: 'click', fn: resetHandler });
        }

        // Кнопка обновления информации
        var refreshBtn = document.getElementById('refresh-info-btn');
        if (refreshBtn) {
            var refreshHandler = function() {
                updateSubscriptionInfo();
            };
            refreshBtn.addEventListener('click', refreshHandler);
            eventHandlers.push({ element: refreshBtn, event: 'click', fn: refreshHandler });
        }
    }

    /**
     * Отрисовать форму
     */
    function renderForm() {
        var autoSwitchSelect = document.getElementById('auto-switch');
        var defaultPageSelect = document.getElementById('default-page');

        if (autoSwitchSelect) {
            autoSwitchSelect.value = localSettings.autoSwitch || 'disabled';
        }

        if (defaultPageSelect) {
            defaultPageSelect.value = localSettings.defaultPage || 'home';
        }
    }

    /**
     * Сохранить настройки
     */
    function saveSettings() {
        var autoSwitchSelect = document.getElementById('auto-switch');
        var defaultPageSelect = document.getElementById('default-page');

        var newSettings = {
            autoSwitch: autoSwitchSelect ? autoSwitchSelect.value : 'disabled',
            defaultPage: defaultPageSelect ? defaultPageSelect.value : 'home'
        };

        // Обновляем через контекст
        if (context && context.updateSettings) {
            context.updateSettings(newSettings);
        }

        localSettings = newSettings;

        context.showStatusMessage('Настройки сохранены', 'success');
        updateSubscriptionInfo();
    }

    /**
     * Сбросить настройки
     */
    function resetSettings() {
        if (!confirm('Сбросить настройки к значениям по умолчанию?')) {
            return;
        }

        localSettings = {
            autoSwitch: 'disabled',
            defaultPage: 'home'
        };

        if (context && context.updateSettings) {
            context.updateSettings(localSettings);
        }

        renderForm();
        context.showStatusMessage('Настройки сброшены', 'info');
    }

    /**
     * Обновить информацию о подписках
     */
    function updateSubscriptionInfo() {
        // Текущий экран
        var screenEl = document.getElementById('info-current-screen');
        if (screenEl && context && context.getCurrentScreen) {
            screenEl.textContent = context.getCurrentScreen() || '-';
        }

        // Количество подписок
        var countEl = document.getElementById('info-subscription-count');
        if (countEl && typeof SubscriptionsManager !== 'undefined') {
            var count = SubscriptionsManager.getTotalSubscriptionCount();
            countEl.textContent = count;
        }
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
