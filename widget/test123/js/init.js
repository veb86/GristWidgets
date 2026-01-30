/**
 * Модуль инициализации для виджета-селектора дашбордов test123
 * Отвечает за дополнительные функции, если они понадобятся
 */

// Инициализация после загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
    console.log('Виджет-селектор дашбордов test123 загружен');

    // Здесь можно добавить дополнительную логику при необходимости
    // Например, дополнительная обработка событий или кастомная логика

    // Обновляем размеры iframe при изменении размера окна
    window.addEventListener('resize', () => {
        const iframe = document.getElementById('dashboard-frame');
        if (iframe && iframe.style.display !== 'none') {
            // Пересчитываем высоту контейнера при изменении размера окна
            const container = document.querySelector('.dashboard-iframe-container');
            if (container) {
                container.style.height = 'calc(100vh - 80px)';
            }
        }
    });
});

// Обработка ошибок загрузки
window.addEventListener('error', (e) => {
    console.error('Ошибка в виджете test123:', e.error);
});

// Обработка предупреждений
window.addEventListener('unhandledrejection', (e) => {
    console.warn('Необработанное обещание:', e.reason);
});