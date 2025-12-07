# POS_GURUKRUPA_GOLD — Project Documentation


This document provides a complete, practical guide to the repository: architecture, setup, how to run locally and with Docker, backend API contracts, frontend components, data flow, printing, and troubleshooting.


## Overview


- Purpose: Manage gold testing transactions, record touch/karat values, and optionally print a thermal receipt.
- Architecture: Monorepo with `backend` (FastAPI + SQLite via SQLModel) and `frontend` (React + MUI). Optional Docker setup to run both services.
- Default ports:
    - Backend API: `http://localhost:8000`
    - Frontend UI: `http://localhost:3000`


## Repository Structure


```
POS_GURUKRUPA_GOLD/
├── backend/
│   ├── Dockerfile
│   ├── main.py              # FastAPI app (CRUD + print endpoint)
│   ├── models.py            # SQLModel ORM definitions
│   ├── requirements.txt     # Python deps
│   ├── db/                  # SQLite DB location
│   │   └── databasess.txt   # (note file; DB is GK_DB.db created at runtime)
│   └── utils/
│       ├── print_receipt.py # ESC/POS printing (Dummy/USB/Network/Serial)
│       └── render_receipt.py# (placeholder, not currently used)
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── public/
│   │   ├── index.html
│   │   ├── manifest.json
│   │   └── robots.txt
│   └── src/
│       ├── App.js, App.css, index.js, index.css
│       ├── components/
│       │   ├── HeroTitle.js
│       │   ├── EntryTable.js
│       │   ├── EntryForm.js
│       │   └── EditDialog.js
│       └── tests (CRA defaults: App.test.js, setupTests.js)
├── docker-compose.yml       # Runs backend + frontend
├── start.bat                # compose up (detached) + opens browser
├── stop.bat                 # compose down
├── README.md                # repo readme (short)
└── documentation.md         # this detailed documentation
```


## Backend


### Tech Stack
- Python 3.10+ recommended
- FastAPI, SQLModel (on SQLAlchemy), Uvicorn
- SQLite database under `backend/db/GK_DB.db` (auto-created)
- CORS enabled for `http://localhost:3000`


### Data Model
`backend/models.py`
```python
class GoldTestingTransactions(SQLModel, table=True):
        __tablename__ = "GoldTestingTransactions"
        TransactionID: Optional[int] = Field(default=None, primary_key=True)
        CustomerName: str
        CustomerMobile: str
        SampleWeight: float
        SampleType: str
        TouchValue: float
        KaratValue: float
        TransactionDate: Optional[str] = Field(default=None)
        TestingMethod: Optional[str] = Field(default=None, sa_column_kwargs={"nullable": True})
        Remark: Optional[str] = Field(default="", sa_column_kwargs={"nullable": True})
        TestedOn: Optional[str] = Field(default=None, sa_column_kwargs={"nullable": True})
```


- `TransactionDate`: ISO string at creation
- `TestedOn`: ISO string when updated
- `TestingMethod`: either `With Print` or `Without Print`


### API Endpoints
Base URL: `http://localhost:8000`


- `POST /entries` — create transaction
    - Request body:
        ```json
        {
            "CustomerName": "string",
            "CustomerMobile": "string",        
            "SampleWeight": 12.34,              
            "SampleType": "Ring",              
            "TouchValue": 0.0,                  
            "KaratValue": 0.0,                  
            "TestingMethod": "With Print",     
            "Remark": "string"                 
        }
        ```
    - Response: JSON of the created entry with `TransactionID` and timestamps.


- `GET /entries` — list all transactions
    - Response: `[{...}, ...]`


- `GET /entries/{id}` — fetch single transaction
    - Response: `{...}` or 404


- `PUT /entries/{id}` — update fields
    - Request body: same shape as `POST /entries`
    - Side effect: sets `TestedOn` to current timestamp


- `DELETE /entries/{id}` — delete
    - Response: `{ "detail": "GoldTestingTransactions deleted", "TransactionID": id }`


- `POST /print-receipt` — thermal receipt printing
    - Request body:
        ```json
        {
            "Copies": 1,
            "Entry": {
                "TransactionID": 123,
                "CustomerName": "...",
                "CustomerMobile": "...",
                "SampleType": "...",
                "SampleWeight": 1.23,
                "TouchValue": 0,
                "KaratValue": 0,
                "TestingMethod": "With Print",
                "Remark": "...",
                "TransactionDate": "2025-12-06T12:34:56"
            }
        }
        ```
    - Response: `{ "status": "success", "msg": "..." }` or `{ "status": "error", "message": "..." }`


