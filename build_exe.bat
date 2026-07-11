@echo off
setlocal
cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" (
  python -m venv .venv
)

".venv\Scripts\python.exe" -m pip install --upgrade pip
".venv\Scripts\python.exe" -m pip install -r requirements.txt pyinstaller
".venv\Scripts\python.exe" -m PyInstaller --onefile --name "LoopTap" --add-data "templates;templates" --add-data "static;static" app.py

echo.
echo 已生成 dist\LoopTap.exe
pause

endlocal
