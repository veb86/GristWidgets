# -*- coding: utf-8 -*-
"""
Схема архитектуры Random Line Widget
ASCII диаграмма взаимодействия компонентов
"""

import sys
import io

# Устанавливаем UTF-8 для вывода в Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

schema = """
================================================================================
                    ARHITEKTURA RANDOM LINE WIDGET
================================================================================

  +-------------------------------------------------------------------------+
  |                         GRIST (Browser)                                 |
  |  +-------------------------------------------------------------------+  |
  |  |                    Random Line Widget                             |  |
  |  |                                                                   |  |
  |  |  +-------------+  +---------------+  +-------------------------+  |  |
  |  |  | index.html  |  |  js/app.js    |  |   css/styles.css        |  |  |
  |  |  |  (UI)       |  |  (Logic)      |  |   (Styles)              |  |  |
  |  |  +------+------+  +-------+-------+  +-------------------------+  |  |
  |  |         |                |                                       |  |
  |  |         +--------+-------+                                       |  |
  |  |                  |                                               |  |
  |  +------------------|-----------------------------------------------+  |
  +---------------------|--------------------------------------------------+
                        |
                        | HTTP POST
                        | Content-Type: application/json
                        |
                        v
  +-------------------------------------------------------------------------+
  |                      Flask API Server (Port 5000)                       |
  |  +-------------------------------------------------------------------+  |
  |  |                      flask_server.py                              |  |
  |  |                                                                   |  |
  |  |  +------------------------------------------------------------+   |  |
  |  |  |  Endpoints:                                                |   |  |
  |  |  |  * POST /api/zcad/draw-random-lines                        |   |  |
  |  |  |  * POST /api/zcad/ping                                     |   |  |
  |  |  |  * POST /api/zcad/line                                     |   |  |
  |  |  |  * GET  /api/health                                        |   |  |
  |  |  +------------------------------------------------------------+   |  |
  |  |                                                                   |  |
  |  |  +------------------------------------------------------------+   |  |
  |  |  |  zcad_tcp_client.py                                        |   |  |
  |  |  |  * ZCADTCPClient class                                     |   |  |
  |  |  |  * Batch mode support                                      |   |  |
  |  |  |  * Connection pooling                                      |   |  |
  |  |  +------------------------------------------------------------+   |  |
  |  +-------------------------------------------------------------------+  |
  +-------------------------------------------------------------------------+
                        |
                        | TCP Socket
                        | JSON over TCP (Port 7777)
                        |
                        v
  +-------------------------------------------------------------------------+
  |                         ZCAD TCP Server                                 |
  |  +-------------------------------------------------------------------+  |
  |  |  Commands:                                                        |  |
  |  |  * PING          - Proverka dostupnosti                           |  |
  |  |  * BEGIN_BATCH   - Nachalo paketnogo rezhima                      |  |
  |  |  * LINE          - Sozdanie linii (x1,y1,x2,y2)                   |  |
  |  |  * END_BATCH     - Fiksatsiya izmeneniy                           |  |
  |  |  * CIRCLE        - Sozdanie okruzhnosti                           |  |
  |  |  * TEXT          - Dobavlenie teksta                              |  |
  |  |  * SAVE          - Sohranenie chertezha                           |  |
  |  +-------------------------------------------------------------------+  |
  +-------------------------------------------------------------------------+


================================================================================
                         POSLEDOVATELNOST OPERATSII
================================================================================

  Polzovatel          GRIST Widget         Flask Server         ZCAD
     |                       |                     |                 |
     |--[Klik knopki]------->|                     |                 |
     |                       |                     |                 |
     |                       |--[POST /api/zcad/-->|                 |
     |                       |   draw-random-lines]|                 |
     |                       |   {count: 1000}     |                 |
     |                       |                     |                 |
     |                       |                     |--[TCP Connect]->|
     |                       |                     |                 |
     |                       |                     |--[BEGIN_BATCH]->|
     |                       |                     |                 |
     |                       |                     |--[LINE]-------->|
     |                       |                     |--[LINE]-------->|  x1000
     |                       |                     |--[LINE]-------->|
     |                       |                     |                 |
     |                       |                     |--[END_BATCH]--->|
     |                       |                     |                 |
     |                       |                     |<--[OK]----------|
     |                       |<--[JSON Response]---|                 |
     |                       |   {status: ok}      |                 |
     |<--[Rezultat]----------|                     |                 |
     |                       |                     |                 |


================================================================================
                            STRUKTURA FAYLOV
================================================================================

  randomline/
  ├── index.html              # HTML vidzheta
  ├── widget.json             # Konfiguratsiya GRIST
  ├── grist-plugin-api.js     # GRIST API
  ├── README.md               # Dokumentatsiya
  ├── requirements.txt        # Python zavisimosti
  ├── start.bat               # Skript zapuska (Windows)
  |
  ├── css/
  │   └── styles.css          # Stili vidzheta
  |
  ├── js/
  │   └── app.js              # Logika vidzheta (Frontend)
  |
  ├── flask_server.py         # Flask API server (Backend)
  ├── zcad_tcp_client.py      # TCP klient dlya ZCAD
  ├── test_zcad_client.py     # Unit-testy
  |
  └── logs/                   # Logi (sozdayetsya avtomaticheski)
      └── flask_app.log


================================================================================
                         TABLITSA KOMPONENTOV
================================================================================

  Komponent              | Port  | Protokol | Naznachenie
  -----------------------+-------+----------+-----------------------------
  GRIST Widget           | -     | HTTP     | Polzovatelskiy interfeys
  Flask API Server       | 5000  | HTTP     | Proksi mezhdu GRIST i ZCAD
  ZCAD TCP Server        | 7777  | TCP      | Priyom komand ot Flask


================================================================================
                          FORMATY DANNYH
================================================================================

  HTTP Request (GRIST -> Flask):
  +--------------------------------------------------------------------------+
  | POST /api/zcad/draw-random-lines                                        |
  | Content-Type: application/json                                          |
  |                                                                         |
  | {                                                                       |
  |   "count": 1000,          // Kolichestvo liniy                          |
  |   "seed": 42,             // Seed dlya random (optsionalno)             |
  |   "min_coord": -100,      // Minimalnaya koordinata                     |
  |   "max_coord": 100        // Maksimálnaya koordinata                    |
  | }                                                                       |
  +--------------------------------------------------------------------------+

  TCP Command (Flask -> ZCAD):
  +--------------------------------------------------------------------------+
  | {"id": "cmd-0001", "cmd": "BEGIN_BATCH", "args": []}                    |
  | {"id": "cmd-0002", "cmd": "LINE", "args": [10.5, 20.3, -50.2, 80.1]}    |
  | {"id": "cmd-0003", "cmd": "LINE", "args": [...]}                        |
  | ...                                                                      |
  | {"id": "cmd-1002", "cmd": "END_BATCH", "args": []}                      |
  +--------------------------------------------------------------------------+

"""

print(schema)
