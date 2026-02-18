/**
 * Модуль страницы "Главная"
 * 
 * Отображает приветственную информацию и общую сводку
 * 
 * @module HomeModule
 */

var HomeModule = (function() {
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

    // ========================================
    // ПУБЛИЧНЫЕ МЕТОДЫ
    // ========================================

    /**
     * Инициализация модуля
     */
    function init() {
        console.log('[HomeModule] Инициализация страницы "Главная"');
        render();
    }

    /**
     * Обработать получение записи из Grist
     * @param {Object} record - Данные записи
     */
    function onRecord(record) {
        currentRecord = record;
        console.log('[HomeModule] Получена запись для главной страницы');
        render();
    }

    /**
     * Обработать получение списка записей из Grist
     * @param {Array} records - Массив записей
     */
    function onRecords(records) {
        recordsList = records;
        console.log('[HomeModule] Получено записей:', records.length);
    }

    /**
     * Вызывается при навигации на эту страницу
     */
    function onNavigate() {
        console.log('[HomeModule] Переход на главную страницу');
        render();
    }

    /**
     * Отрисовка содержимого страницы
     */
    function render() {
        var recordInfoBlock = document.getElementById('home-record-info');
        var recordDataPre = document.getElementById('home-record-data');

        if (recordInfoBlock && recordDataPre) {
            if (currentRecord && Object.keys(currentRecord).length > 0) {
                // Форматируем данные для отображения
                var formattedData = formatRecordData(currentRecord);
                recordDataPre.textContent = formattedData;
                recordInfoBlock.style.display = 'block';
            } else {
                recordInfoBlock.style.display = 'none';
            }
        }
    }

    /**
     * Получить сводную статистику
     * @returns {Object}
     */
    function getStatistics() {
        var stats = {
            totalRecords: recordsList.length,
            hasCurrentRecord: !!currentRecord
        };

        // Подсчёт записей по статусам (если есть поле Status)
        if (recordsList.length > 0) {
            stats.byStatus = {
                done: 0,
                draft: 0,
                other: 0
            };

            recordsList.forEach(function(record) {
                var status = record.Status || record.status;
                if (status === 'Done' || status === 'done') {
                    stats.byStatus.done++;
                } else if (status === 'Draft' || status === 'draft') {
                    stats.byStatus.draft++;
                } else {
                    stats.byStatus.other++;
                }
            });
        }

        return stats;
    }

    // ========================================
    // ПРИВАТНЫЕ МЕТОДЫ
    // ========================================

    /**
     * Форматировать данные записи для отображения
     * @param {Object} record - Данные записи
     * @returns {string}
     */
    function formatRecordData(record) {
        var output = [];
        
        for (var key in record) {
            if (record.hasOwnProperty(key) && key !== 'id') {
                var value = record[key];
                // Форматируем значение
                if (typeof value === 'object' && value !== null) {
                    value = JSON.stringify(value);
                }
                output.push(key + ': ' + value);
            }
        }

        // Добавляем ID записи в начало
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
        getStatistics: getStatistics
    };
})();
