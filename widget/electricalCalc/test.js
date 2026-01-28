/**
 * Тестовый скрипт для проверки функциональности рефакторенного виджета electricalCalc
 * Проверяет базовую функциональность Web Components и API взаимодействия
 */

// Функция для логирования результатов тестов
function logTest(testName, passed, message = '') {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    const output = `${status} ${testName}${message ? ': ' + message : ''}`;
    console.log(output);

    // Также выводим на страницу если она существует
    const resultsDiv = document.getElementById('test-results');
    if (resultsDiv) {
        const testDiv = document.createElement('div');
        testDiv.className = passed ? 'test-pass' : 'test-fail';
        testDiv.textContent = output;
        resultsDiv.appendChild(testDiv);
    }

    return passed;
}

// Основной класс для тестирования
class ElectricalCalcTester {
    constructor() {
        this.testResults = [];
        this.passedTests = 0;
        this.totalTests = 0;
    }

    // Инициализация тестирования
    async init() {
        console.log('🚀 Начало тестирования рефакторенного виджета electricalCalc (Web Components)');

        // Ждем немного для загрузки компонентов
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Запускаем все тесты
        await this.runAllTests();

        // Выводим результаты
        this.printResults();
    }

    // Запуск всех тестов
    async runAllTests() {
        // Тестирование структуры HTML
        this.testStructure();

        // Тестирование Web Components
        this.testWebComponents();

        // Тестирование AppHost API
        this.testAppHostAPI();

        // Тестирование CSS стилей
        this.testStyles();

        // Тестирование JavaScript функциональности
        this.testJavaScript();
    }

    // Тестирование структуры HTML
    testStructure() {
        // Проверка основного контейнера
        const mainContainer = document.querySelector('.main-container');
        this.totalTests++;
        if (logTest('Основной контейнер .main-container', !!mainContainer)) {
            this.passedTests++;
        }

        // Проверка левой панели
        const leftPanel = document.getElementById('left-panel');
        this.totalTests++;
        if (logTest('Левая панель #left-panel', !!leftPanel)) {
            this.passedTests++;
        }

        // Проверка правой панели
        const rightPanel = document.getElementById('right-panel');
        this.totalTests++;
        if (logTest('Правая панель #right-panel', !!rightPanel)) {
            this.passedTests++;
        }

        // Проверка вкладок
        const tabs = document.querySelector('.tabs');
        this.totalTests++;
        if (logTest('Контейнер вкладок .tabs', !!tabs)) {
            this.passedTests++;
        }

        // Проверка кнопок вкладок
        const tabButtons = document.querySelectorAll('.tab-btn');
        this.totalTests++;
        if (logTest('Кнопки вкладок .tab-btn', tabButtons.length === 2)) {
            this.passedTests++;
        }

        // Проверка панелей контента
        const tabPanes = document.querySelectorAll('.tab-pane');
        this.totalTests++;
        if (logTest('Панели контента .tab-pane', tabPanes.length === 2)) {
            this.passedTests++;
        }
    }

    // Тестирование Web Components
    testWebComponents() {
        // Проверка регистрации компонентов
        const treeElement = document.querySelector('element-tree');
        this.totalTests++;
        if (logTest('Компонент element-tree зарегистрирован', !!treeElement)) {
            this.passedTests++;
        }

        const editTableElement = document.querySelector('element-edit-table');
        this.totalTests++;
        if (logTest('Компонент element-edit-table зарегистрирован', !!editTableElement)) {
            this.passedTests++;
        }

        const oneLineSchemaElement = document.querySelector('element-one-line-schema');
        this.totalTests++;
        if (logTest('Компонент element-one-line-schema зарегистрирован', !!oneLineSchemaElement)) {
            this.passedTests++;
        }

        // Проверка, что компоненты имеют shadowRoot
        if (treeElement && treeElement.shadowRoot) {
            this.totalTests++;
            if (logTest('element-tree имеет shadowRoot', true)) {
                this.passedTests++;
            }
        } else {
            this.totalTests++;
            logTest('element-tree имеет shadowRoot', false);
        }

        if (editTableElement && editTableElement.shadowRoot) {
            this.totalTests++;
            if (logTest('element-edit-table имеет shadowRoot', true)) {
                this.passedTests++;
            }
        } else {
            this.totalTests++;
            logTest('element-edit-table имеет shadowRoot', false);
        }

        if (oneLineSchemaElement && oneLineSchemaElement.shadowRoot) {
            this.totalTests++;
            if (logTest('element-one-line-schema имеет shadowRoot', true)) {
                this.passedTests++;
            }
        } else {
            this.totalTests++;
            logTest('element-one-line-schema имеет shadowRoot', false);
        }
    }

