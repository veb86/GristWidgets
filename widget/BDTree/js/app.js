/**
 * Главный модуль приложения
 *
 * Этот модуль инициализирует все компоненты виджета
 * и управляет общим потоком выполнения.
 *
 * @module AppModule
 */

var AppModule = (function(UIModule, GristApiModule, TreeModule, ConfigModule) {
  'use strict';

  // ========================================
  // ПРИВАТНЫЕ ПЕРЕМЕННЫЕ
  // ========================================

  /**
   * Callback когда данные загружены
   */
  function onDataReady() {
    console.log('Все данные загружены, отрисовка...');

    // Получаем данные из GristApiModule
    var deviceGroups = GristApiModule.getDeviceGroups();
    var systemParams = GristApiModule.getSystemParams();

    // Устанавливаем данные в Tree модуль
    TreeModule.setGroups(deviceGroups);

    // Получаем selectedGroupID из SYSTEM
    var selectedGroupId = GristApiModule.getSystemParamValue(systemParams, 'selectedGroupID');
    UIModule.setSelectedGroupId(selectedGroupId);

    // Отрисовываем дерево
    UIModule.render();

    // Статистика
    var stats = TreeModule.getTreeStats();
    console.log('BDTree Widget загружен:', stats);
  }

  // ========================================
  // ПУБЛИЧНЫЕ МЕТОДЫ
  // ========================================

  /**
   * Инициализировать приложение
   */
  function initializeApp() {
    console.log('Инициализация виджета BDTree...');

    // Показываем индикатор загрузки
    UIModule.showLoading();

    // Инициализировать Grist API с callback
    GristApiModule.initializeGrist(onDataReady);

    // Инициализировать пользовательский интерфейс
    UIModule.initializeUI();
  }

  // ========================================
  // ЭКСПОРТ ПУБЛИЧНОГО API
  // ========================================

  return {
    initializeApp: initializeApp
  };
})(UIModule, GristApiModule, TreeModule, ConfigModule);

// Инициализировать приложение при загрузке DOM
document.addEventListener('DOMContentLoaded', function() {
  AppModule.initializeApp();
});
