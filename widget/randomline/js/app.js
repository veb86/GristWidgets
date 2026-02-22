/**
 * Random Line Widget для Grist
 * Отправляет команды на Flask сервер для генерации случайных линий в ZCAD
 */

(function() {
    'use strict';

    // Конфигурация
    const CONFIG = {
        defaultFlaskUrl: 'http://127.0.0.1:5000',
        defaultLineCount: 1000,
        defaultMinCoord: -100,
        defaultMaxCoord: 100,
        maxLines: 10000,
        requestTimeout: 30000 // 30 секунд
    };

    // Состояние виджета
    let state = {
        flaskUrl: CONFIG.defaultFlaskUrl,
        isProcessing: false,
        logEntries: []
    };

    // DOM элементы
    let elements = {};

    /**
     * Инициализация виджета
     */
    async function init() {
        console.log('[RandomLine] Инициализация виджета...');

        // Кэшируем DOM элементы
        cacheElements();

        // Настраиваем обработчики событий
        setupEventListeners();

        // Инициализируем Grist
        await initGrist();

        // Восстанавливаем настройки из localStorage
        loadSettings();

        // Обновляем отображение
        updateUI();

        console.log('[RandomLine] Виджет готов к работе');
    }

    /**
     * Кэширование DOM элементов
     */
    function cacheElements() {
        elements = {
            lineCount: document.getElementById('line-count'),
            seedValue: document.getElementById('seed-value'),
            minCoord: document.getElementById('min-coord'),
            maxCoord: document.getElementById('max-coord'),
            flaskUrl: document.getElementById('flask-url'),
            drawBtn: document.getElementById('draw-btn'),
            btnLineCount: document.getElementById('btn-line-count'),
            progressContainer: document.getElementById('progress-container'),
            progressBar: document.getElementById('progress-bar'),
            progressText: document.getElementById('progress-text'),
            resultContainer: document.getElementById('result-container'),
            resultAlert: document.getElementById('result-alert'),
            logContainer: document.getElementById('log-container'),
            connectionStatus: document.getElementById('connection-status'),
            pingBtn: document.getElementById('ping-btn')
        };
    }

    /**
     * Настройка обработчиков событий
     */
    function setupEventListeners() {
        // Обновление счётчика линий на кнопке
        elements.lineCount.addEventListener('input', function() {
            const count = parseInt(this.value) || CONFIG.defaultLineCount;
            elements.btnLineCount.textContent = formatNumber(count);
        });

        // Кнопка рисования
        elements.drawBtn.addEventListener('click', handleDraw);

        // Кнопка проверки соединения
        elements.pingBtn.addEventListener('click', handlePing);

        // Сохранение настроек при изменении
        elements.flaskUrl.addEventListener('change', saveSettings);
    }

    /**
     * Инициализация Grist
     */
    async function initGrist() {
        return new Promise((resolve) => {
            if (typeof window.grist !== 'undefined') {
                window.grist.ready('full', {
                    requiredAccess: 'full'
                });

                // Подписка на изменения записи
                window.grist.onRecord(function(record) {
                    console.log('[RandomLine] Новая запись:', record);
                    onRecordChange(record);
                });

                // Подписка на настройки
                window.grist.onOptions(function(options) {
                    console.log('[RandomLine] Настройки:', options);
                    onOptionsChange(options);
                });

                console.log('[RandomLine] Grist инициализирован');
            } else {
                console.warn('[RandomLine] Grist API не доступен, работа в автономном режиме');
            }
            resolve();
        });
    }

    /**
     * Обработчик изменения записи
     */
    function onRecordChange(record) {
        // Можно использовать для автоматического переключения параметров
        console.log('[RandomLine] Изменение записи:', record.id);
    }

    /**
     * Обработчик изменения настроек
     */
    function onOptionsChange(options) {
        if (options.flaskUrl) {
            elements.flaskUrl.value = options.flaskUrl;
            state.flaskUrl = options.flaskUrl;
        }
    }

    /**
     * Обработчик кнопки рисования
     */
    async function handleDraw() {
        if (state.isProcessing) {
            showResult('error', 'Операция уже выполняется');
            return;
        }

        // Получаем параметры
        const params = getFormParams();

        // Валидация
        const validation = validateParams(params);
        if (!validation.valid) {
            showResult('error', validation.error);
            return;
        }

        // Начинаем операцию
        state.isProcessing = true;
        updateUI();
        hideResult();
        showProgress(0, 'Подключение к Flask серверу...');
        addLog('info', `Запуск: ${params.count} линий`);

        try {
            // Отправляем запрос на Flask сервер
            const response = await sendDrawRequest(params);
            
            if (response.status === 'ok') {
                showProgress(100, 'Готово!');
                showResult('success', response.message || 'Линии успешно созданы');
                addLog('success', `Завершено: ${params.count} линий`);
                
                // Обновляем запись в Grist (если нужно)
                updateGristRecord(params);
            } else {
                throw new Error(response.message || 'Неизвестная ошибка');
            }
        } catch (error) {
            console.error('[RandomLine] Ошибка:', error);
            showProgress(0, '');
            showResult('error', error.message);
            addLog('error', `Ошибка: ${error.message}`);
        } finally {
            state.isProcessing = false;
            updateUI();
        }
    }

    /**
     * Получение параметров из формы
     */
    function getFormParams() {
        return {
            count: parseInt(elements.lineCount.value) || CONFIG.defaultLineCount,
            seed: elements.seedValue.value ? parseInt(elements.seedValue.value) : null,
            minCoord: parseFloat(elements.minCoord.value) || CONFIG.defaultMinCoord,
            maxCoord: parseFloat(elements.maxCoord.value) || CONFIG.defaultMaxCoord,
            flaskUrl: elements.flaskUrl.value || CONFIG.defaultFlaskUrl
        };
    }

    /**
     * Валидация параметров
     */
    function validateParams(params) {
        if (params.count < 1 || params.count > CONFIG.maxLines) {
            return {
                valid: false,
                error: `Количество линий должно быть от 1 до ${CONFIG.maxLines}`
            };
        }
        if (params.minCoord >= params.maxCoord) {
            return {
                valid: false,
                error: 'Минимальная координата должна быть меньше максимальной'
            };
        }
        if (!params.flaskUrl) {
            return {
                valid: false,
                error: 'Не указан URL Flask сервера'
            };
        }
        return { valid: true };
    }

    /**
     * Отправка запроса на Flask сервер
     */
    async function sendDrawRequest(params) {
        const url = `${params.flaskUrl}/api/zcad/draw-random-lines`;
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), CONFIG.requestTimeout);

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    count: params.count,
                    seed: params.seed,
                    min_coord: params.minCoord,
                    max_coord: params.maxCoord
                }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error('Превышено время ожидания ответа от сервера');
            }
            throw new Error(`Ошибка соединения: ${error.message}`);
        }
    }

    /**
     * Обработчик кнопки проверки соединения (Ping)
     */
    async function handlePing() {
        const flaskUrl = elements.flaskUrl.value || CONFIG.defaultFlaskUrl;
        
        setConnectionStatus('checking', 'Проверка...');
        addLog('info', 'Проверка соединения с ZCAD');

        try {
            const response = await fetch(`${flaskUrl}/api/zcad/ping`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            
            if (data.status === 'ok') {
                setConnectionStatus('connected', 'ZCAD: подключено');
                addLog('success', 'ZCAD доступен');
            } else {
                throw new Error(data.message || 'ZCAD не ответил');
            }
        } catch (error) {
            setConnectionStatus('disconnected', 'ZCAD: не доступен');
            addLog('error', `Ошибка ping: ${error.message}`);
        }
    }

    /**
     * Обновление статуса соединения
     */
    function setConnectionStatus(status, text) {
        const statusEl = elements.connectionStatus;
        statusEl.textContent = text;
        
        statusEl.className = 'badge';
        if (status === 'connected') {
            statusEl.classList.add('bg-success');
        } else if (status === 'disconnected') {
            statusEl.classList.add('bg-danger');
        } else {
            statusEl.classList.add('bg-warning', 'connection-checking');
        }
    }

    /**
     * Отображение прогресса
     */
    function showProgress(percent, text) {
        elements.progressContainer.classList.remove('d-none');
        elements.progressBar.style.width = percent + '%';
        elements.progressBar.setAttribute('aria-valuenow', percent);
        elements.progressText.textContent = text;
    }

    /**
     * Отображение результата
     */
    function showResult(type, message) {
        elements.resultContainer.classList.remove('d-none');
        elements.resultAlert.className = `alert alert-${type === 'error' ? 'danger' : type}`;
        elements.resultAlert.textContent = message;
    }

    /**
     * Скрыть результат
     */
    function hideResult() {
        elements.resultContainer.classList.add('d-none');
    }

    /**
     * Добавление записи в лог
     */
    function addLog(type, message) {
        const timestamp = new Date().toLocaleTimeString('ru-RU');
        const entry = { timestamp, type, message };
        
        state.logEntries.unshift(entry);
        
        // Храним только последние 50 записей
        if (state.logEntries.length > 50) {
            state.logEntries.pop();
        }

        renderLog();
    }

    /**
     * Отрисовка лога
     */
    function renderLog() {
        if (state.logEntries.length === 0) {
            elements.logContainer.innerHTML = '<p class="text-muted small">Нет записей в журнале</p>';
            return;
        }

        elements.logContainer.innerHTML = state.logEntries.map(entry => `
            <div class="log-entry ${entry.type}">
                <span class="timestamp">[${entry.timestamp}]</span>
                <span class="message">${escapeHtml(entry.message)}</span>
            </div>
        `).join('');
    }

    /**
     * Обновление UI
     */
    function updateUI() {
        elements.drawBtn.disabled = state.isProcessing;
        elements.pingBtn.disabled = state.isProcessing;
        elements.lineCount.disabled = state.isProcessing;
        elements.seedValue.disabled = state.isProcessing;
        elements.minCoord.disabled = state.isProcessing;
        elements.maxCoord.disabled = state.isProcessing;
        elements.flaskUrl.disabled = state.isProcessing;

        if (state.isProcessing) {
            elements.drawBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Выполнение...';
        } else {
            const count = parseInt(elements.lineCount.value) || CONFIG.defaultLineCount;
            elements.drawBtn.innerHTML = `🚀 Нарисовать <span id="btn-line-count">${formatNumber(count)}</span> случайных линий`;
        }
    }

    /**
     * Сохранение настроек в localStorage
     */
    function saveSettings() {
        localStorage.setItem('randomline_flaskUrl', elements.flaskUrl.value);
        
        // Сохраняем в Grist options если доступно
        if (typeof window.grist !== 'undefined' && window.grist.setOption) {
            window.grist.setOption('flaskUrl', elements.flaskUrl.value);
        }
    }

    /**
     * Загрузка настроек из localStorage
     */
    function loadSettings() {
        const savedUrl = localStorage.getItem('randomline_flaskUrl');
        if (savedUrl) {
            elements.flaskUrl.value = savedUrl;
            state.flaskUrl = savedUrl;
        }
    }

    /**
     * Обновление записи в Grist
     */
    function updateGristRecord(params) {
        if (typeof window.grist === 'undefined' || !window.grist.docApi) {
            return;
        }

        // Можно добавить поля для логирования в таблицу Grist
        // Например: LastDrawTime, LastDrawCount, LastDrawStatus
        console.log('[RandomLine] Обновление записи Grist:', params);
    }

    /**
     * Форматирование числа (разделение тысяч)
     */
    function formatNumber(num) {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    }

    /**
     * Экранирование HTML
     */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Запуск после загрузки DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
