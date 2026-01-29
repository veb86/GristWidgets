/**
 * Главный модуль приложения
 *
 * Этот модуль инициализирует все компоненты виджета
 * и управляет общим потоком выполнения.
 *
 * @module AppModule
 */

var AppModule = (function(UIModule, GristApiModule) {
  'use strict';

  // ========================================
  // ПУБЛИЧНЫЕ МЕТОДЫ
  // ========================================

  /**
   * Инициализировать приложение
   */
  function initializeApp() {
    console.log('Инициализация виджета редактируемой таблицы...');

    // Инициализировать Grist API
    GristApiModule.initializeGrist();

    // Инициализировать пользовательский интерфейс
    UIModule.initializeUI();

    // Загрузить список таблиц
    // Добавим небольшую задержку, чтобы гарантировать готовность Grist API
    setTimeout(() => {
      UIModule.loadTables();
    }, 500);
  }

  // ========================================
  // ЭКСПОРТ ПУБЛИЧНОГО API
  // ========================================

  return {
    initializeApp: initializeApp
  };
})(UIModule, GristApiModule);

// Инициализировать приложение при загрузке DOM
document.addEventListener('DOMContentLoaded', function() {
  AppModule.initializeApp();
});