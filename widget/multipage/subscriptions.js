/**
 * Менеджер подписок Grist API
 * 
 * Централизованный менеджер для регистрации и очистки подписок.
 * Предотвращает утечки обработчиков при переключении экранов.
 * 
 * @module SubscriptionsManager
 */

var SubscriptionsManager = (function() {
    'use strict';

    /**
     * Хранилище активных подписок по экранам
     * @type {Object.<string, Array<Function>>}
     */
    var subscriptionsByScreen = {};

    /**
     * Текущий активный экран
     * @type {string|null}
     */
    var currentScreen = null;

    /**
     * Инициализировать менеджер
     */
    function init() {
        subscriptionsByScreen = {};
        currentScreen = null;
        console.log('[SubscriptionsManager] Инициализирован');
    }

    /**
     * Установить текущий экран
     * @param {string} screenName - Имя экрана
     */
    function setCurrentScreen(screenName) {
        // Очищаем подписки предыдущего экрана
        if (currentScreen && currentScreen !== screenName) {
            cleanupScreen(currentScreen);
        }
        
        // Инициализируем хранилище для нового экрана
        if (!subscriptionsByScreen[screenName]) {
            subscriptionsByScreen[screenName] = [];
        }
        
        currentScreen = screenName;
        console.log('[SubscriptionsManager] Текущий экран:', screenName);
    }

    /**
     * Зарегистрировать подписку для текущего экрана
     * @param {Function} unsubscribeFn - Функция отписки
     * @param {string} screenName - Имя экрана (опционально, по умолчанию текущий)
     */
    function subscribe(unsubscribeFn, screenName) {
        var targetScreen = screenName || currentScreen;
        
        if (!targetScreen) {
            console.warn('[SubscriptionsManager] Попытка подписки без указания экрана');
            return;
        }

        if (!subscriptionsByScreen[targetScreen]) {
            subscriptionsByScreen[targetScreen] = [];
        }

        subscriptionsByScreen[targetScreen].push(unsubscribeFn);
        console.log('[SubscriptionsManager] Подписка добавлена для экрана:', targetScreen);
    }

    /**
     * Очистить все подписки указанного экрана
     * @param {string} screenName - Имя экрана
     */
    function cleanupScreen(screenName) {
        var subs = subscriptionsByScreen[screenName];
        
        if (subs && subs.length > 0) {
            console.log('[SubscriptionsManager] Очистка подписок экрана:', screenName, '(' + subs.length + ')');
            
            subs.forEach(function(unsubscribeFn) {
                try {
                    unsubscribeFn();
                } catch (e) {
                    console.error('[SubscriptionsManager] Ошибка при отписке:', e);
                }
            });
            
            subscriptionsByScreen[screenName] = [];
        }
    }

    /**
     * Очистить все подписки всех экранов
     */
    function cleanupAll() {
        console.log('[SubscriptionsManager] Полная очистка всех подписок');
        
        Object.keys(subscriptionsByScreen).forEach(function(screenName) {
            cleanupScreen(screenName);
        });
        
        subscriptionsByScreen = {};
        currentScreen = null;
    }

    /**
     * Получить количество активных подписок для экрана
     * @param {string} screenName - Имя экрана
     * @returns {number}
     */
    function getSubscriptionCount(screenName) {
        var subs = subscriptionsByScreen[screenName];
        return subs ? subs.length : 0;
    }

    /**
     * Получить общее количество активных подписок
     * @returns {number}
     */
    function getTotalSubscriptionCount() {
        var total = 0;
        Object.keys(subscriptionsByScreen).forEach(function(screenName) {
            total += subscriptionsByScreen[screenName].length;
        });
        return total;
    }

    // ========================================
    // ЭКСПОРТ ПУБЛИЧНОГО API
    // ========================================

    return {
        init: init,
        setCurrentScreen: setCurrentScreen,
        subscribe: subscribe,
        cleanupScreen: cleanupScreen,
        cleanupAll: cleanupAll,
        getSubscriptionCount: getSubscriptionCount,
        getTotalSubscriptionCount: getTotalSubscriptionCount
    };
})();
