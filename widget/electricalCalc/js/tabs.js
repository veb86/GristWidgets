/**
 * Модуль управления вкладками для виджета-органайзера electricalCalc
 * Отвечает за переключение между вкладками в правой панели
 * Обновлен для работы с Web Components вместо iframe
 */

// Класс для управления системой вкладок
class TabManager {
    constructor() {
        this.activeTab = null;
        this.tabButtons = [];
        this.tabPanes = [];
        this.init();
    }

    /**
     * Инициализация системы вкладок
     * Находит все кнопки и панели вкладок, устанавливает обработчики событий
     */
    init() {
        // Получаем все кнопки вкладок
        this.tabButtons = document.querySelectorAll('.tab-btn');
        // Получаем все панели контента вкладок
        this.tabPanes = document.querySelectorAll('.tab-pane');

        // Устанавливаем обработчики событий для кнопок
        this.tabButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                this.switchTab(e.target);
            });
        });

        // Определяем активную вкладку при загрузке
        this.activeTab = document.querySelector('.tab-btn.active');

        // Добавляем обработку клавиатурной навигации
        this.initKeyboardNavigation();

        console.log('Система вкладок инициализирована');
    }

    /**
     * Переключение на указанную вкладку
     * @param {HTMLElement} clickedButton - Кнопка, на которую нажали
     */
    switchTab(clickedButton) {
        // Получаем идентификатор вкладки из data-атрибута
        const tabId = clickedButton.dataset.tab;

        if (!tabId) {
            console.warn('Кнопка вкладки не имеет data-tab атрибута');
            return;
        }

        // Убираем активный класс со всех кнопок и панелей
        this.tabButtons.forEach(btn => btn.classList.remove('active'));
        this.tabPanes.forEach(pane => pane.classList.remove('active'));

        // Добавляем активный класс нажатой кнопке
        clickedButton.classList.add('active');

        // Находим и активируем соответствующую панель
        const targetPane = document.getElementById(tabId);
        if (targetPane) {
            targetPane.classList.add('active');
            this.activeTab = clickedButton;

            // Вызываем событие переключения вкладки
            this.onTabSwitch(tabId, targetPane);
        } else {
            console.error(`Панель вкладки с id="${tabId}" не найдена`);
        }
    }

    /**
     * Обработчик события переключения вкладки
     * @param {string} tabId - Идентификатор вкладки
     * @param {HTMLElement} pane - Элемент панели
     */
    onTabSwitch(tabId, pane) {
        // Для Web Components не требуется специальная обработка
        // Компоненты уже находятся в DOM и готовы к работе

        // Отправляем событие о переключении вкладки через AppHost
        if (window.AppHost) {
            window.AppHost.sendEvent('tab-switched', { tabId, paneId: pane.id });
        }

        console.log(`Переключились на вкладку: ${tabId}`);
    }

    /**
     * Инициализация клавиатурной навигации
     * Позволяет переключать вкладки с помощью клавиатуры
     */
    initKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            // Переключение вкладок по Ctrl+Tab и Ctrl+Shift+Tab
            if (e.ctrlKey && e.key === 'Tab') {
                e.preventDefault();

                if (e.shiftKey) {
                    this.switchToPreviousTab();
                } else {
                    this.switchToNextTab();
                }
            }

            // Активация вкладки по Enter или Space когда кнопка в фокусе
            if (e.target.classList.contains('tab-btn') &&
                (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                this.switchTab(e.target);
            }
        });
    }

    /**
     * Переключение на следующую вкладку
     */
    switchToNextTab() {
        const currentIndex = Array.from(this.tabButtons).indexOf(this.activeTab);
        const nextIndex = (currentIndex + 1) % this.tabButtons.length;
        this.switchTab(this.tabButtons[nextIndex]);
    }

    /**
     * Переключение на предыдущую вкладку
     */
    switchToPreviousTab() {
        const currentIndex = Array.from(this.tabButtons).indexOf(this.activeTab);
        const prevIndex = currentIndex === 0 ?
            this.tabButtons.length - 1 : currentIndex - 1;
        this.switchTab(this.tabButtons[prevIndex]);
    }

    /**
     * Получение активной вкладки
     * @returns {HTMLElement|null} Активная кнопка вкладки
     */
    getActiveTab() {
        return this.activeTab;
    }

    /**
     * Получение идентификатора активной вкладки
     * @returns {string|null} Идентификатор активной вкладки
     */
    getActiveTabId() {
        return this.activeTab ? this.activeTab.dataset.tab : null;
    }
}

// Инициализация системы вкладок после загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
    // Создаем экземпляр менеджера вкладок
    window.tabManager = new TabManager();

    console.log('Виджет-органайзер electricalCalc (Web Components) загружен');
});

// Обработка ошибок загрузки
window.addEventListener('error', (e) => {
    console.error('Ошибка в виджете electricalCalc:', e.error);
});

// Обработка предупреждений
window.addEventListener('unhandledrejection', (e) => {
    console.warn('Необработанное обещание:', e.reason);
});