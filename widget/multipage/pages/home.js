/**
 * Модуль страницы "Главная"
 * 
 * Экспорт интерфейса:
 * - init(context) - инициализация
 * - destroy() - очистка ресурсов
 * - onRecord(record) - обработка записи (опционально)
 * - onRecords(records) - обработка списка записей (опционально)
 */

var HomeModule = (function() {
    'use strict';

    /**
     * Контекст экрана
     * @type {Object|null}
     */
    var context = null;

    /**
     * Текущая запись
     * @type {Object|null}
     */
    var currentRecord = null;

    /**
     * Список записей
     * @type {Array}
     */
    var recordsList = [];

    /**
     * Инициализация модуля
     * @param {Object} ctx - Контекст от AppModule
     */
    function init(ctx) {
        context = ctx;
        console.log('[HomeModule] Инициализация');

        // Восстанавливаем данные из контекста
        currentRecord = ctx.currentRecord;
        recordsList = ctx.recordsList || [];

        // Рендерим содержимое
        render();

        // Подписываемся на изменения через менеджер подписок
        subscribeToGrist();
    }

    /**
     * Очистка ресурсов
     */
    function destroy() {
        console.log('[HomeModule] Уничтожение');
        context = null;
        currentRecord = null;
        recordsList = [];
    }

    /**
     * Обработка изменения записи
     * @param {Object} record - Данные записи
     */
    function onRecord(record) {
        currentRecord = record;
        console.log('[HomeModule] Получена запись');
        render();
    }

    /**
     * Обработка изменения списка записей
     * @param {Array} records - Массив записей
     */
    function onRecords(records) {
        recordsList = records;
        console.log('[HomeModule] Получено записей:', records.length);
        renderStatistics();
    }

    /**
     * Подписка на Grist API через менеджер
     */
    function subscribeToGrist() {
        if (!context || !context.grist) {
            console.log('[HomeModule] Grist API недоступен');
            return;
        }

        // Подписка уже обрабатывается глобально в AppModule
        // Здесь можно добавить специфичные подписки если нужно
    }

    /**
     * Отрисовка содержимого
     */
    function render() {
        renderRecordInfo();
        renderStatistics();
    }

    /**
     * Отрисовка информации о записи
     */
    function renderRecordInfo() {
        var infoBlock = document.getElementById('home-record-info');
        var dataPre = document.getElementById('home-record-data');

        if (!infoBlock || !dataPre) return;

        if (currentRecord && Object.keys(currentRecord).length > 0) {
            dataPre.textContent = formatRecordData(currentRecord);
            infoBlock.style.display = 'block';
        } else {
            infoBlock.style.display = 'none';
        }
    }

    /**
     * Отрисовка статистики
     */
    function renderStatistics() {
        // Всего записей
        var totalEl = document.getElementById('stat-total-records');
        if (totalEl) {
            totalEl.textContent = recordsList.length;
        }

        // Текущий экран
        var screenEl = document.getElementById('stat-current-screen');
        if (screenEl && context) {
            screenEl.textContent = context.getCurrentScreen ? context.getCurrentScreen() : '-';
        }

        // Статус записи
        var statusEl = document.getElementById('stat-status');
        if (statusEl) {
            if (currentRecord) {
                var status = currentRecord.Status || currentRecord.status || '-';
                statusEl.textContent = status;
            } else {
                statusEl.textContent = '-';
            }
        }
    }

    /**
     * Форматирование данных записи
     * @param {Object} record - Данные записи
     * @returns {string}
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
        onRecord: onRecord,
        onRecords: onRecords
    };
})();
