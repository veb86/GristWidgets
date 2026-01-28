/**
 * Скрипт для автоматического тестирования виджета electricalCalc
 * Проверяет базовую функциональность и корректность работы
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
        this.iframe = null;
        this.testResults = [];
        this.passedTests = 0;
        this.totalTests = 0;
    }

    // Инициализация тестирования
    async init() {
        console.log('🚀 Начало тестирования виджета electricalCalc');
        
        // Ожидаем загрузки iframe
        await this.waitForIframeLoad();
        
        // Запускаем все тесты
        await this.runAllTests();
        
        // Выводим результаты
        this.printResults();
    }

    // Ожидание загрузки iframe
    async waitForIframeLoad() {
        return new Promise((resolve) => {
            this.iframe = document.querySelector('.widget-preview');
            
            if (!this.iframe) {
                logTest('Поиск iframe', false, 'iframe не найден');
                return;
            }

            this.iframe.addEventListener('load', () => {
                console.log('Iframe загружен');
                setTimeout(resolve, 1000); // Даем время на инициализацию
            });

            // Если iframe уже загружен
            if (this.iframe.contentDocument && this.iframe.contentDocument.readyState === 'complete') {
                setTimeout(resolve, 1000);
            }
        });
    }

    // Получение документа iframe
    getIframeDoc() {
        try {
            return this.iframe.contentDocument || this.iframe.contentWindow.document;
        } catch (e) {
            console.log('Нет доступа к iframe (нормально для кросс-доменных запросов)');
            return null;
        }
    }

    // Запуск всех тестов
    async runAllTests() {
        const doc = this.getIframeDoc();
        
        // Тестирование структуры HTML
        this.testStructure(doc);
        
        // Тестирование CSS стилей
        this.testStyles(doc);
        
        // Тестирование JavaScript функциональности
        this.testJavaScript(doc);
        
        // Тестирование адаптивности
        this.testResponsiveness();
        
        // Тестирование доступности ресурсов
        await this.testResources();
    }

    // Тестирование структуры HTML
    testStructure(doc) {
        if (!doc) {
            logTest('Проверка структуры HTML', false, 'Нет доступа к документу iframe');
            return;
        }

        // Проверка основного контейнера
        const mainContainer = doc.querySelector('.main-container');
        this.totalTests++;
        if (logTest('Основной контейнер .main-container', !!mainContainer)) {
            this.passedTests++;
        }

        // Проверка левой панели
        const leftPanel = doc.getElementById('left-panel');
        this.totalTests++;
        if (logTest('Левая панель #left-panel', !!leftPanel)) {
            this.passedTests++;
        }

        // Проверка правой панели
        const rightPanel = doc.getElementById('right-panel');
        this.totalTests++;
        if (logTest('Правая панель #right-panel', !!rightPanel)) {
            this.passedTests++;
        }

        // Проверка вкладок
        const tabs = doc.querySelector('.tabs');
        this.totalTests++;
        if (logTest('Контейнер вкладок .tabs', !!tabs)) {
            this.passedTests++;
        }

        // Проверка кнопок вкладок
        const tabButtons = doc.querySelectorAll('.tab-btn');
        this.totalTests++;
        if (logTest('Кнопки вкладок .tab-btn', tabButtons.length === 2)) {
            this.passedTests++;
        }

        // Проверка панелей контента
        const tabPanes = doc.querySelectorAll('.tab-pane');
        this.totalTests++;
        if (logTest('Панели контента .tab-pane', tabPanes.length === 2)) {
            this.passedTests++;
        }

        // Проверка iframe в панелях
        const iframes = doc.querySelectorAll('iframe');
        this.totalTests++;
        if (logTest('Iframe в панелях', iframes.length === 3)) { // 1 в левой + 2 в правой
            this.passedTests++;
        }
    }

    // Тестирование CSS стилей
    testStyles(doc) {
        if (!doc) {
            logTest('Проверка CSS стилей', false, 'Нет доступа к документу iframe');
            return;
        }

        // Проверка flexbox для основного контейнера
        const mainContainer = doc.querySelector('.main-container');
        const containerStyles = window.getComputedStyle(mainContainer);
        
        this.totalTests++;
        if (logTest('Flexbox для контейнера', containerStyles.display === 'flex')) {
            this.passedTests++;
        }

        // Проверка ширины левой панели
        const leftPanel = doc.getElementById('left-panel');
        const leftStyles = window.getComputedStyle(leftPanel);
        
        this.totalTests++;
        if (logTest('Ширина левой панели 20%', leftStyles.width === '20%' || leftStyles.width.includes('20%'))) {
            this.passedTests++;
        }
    }

    // Тестирование JavaScript функциональности
    testJavaScript(doc) {
        if (!doc) {
            logTest('Проверка JavaScript', false, 'Нет доступа к документу iframe');
            return;
        }

        // Проверка наличия класса активной вкладки
        const activeTab = doc.querySelector('.tab-btn.active');
        this.totalTests++;
        if (logTest('Активная вкладка по умолчанию', !!activeTab)) {
            this.passedTests++;
        }

        // Проверка наличия активной панели
        const activePane = doc.querySelector('.tab-pane.active');
        this.totalTests++;
        if (logTest('Активная панель по умолчанию', !!activePane)) {
            this.passedTests++;
        }

        // Проверяем наличие объекта tabManager
        try {
            const tabManagerExists = !!(this.iframe.contentWindow.tabManager);
            this.totalTests++;
            if (logTest('Объект TabManager создан', tabManagerExists)) {
                this.passedTests++;
            }
        } catch (e) {
            this.totalTests++;
            logTest('Объект TabManager', false, 'Нет доступа к объекту');
        }
    }

    // Тестирование адаптивности
    testResponsiveness() {
        const originalWidth = window.innerWidth;
        
        // Тестирование мобильной версии
        window.innerWidth = 600;
        window.dispatchEvent(new Event('resize'));
        
        setTimeout(() => {
            const doc = this.getIframeDoc();
            if (doc) {
                const leftPanel = doc.getElementById('left-panel');
                const leftStyles = window.getComputedStyle(leftPanel);
                
                this.totalTests++;
                if (logTest('Адаптивность мобильная версия', leftStyles.width === '100%')) {
                    this.passedTests++;
                }
            }
            
            // Восстановление размера
            window.innerWidth = originalWidth;
            window.dispatchEvent(new Event('resize'));
        }, 500);
    }

    // Тестирование доступности ресурсов
    async testResources() {
        const resources = [
            './css/style.css',
            './js/tabs.js',
            '../tree/index.html',
            '../edittable/index.html',
            '../onelineschema/index.html'
        ];

        for (const resource of resources) {
            try {
                const response = await fetch(resource);
                this.totalTests++;
                if (logTest(`Ресурс ${resource}`, response.ok)) {
                    this.passedTests++;
                }
            } catch (e) {
                this.totalTests++;
                logTest(`Ресурс ${resource}`, false, e.message);
            }
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
    // Даем время на загрузку iframe
    setTimeout(() => {
        const tester = new ElectricalCalcTester();
        tester.init();
    }, 2000);
});

// Экспорт для использования в других скриптах
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ElectricalCalcTester;
}