@echo off
setlocal
cd /d "%~dp0"
title Heroe Aleatorio - Iniciando
set "PORT=4200"
set "URL=http://localhost:%PORT%"
set NG_CLI_ANALYTICS=false

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js no esta instalado. Descargalo desde https://nodejs.org
  pause
  exit /b 1
)

rem --- If it is already running, just open the panel ---
set "RUNNING_PID="
if exist "server.pid" set /p RUNNING_PID=<"server.pid"
if defined RUNNING_PID (
  tasklist /FI "PID eq %RUNNING_PID%" 2>nul | find /I "node.exe" >nul
  if not errorlevel 1 (
    echo Heroe Aleatorio ya esta en ejecucion.
    start "" "%URL%"
    exit /b 0
  )
  del "server.pid" >nul 2>nul
)

rem --- First time: install dependencies and build the web ---
if not exist "web\node_modules" (
  echo Instalando dependencias de la web, solo la primera vez. Puede tardar unos minutos...
  call npm --prefix web install --no-audit --no-fund
  if errorlevel 1 goto :error
)
if not exist "server\node_modules" (
  echo Instalando dependencias del servidor, solo la primera vez...
  call npm --prefix server install --no-audit --no-fund
  if errorlevel 1 goto :error
)
if not exist "web\dist\web\browser\index.html" (
  echo Compilando la web, solo la primera vez...
  call npm --prefix web run build
  if errorlevel 1 goto :error
)

if not exist "logs" mkdir "logs"

rem --- Launch the server in the background, without a window ---
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$p = Start-Process -FilePath 'node' -ArgumentList '--import','tsx','src/main.ts' -WorkingDirectory (Join-Path (Get-Location) 'server') -WindowStyle Hidden -RedirectStandardOutput 'logs/server.log' -RedirectStandardError 'logs/server.err.log' -PassThru; Set-Content -Path 'server.pid' -Value $p.Id -Encoding ascii"
if errorlevel 1 goto :error

rem --- Wait until it answers ---
powershell -NoProfile -Command ^
  "for ($i = 0; $i -lt 60; $i++) { try { Invoke-WebRequest -UseBasicParsing -TimeoutSec 1 'http://127.0.0.1:%PORT%/api/health' | Out-Null; exit 0 } catch { Start-Sleep -Milliseconds 250 } }; exit 1"
if errorlevel 1 (
  echo [ERROR] El servidor no arranco. Revisa logs\server.err.log
  pause
  exit /b 1
)

start "" "%URL%"
exit /b 0

:error
echo.
echo [ERROR] Algo fallo durante el arranque. Revisa los mensajes de arriba.
pause
exit /b 1
