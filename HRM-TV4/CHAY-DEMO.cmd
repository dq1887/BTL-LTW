@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Can cai Node.js 22.12 tro len truoc khi chay.
  pause
  exit /b 1
)
if not exist node_modules (
  call npm.cmd ci --foreground-scripts
  if errorlevel 1 (
    echo Cai thu vien chua thanh cong. Hay giu lai log loi de kiem tra.
    pause
    exit /b 1
  )
)
echo Dang chay TV4. Lan dau co the can tai MongoDB, vui long giu cua so nay mo.
call npm.cmd run demo
pause
