# Repository tree for guruKrupa_touch_center_web

This file is an auto-generated snapshot of the repository layout (as of Oct 13, 2025).

```
guruKrupa_touch_center_web/
├─ .github/                       # GitHub config, CI, agent guidance
├─ backend/                        # FastAPI backend (SQLite + SQLModel)
│  ├─ .venv/                       # local Python virtualenv (do not commit)
│  ├─ main.py                      # FastAPI app (POST /entries, GET /entries)
│  ├─ models.py                    # SQLModel data models (Entry, EntryCreate)
│  └─ requirements.txt             # Python dependencies for backend
├─ frontend/                       # Create React App frontend
│  ├─ .git/                        # git metadata
│  ├─ package.json                 # frontend npm scripts and deps
│  ├─ package-lock.json
│  ├─ node_modules/                # installed packages (local)
│  ├─ public/                      # CRA public static files
│  │  ├─ index.html
│  │  ├─ favicon.ico
│  │  ├─ logo192.png
│  │  ├─ logo512.png
│  │  ├─ manifest.json
│  │  └─ robots.txt
│  ├─ README.md
│  └─ src/                         # application source
│     ├─ App.js                    # main layout and theming
│     ├─ App.css
│     ├─ index.js                  # app entry point
│     ├─ logo.svg
│     ├─ reportWebVitals.js
│     ├─ setupTests.js
│     └─ components/
│        ├─ EntryForm.js           # form to create entries (posts to backend)
│        ├─ EntryTable.js          # transaction table (UI)
│        └─ GoldLogo.js            # logo component
└─ .github/copilot-instructions.md  # guidance for AI coding agents

```

Notes:
- `backend/.venv/` should be excluded from source control (add to .gitignore if not already).
- Start frontend: `cd frontend && npm install && npm start`
- Start backend: activate backend venv, `pip install -r requirements.txt`, then `uvicorn main:app --reload --port 8000`
