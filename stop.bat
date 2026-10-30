@echo off
setlocal
cd /d "%~dp0"
set "PORT=4200"
set "STOPPED="

set "SERVER_PID="
if exist "server.pid" set /p SERVER_PID=<"server.pid"
if defined SERVER_PID (
  taskkill /PID %SERVER_PID% /T /F >nul 2>nul && set "STOPPED=1"
)
del "server.pid" >nul 2>nul

rem --- In case the PID was lost: close whatever listens on the port ---
for /f "tokens=5" %%a in ('netstat -ano ^| findstr /R /C:"127.0.0.1:%PORT% .*LISTENING"') do (
  taskkill /PID %%a /T /F >nul 2>nul && set "STOPPED=1"
)

if defined STOPPED (
  echo Heroe Aleatorio detenido.
) else (
  echo Heroe Aleatorio no estaba en ejecucion.
)
rem 2 s pause so the message can be read before the window closes
ping -n 3 127.0.0.1 >nul
exit /b 0
