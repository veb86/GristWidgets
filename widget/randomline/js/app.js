/**
 * Random Line Widget для Grist
 * Отправляет команды на Flask сервер для генерации случайных линий в ZCAD
 */

(function() {
    'use strict';

    // Конфигурация
const CONFIG = {
    defaultFlaskUrl: window.location.origin,
    defaultLineCount: 1000,
    defaultMinCoord: -100,
    defaultMaxCoord: 100,
    maxLines: 10000,
    requestTimeout: 30000
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
console.log('[RandomLine] location.href =', window.location.href);
console.log('[RandomLine] location.origin =', window.location.origin);
console.log('[RandomLine] flaskUrl =', state.flaskUrl);

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
/**
 * Обработчик кнопки рисования
 */
async function handleDraw() {

    if (state.isProcessing) {
        showResult('error', 'Операция уже выполняется');
        return;
    }


    // Получаем параметры формы
    const params = getFormParams();


    // Проверяем параметры
    const validation = validateParams(params);

    if (!validation.valid) {
        showResult('error', validation.error);
        return;
    }


    // Начинаем выполнение
    state.isProcessing = true;

    updateUI();
    hideResult();

    showProgress(
        5,
        `Генерация ${formatNumber(params.count)} линий...`
    );

    addLog(
        'info',
        `Запуск: ${params.count} линий`
    );


    try {

        // ---------------------------------------------------------------
        // Отправляем команду непосредственно в ZCAD HTTP /ipc
        // ---------------------------------------------------------------

        showProgress(
            20,
            `Отправка ${formatNumber(params.count)} линий в ZCAD...`
        );


        const response =
            await sendDrawRequest(params);


        console.log(
            '[RandomLine] Полный ответ IPC:',
            response
        );

        console.log(
            '[RandomLine] Полный JSON:',
            JSON.stringify(response, null, 2)
        );


        // ---------------------------------------------------------------
        // Проверяем ответ ZCAD
        //
        // Успешный ответ:
        //
        // {
        //   "id": "...",
        //   "status": "ok",
        //   "result": "Created 10 lines"
        // }
        //
        // Ошибка:
        //
        // {
        //   "id": "...",
        //   "status": "error",
        //   "error": "..."
        // }
        // ---------------------------------------------------------------

        if (!response || typeof response !== 'object') {

            throw new Error(
                'ZCAD вернул некорректный ответ'
            );

        }


        if (response.status !== 'ok') {

            const errorMessage =
                response.error ||
                response.message ||
                'Неизвестная ошибка ZCAD';

            console.error(
                '[RandomLine] IPC вернул ошибку:',
                response
            );

            throw new Error(errorMessage);
        }


        // ---------------------------------------------------------------
        // УСПЕШНО
        // ---------------------------------------------------------------

        showProgress(
            100,
            'Готово!'
        );


        const successMessage =
            response.result ||
            response.message ||
            `Создано ${params.count} линий`;


        showResult(
            'success',
            successMessage
        );


        addLog(
            'success',
            successMessage
        );


        console.log(
            '[RandomLine] Операция успешно завершена:',
            successMessage
        );


        // При необходимости обновляем запись Grist
        updateGristRecord(params);


    } catch (error) {

        console.error(
            '[RandomLine] Ошибка:',
            error
        );


        const errorMessage =
            error && error.message
                ? error.message
                : 'Неизвестная ошибка';


        showProgress(
            0,
            ''
        );


        showResult(
            'error',
            errorMessage
        );


        addLog(
            'error',
            `Ошибка: ${errorMessage}`
        );


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
        seed: elements.seedValue.value
            ? parseInt(elements.seedValue.value)
            : null,
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
 * Генератор случайных линий
 *
 * Возвращает:
 *
 * [
 *   [x1, y1, x2, y2],
 *   [x1, y1, x2, y2],
 *   ...
 * ]
 */
function generateRandomLines(count, minCoord, maxCoord, seed) {

    const lines = [];

    /*
     * Если seed задан — используем простой
     * детерминированный генератор.
     *
     * Это позволяет получить одинаковые линии
     * при одинаковом seed.
     */

    let random;

    if (seed !== null && !isNaN(seed)) {

        let s = seed >>> 0;

        random = function() {

            s += 0x6D2B79F5;

            let t = s;

            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(
                t ^ (t >>> 7),
                t | 61
            );

            return (
                ((t ^ (t >>> 14)) >>> 0) /
                4294967296
            );
        };

    } else {

        random = Math.random;

    }


    function randomCoord() {

        return minCoord +
            random() * (maxCoord - minCoord);

    }


    for (let i = 0; i < count; i++) {

        lines.push([
            randomCoord(),
            randomCoord(),
            randomCoord(),
            randomCoord()
        ]);

    }

    return lines;
}
    /**
 * Отправка запроса на HTTP сервер ZCAD
 */
async function sendDrawRequest(params) {

    const url = `${params.flaskUrl}/ipc`;

    const controller = new AbortController();

    const timeoutId = setTimeout(
        () => controller.abort(),
        CONFIG.requestTimeout
    );

    try {

        /*
         * Генерируем линии непосредственно в Widget.
         */
        const lines = generateRandomLines(
            params.count,
            params.minCoord,
            params.maxCoord,
            params.seed
        );


        /*
         * Уникальный ID команды.
         */
        const commandId =
            'randomline-' +
            Date.now() +
            '-' +
            Math.random()
                .toString(36)
                .substring(2, 8);


        /*
         * Формат точно соответствует
         * uzvhttpipc.pas / uzvipcintegration.pas:
         *
         * {
         *   id: "...",
         *   cmd: "BATCH_LINES",
         *   args: [
         *     [
         *       [x1,y1,x2,y2],
         *       ...
         *     ]
         *   ]
         * }
         */
        const requestBody = {

            id: commandId,

            cmd: 'BATCH_LINES',

            args: [
                lines
            ]

        };


        console.log(
            '[RandomLine] POST:',
            url
        );

        console.log(
            '[RandomLine] Command ID:',
            commandId
        );

        console.log(
            '[RandomLine] Lines:',
            lines.length
        );


        const response = await fetch(url, {

            method: 'POST',

            headers: {
                'Content-Type': 'application/json'
            },

            body: JSON.stringify(requestBody),

            signal: controller.signal

        });


        clearTimeout(timeoutId);


        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}: ${response.statusText}`
            );

        }


        const result =
            await response.json();


        console.log(
            '[RandomLine] Получен ответ:',
            result
        );


        return result;

    } catch (error) {

        clearTimeout(timeoutId);


        if (error.name === 'AbortError') {

            throw new Error(
                'Превышено время ожидания ответа от ZCAD'
            );

        }


        throw new Error(
            `Ошибка соединения: ${error.message}`
        );

    }

}

    /**
 * Обработчик кнопки проверки соединения (Ping)
 */
async function handlePing() {
    const flaskUrl =
        elements.flaskUrl.value ||
        CONFIG.defaultFlaskUrl;

    const baseUrl =
        flaskUrl.replace(/\/+$/, '');

    const url =
        `${baseUrl}/ipc`;


    setConnectionStatus(
        'checking',
        'Проверка...'
    );

    addLog(
        'info',
        `Проверка соединения с ZCAD: ${url}`
    );


    try {

        console.log(
            '[RandomLine] Ping:',
            url
        );

console.log('[RandomLine] FETCH FROM:', window.location.origin);
console.log('[RandomLine] FETCH TO:', url);

        const response = await fetch(url, {
            method: 'GET',
            cache: 'no-cache'
        });


        if (!response.ok) {
            throw new Error(
                `HTTP ${response.status}: ${response.statusText}`
            );
        }


        const data =
            await response.json();


        console.log(
            '[RandomLine] Ping response:',
            data
        );


        if (data.status === 'ok') {

            setConnectionStatus(
                'connected',
                'ZCAD: подключено'
            );

            addLog(
                'success',
                'ZCAD HTTP сервер доступен'
            );

        } else {

            throw new Error(
                data.message ||
                'ZCAD не ответил'
            );

        }


    } catch (error) {

        console.error(
            '[RandomLine] Ошибка ping:',
            error
        );


        setConnectionStatus(
            'disconnected',
            'ZCAD: не доступен'
        );

        addLog(
            'error',
            `Ошибка ping: ${error.message}`
        );

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
