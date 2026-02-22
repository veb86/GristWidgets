@echo off
REM ========================================
REM   Random Line Widget - Quick Launch
REM   Uses Portable Python from root
REM ========================================

setlocal

REM Get project root (one level up)
set ROOT_DIR=%~dp0..
set PYTHON_DIR=%ROOT_DIR%\python
set PYTHON_EXE=%PYTHON_DIR%\python.exe
set SCRIPTS_DIR=%PYTHON_DIR%\Scripts

REM Check Python exists
if not exist "%PYTHON_EXE%" (
    echo [ERROR] Portable Python not found!
    echo Path: %PYTHON_EXE%
    echo.
    echo Run start.bat from root folder first.
    pause
    exit /b 1
)

REM Add Python to PATH
set PATH=%PYTHON_DIR%;%SCRIPTS_DIR%;%PATH%

echo ========================================
echo   Random Line Widget - Launch
echo ========================================
echo.
echo   Portable Python: %PYTHON_EXE%
echo.

REM Check dependencies
echo [1/3] Checking dependencies...
"%PYTHON_EXE%" -c "import flask" >nul 2>&1
if errorlevel 1 (
    echo [INFO] Installing Flask...
    "%PYTHON_EXE%" -m pip install -r "%~dp0requirements.txt"
) else (
    echo [OK] Dependencies installed
)

REM Check ZCAD
echo.
echo [2/3] Checking ZCAD connection...
"%PYTHON_EXE%" -c "from zcad_tcp_client import test_connection; exit(0 if test_connection() else 1)" >nul 2>&1
if errorlevel 1 (
    echo [WARNING] ZCAD not available on port 7777
    echo          Widget will work but commands won't execute
) else (
    echo [OK] ZCAD connected
)

REM Launch in two windows
echo.
echo [3/3] Starting servers...
echo.

REM Launch Flask server
start "Flask API Server" cmd /k "cd /d %~dp0 && echo Starting Flask server... && %PYTHON_EXE% flask_server.py"

REM Short delay
timeout /t 2 /nobreak >nul

REM Launch widget HTTP server (all widgets)
start "Widget HTTP Server" cmd /k "cd /d %~dp0.. && cd widget && echo Starting widget HTTP server... && %PYTHON_EXE% -m http.server 8080"

echo.
echo ========================================
echo   Servers launched!
echo ========================================
echo   Flask API:   http://127.0.0.1:5000
echo   Widgets:     http://localhost:8080/
echo.
echo   Widget URLs:
echo   - Random Line:     http://localhost:8080/randomline/
echo   - ElectricalCalc:  http://localhost:8080/electricalCalc/
echo   - OneLineSchema:   http://localhost:8080/onelineschema/
echo.
echo   To stop: close console windows
echo ========================================
echo.

pause
endlocal
exit /b 0
