@echo off
cd /d "%~dp0"

rem 簡易Webサーバー起動（ポート4173）
start "" cmd /c "npx serve -p 4173 ."

rem 少し待ってからChromeでUntitled-1.htmを開く
timeout /t 2 >nul
start "" "chrome.exe" "http://localhost:4173/Untitled-1.htm"