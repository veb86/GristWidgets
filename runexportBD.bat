@echo off
setlocal

REM ==========================
REM Настройки
REM ==========================

set DB_FILE=c:\zcad\GristWidgets\BDNEW_ZCAD.grist

set TABLES=Categories CategoryParameters DeviceParameters Devices Parameters

REM ==========================
REM Пути
REM ==========================

set SCRIPT_DIR=%~dp0
set PYTHON_EXE=%SCRIPT_DIR%python\python.exe
set SCRIPT_FILE=%SCRIPT_DIR%export_bd.py

REM ==========================
REM Проверки
REM ==========================

if not exist "%PYTHON_EXE%" (
    echo [ERROR] Portable Python not found:
    echo %PYTHON_EXE%
    pause
    exit /b 1
)

if not exist "%DB_FILE%" (
    echo [ERROR] Database not found:
    echo %DB_FILE%
    pause
    exit /b 1
)

echo.
echo Database: %DB_FILE%
echo Tables: %TABLES%
echo.

"%PYTHON_EXE%" "%SCRIPT_FILE%" "%DB_FILE%" %TABLES%

echo.
echo Finished.
pause