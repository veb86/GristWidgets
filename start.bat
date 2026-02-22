@echo off
setlocal

set PYTHON_DIR=%~dp0python
set PYTHON_EXE=%PYTHON_DIR%\python.exe

if not exist "%PYTHON_EXE%" (
    echo [ERROR] Portable Python not found: %PYTHON_EXE%
    pause
    exit /b 1
)

echo ========================================
echo   GristWidgets - Launch Menu
echo ========================================
echo.
echo   1. All Widgets + Flask API
echo   2. Flask API only (port 5000)
echo   3. Widget HTTP only (port 3333)
echo   4. Widget HTTP (port 8080)
echo   5. Check dependencies
echo   0. Exit
echo.

set /p choice="Select (0-5): "

if "%choice%"=="1" goto :full
if "%choice%"=="2" goto :flask
if "%choice%"=="3" goto :widgets
if "%choice%"=="4" goto :widget8080
if "%choice%"=="5" goto :check
if "%choice%"=="0" goto :end

echo Invalid choice!
goto :end

:full
    echo Starting Flask + Widget HTTP...
    start "Flask API" cmd /k "cd /d %~dp0 && %PYTHON_EXE% server\flask_server.py"
    timeout /t 2 /nobreak >nul
    start "Widget HTTP" cmd /k "cd /d %~dp0widget && %PYTHON_EXE% -m http.server 8080"
    echo.
    echo Flask:   http://127.0.0.1:5000
    echo Widget:  http://localhost:8080
    echo.
    echo Widgets:
    echo   - Random Line:    http://localhost:8080/randomline/
    echo   - ElectricalCalc: http://localhost:8080/electricalCalc/
    echo   - OneLineSchema:  http://localhost:8080/onelineschema/
    echo   - All widgets:    http://localhost:8080/
    goto :end

:flask
    cd /d %~dp0
    %PYTHON_EXE% server\flask_server.py
    goto :end

:widgets
    cd /d %~dp0widget
    %PYTHON_EXE% -m http.server 3333
    goto :end

:widget8080
    cd /d %~dp0widget
    %PYTHON_EXE% -m http.server 8080
    goto :end

:check
    echo Checking Flask...
    %PYTHON_EXE% -c "import flask; print('Flask OK')"
    echo Checking flask-cors...
    %PYTHON_EXE% -c "import flask_cors; print('flask-cors OK')"
    goto :end

:end
    pause
