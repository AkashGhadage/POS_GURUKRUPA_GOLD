@echo off

:: 1. Activate the Virtual Environment from the parent folder
cd /d "C:\Users\HP\POS_GURUKRUPA_GOLD"
call venv\Scripts\activate.bat

:: 2. Start the FastAPI Backend
cd /d "C:\Users\HP\POS_GURUKRUPA_GOLD\backend"
start /b "" uvicorn main:app --reload

:: 3. Start the React Frontend
cd /d "C:\Users\HP\POS_GURUKRUPA_GOLD\frontend"
start /b "" npm start

exit