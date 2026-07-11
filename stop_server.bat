@echo off
setlocal

for /f "tokens=5" %%a in ('netstat -ano ^| findstr /r /c:":8765 .*LISTENING"') do (
  taskkill /PID %%a /F
)

echo 本地录音服务已停止。
pause

endlocal
