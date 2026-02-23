/**
 * Главный модуль приложения
 *
 * Этот модуль инициализирует все компоненты виджета
 * и управляет общим потоком выполнения.
 *
 * @module AppModule
 */

var AppModule = (function(UIModule, GristApiModule, ConfigModule) {
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
    var devices = GristApiModule.getDevices();
    var systemParams = GristApiModule.getSystemParams();

    // Устанавливаем данные в UI модуль
    UIModule.setDeviceGroups(deviceGroups);
    UIModule.setDevices(devices);

    // Получаем selectedGroupID из SYSTEM
    var selectedGroupId = GristApiModule.getSystemParamValue(systemParams, 'selectedGroupID');
    UIModule.setSelectedGroupId(selectedGroupId);

    // Загружаем характеристики для выбранной группы ПЕРЕД отрисовкой
    updateCharacteristicsForGroup(selectedGroupId);

    console.log('BDControl Widget загружен:', {
      groups: deviceGroups.length,
      devices: devices.length,
      selectedGroupId: selectedGroupId
    });

    // Отрисовываем ПОСЛЕ загрузки характеристик
    UIModule.render();
  }

  /**
   * Callback при изменении SYSTEM
   */
  function onSystemChange(systemParams) {
    console.log('SYSTEM изменена:', systemParams);

    // Получаем новый selectedGroupID
    var selectedGroupId = GristApiModule.getSystemParamValue(systemParams, 'selectedGroupID');

    console.log('Новый selectedGroupID:', selectedGroupId);

    // Обновляем выбранный ID
    UIModule.setSelectedGroupId(selectedGroupId);

    // Загружаем характеристики для новой группы
    updateCharacteristicsForGroup(selectedGroupId);

    // Перерисовываем виджет
    UIModule.render();
  }

  /**
   * Обновить характеристики для текущей группы
   * @param {number} groupId - ID группы
   */
  function updateCharacteristicsForGroup(groupId) {
    console.log('[App] updateCharacteristicsForGroup, groupId:', groupId);
    
    if (!groupId) {
      console.log('[App] groupId не указан, очищаем характеристики');
      UIModule.setCharacteristics([]);
      return;
    }

    var characteristics = GristApiModule.getCharacteristicsForGroup(groupId);
    console.log('[App] Характеристики для группы ' + groupId + ':', characteristics);
    console.log('[App] Количество характеристик:', characteristics.length);
    UIModule.setCharacteristics(characteristics);
  }

  // ========================================
  // ПУБЛИЧНЫЕ МЕТОДЫ
  // ========================================

  /**
   * Инициализировать приложение
   */
  function initializeApp() {
    console.log('Инициализация виджета BDControl...');

    // Инициализировать Grist API с callback
    GristApiModule.initializeGrist(onDataReady, onSystemChange);

    // Инициализировать пользовательский интерфейс
    UIModule.initializeUI();
  }

  // ========================================
  // ЭКСПОРТ ПУБЛИЧНОГО API
  // ========================================

  return {
    initializeApp: initializeApp
  };
})(UIModule, GristApiModule, ConfigModule);

// Инициализировать приложение при загрузке DOM
document.addEventListener('DOMContentLoaded', function() {
  AppModule.initializeApp();
});