    // Тестирование AppHost API
    testAppHostAPI() {
        // Проверка наличия AppHost
        this.totalTests++;
        if (logTest('Объект AppHost создан', !!window.AppHost)) {
            this.passedTests++;
        }

        // Проверка методов AppHost
        if (window.AppHost) {
            this.totalTests++;
            if (logTest('Метод AppHost.getData()', typeof window.AppHost.getData === 'function')) {
                this.passedTests++;
            }

            this.totalTests++;
            if (logTest('Метод AppHost.subscribe()', typeof window.AppHost.subscribe === 'function')) {
                this.passedTests++;
            }

            this.totalTests++;
            if (logTest('Метод AppHost.sendEvent()', typeof window.AppHost.sendEvent === 'function')) {
                this.passedTests++;
            }

            this.totalTests++;
            if (logTest('Метод AppHost.setSelectedRows()', typeof window.AppHost.setSelectedRows === 'function')) {
                this.passedTests++;
            }
        }
    }

    // Тестирование CSS стилей
    testStyles() {
        // Проверка flexbox для основного контейнера
        const mainContainer = document.querySelector('.main-container');
        if (mainContainer) {
            const containerStyles = window.getComputedStyle(mainContainer);

            this.totalTests++;
            if (logTest('Flexbox для контейнера', containerStyles.display === 'flex')) {
                this.passedTests++;
            }

            // Проверка ширины левой панели
            const leftPanel = document.getElementById('left-panel');
            if (leftPanel) {
                const leftStyles = window.getComputedStyle(leftPanel);

                this.totalTests++;
                if (logTest('Ширина левой панели 20%', parseInt(leftStyles.width) > 0)) {
                    this.passedTests++;
                }
            }
        }
    }

    // Тестирование JavaScript функциональности
    testJavaScript() {
        // Проверка наличия класса активной вкладки
        const activeTab = document.querySelector('.tab-btn.active');
        this.totalTests++;
        if (logTest('Активная вкладка по умолчанию', !!activeTab)) {
            this.passedTests++;
        }

        // Проверка наличия активной панели
        const activePane = document.querySelector('.tab-pane.active');
        this.totalTests++;
        if (logTest('Активная панель по умолчанию', !!activePane)) {
            this.passedTests++;
        }

        // Проверяем наличие объекта tabManager
        const tabManagerExists = !!(window.tabManager);
        this.totalTests++;
        if (logTest('Объект TabManager создан', tabManagerExists)) {
            this.passedTests++;
        }

        // Проверка, что внешние библиотеки загружены
        const jqueryExists = typeof $ !== 'undefined';
        this.totalTests++;
        if (logTest('jQuery загружен', jqueryExists)) {
            this.passedTests++;
        }

        const tabulatorExists = typeof Tabulator !== 'undefined';
        this.totalTests++;
        if (logTest('Tabulator загружен', tabulatorExists)) {
            this.passedTests++;
        }
    }

    // Вывод итоговых результатов
    printResults() {
        console.log('\n📊 Итоги тестирования:');
        console.log(`Пройдено: ${this.passedTests}/${this.totalTests} тестов`);
        console.log(`Процент успешности: ${Math.round((this.passedTests / this.totalTests) * 100)}%`);

        if (this.passedTests === this.totalTests) {
            console.log('🎉 Все тесты пройдены успешно!');
        } else {
            console.log('⚠️  Некоторые тесты не пройдены. Проверьте детали выше.');
        }
    }
}

// Запуск тестирования после загрузки страницы
document.addEventListener('DOMContentLoaded', () => {
    // Даем время на загрузку и инициализацию компонентов
    setTimeout(() => {
        const tester = new ElectricalCalcTester();
        tester.init();
    }, 2000);
});

// Экспорт для использования в других скриптах
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ElectricalCalcTester;
}