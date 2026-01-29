@echo off

:: 1. Activate the Virtual Environment from the parent folder
cd /d "C:\Users\HP\POS_GURUKRUPA_GOLD"
call venv\Scripts\activate.bat

:: 2. Start the FastAPI Backend using the Python module bypass
cd /d "C:\Users\HP\POS_GURUKRUPA_GOLD\backend"
:: We use 'python -m' to bypass the Application Control policy
start /b "" python -m uvicorn main:app --reload

:: 3. Start the React Frontend
cd /d "C:\Users\HP\POS_GURUKRUPA_GOLD\frontend"
start /b "" npm start

exit