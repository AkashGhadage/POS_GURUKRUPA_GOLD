# Gold POS Frontend (React)

_This directory contains the React app for the gold POS system. It connects to your FastAPI backend and provides all customer and transaction UI._

---

## 🚀 Quick Start for Developers

### Frontend (React):

**1. Install Node and npm**

Make sure Node.js (v14+) and npm are on your machine [Node.js contains both] :

node -v
npm -v

If not installed, download from: [Node.js official site](https://nodejs.org/en/)

---

**2. Install frontend dependencies**

cd frontend
npm install

- Installs all React/JS packages from `package.json` into `node_modules/`
- You don’t need to touch or edit anything in `node_modules/`

---

**3. Start the React frontend**


 

npm start
- Your app runs at [http://localhost:3000](http://localhost:3000)
- Hot-reloads when you change code in `/src`
- Sends/receives data from the FastAPI backend at [http://localhost:8000](http://localhost:8000)

---

### Backend (FastAPI):

**1. Set up Python environment**

cd backend
python -m venv .venv

On Windows: .venv\Scripts\activate


**2. Install Python dependencies**

pip install -r requirements.txt
- Installs FastAPI, SQLModel, Uvicorn, and all backend libraries.

**3. Start the backend**

uvicorn main:app --reload

- This launches your backend API at [http://localhost:8000](http://localhost:8000)
- On first run, creates the local SQLite DB if not present.

Swagger UI: Available at http://127.0.0.1:8000/docs 
ReDoc: Available at http://127.0.0.1:8000/redoc,

---

## 📋 Typical Workflow

1. **Start FastAPI backend first** (ensure `GK_DB.db` is created).
2. **Start React frontend** (`npm start`).
3. Work on React components in `src/` — UI auto-refreshes.
4. API calls between React and FastAPI work automatically when both are running.

---

## 🛠️ Available Scripts

- `npm start` – Start React dev server (hot reload).
- `npm test` – Launch interactive test runner.
- `npm run build` – Build optimized static bundle (place in `/build` folder).
- `npm run eject` – (Advanced) Ejects full config — **irreversible**.

---

## 🗂️ Project Structure

check Tree.md