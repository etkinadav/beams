@echo off
echo Starting all servers...

REM Kill existing processes
taskkill /F /IM node.exe 2>nul

REM Start Backend Server (in new window)
start "Backend Server" cmd /k "cd /d C:\Users\User\Desktop\programming\beams\beams && npm run start:server"

REM Wait 5 seconds
timeout 5

REM Start Angular (in new window)  
start "Angular Server" cmd /k "cd /d C:\Users\User\Desktop\programming\beams\beams && ng serve --port 4200"

REM Wait 10 seconds
timeout 10

REM Open browser
start http://localhost:4200

echo All servers started!
echo Backend: https://localhost:3000
echo Angular: http://localhost:4200
pause