### Printing
`backend/utils/print_receipt.py`
- `PRINTER_TYPE` can be `"DUMMY"`, `"USB"`, `"NETWORK"`, or `"SERIAL"`.
- Default is `DUMMY`: generates ESC/POS data and writes `test_receipt_escpos.bin` for inspection; prints to console preview.
- For real hardware:
    - USB: set `idVendor`, `idProduct`
    - Network: set `host`
    - Serial: set `devfile` (e.g., `COM3`), `baudrate`, `timeout`


### Running the Backend


#### Local (PowerShell)
```
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
python .\main.py  # runs uvicorn with reload on port 8000
```
- `main.py` includes a `__main__` guard to start Uvicorn.
- Database file: `backend/db/GK_DB.db` (created at first run).


#### Docker
Handled by `backend/Dockerfile` and `docker-compose.yml`:
- `python:3.11-slim`
- Installs `requirements.txt`, copies app, runs Uvicorn with reload


## Frontend


### Tech Stack
- React 19, `react-scripts` (CRA), Material UI v7
- Axios for HTTP calls
- CRA dev scripts: `start`, `build`, `test`


### Components
- `HeroTitle.js`: Header branding/title.
- `EntryTable.js`: Displays transactions table; sorting, pagination, search, date filter; edit and print actions; calls:
    - `GET /entries` to load
    - `PUT /entries/{id}` on save
    - `POST /print-receipt` when printing
- `EntryForm.js`: Form to create new entry; validates mobile and required fields; calls `POST /entries`.
- `EditDialog.js`: Dialog to update `TouchValue`, `KaratValue`, `Remark`.


### Running the Frontend


#### Local (PowerShell)
Requires Node.js LTS installed from [https://nodejs.org/](https://nodejs.org/)
```
cd frontend
npm install
npm start
```
- Opens `http://localhost:3000`.
- Talks to backend at `http://localhost:8000` (hardcoded in fetch calls). If you change the backend port, update fetch URLs or introduce a central config.


#### Docker
`frontend/Dockerfile` uses `node:18-alpine`, installs (with `--legacy-peer-deps`), then `npm start`.


## Docker Compose
`docker-compose.yml` orchestrates both services:
- `backend`: builds from `./backend`, maps `./backend/db` to `/app/db`, exposes `8000:8000`
- `frontend`: builds from `./frontend`, exposes `3000:3000`, `CHOKIDAR_USEPOLLING=true` for dev


Convenience scripts:
```
# From repo root (PowerShell)
.\start.bat   # docker compose up -d, opens browser after 5s
.\stop.bat    # docker compose down
```


## Development Workflow
1. Start backend (local or Docker).
2. Start frontend (`npm start`).
3. Use the UI to create entries; verify table updates; try edit and print.
4. For backend changes, Uvicorn reloads automatically; React also hot-reloads.


## Testing
- Frontend: CRA default tests.
    - `cd frontend`
    - `npm test`
- Backend: No unit tests provided yet; recommended to add `pytest` for API tests.


## Troubleshooting
- `npm` not found: Install Node.js LTS; reopen PowerShell.
- `pip` DNS errors (`getaddrinfo failed`): Check internet/proxy. Optionally set index URL:
    ```
    pip install --index-url [https://pypi.org/simple](https://pypi.org/simple) -r requirements.txt
    ```
- Backend exits when running `python backend/main.py`: Ensure dependencies installed and correct Python version.
- CORS errors: Backend allows `http://localhost:3000`. If frontend runs on a different origin, update `allow_origins` in `main.py`.
- Port conflicts: Change ports in compose or commands; update frontend fetch URLs accordingly.
- Database path: Ensure `backend/db` exists (compose volume maps it). The app creates `GK_DB.db` automatically.
- Printing hardware: Switch `PRINTER_TYPE` to real device and configure args; for development, keep `DUMMY`.


## Configuration Notes
- Currently, frontend fetch URLs are hardcoded. Consider adding a central config or `.env` for API base URL if deploying in varied environments.


## Build & Deployment
- Frontend production build:
    ```
    cd frontend
    npm run build
    ```
    Output: `frontend/build/`. Serve with a static web server and point it to backend API.
- Backend can run with Uvicorn (as above) or in Docker.


## Future Enhancements
- Add backend tests and CI.
- Centralize API base URL in frontend.
- Add authentication/authorization.
- Improve error handling and validation.
- Enhance receipt template and support QR/barcodes via `python-barcode`, `qrcode` libraries already listed.


---
For quick start, see commands under Running the Backend/Frontend and Docker Compose sections.