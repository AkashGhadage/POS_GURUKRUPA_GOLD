from fastapi import FastAPI, Request, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import SQLModel, Session, create_engine, select
from typing import Optional
from utils.print_receipt_image import do_print_receipt
from models import GoldTestingTransactions
from datetime import datetime
from pathlib import Path

# Get the path to the directory of this main.py file
BASE_DIR = Path(__file__).parent

# Place your database in the backend directory
DB_PATH = BASE_DIR /"db"/ "GK_DB.db"
DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(DATABASE_URL, echo=True)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    SQLModel.metadata.create_all(engine)
    print("Database and tables created")

# ---- Request Model ----
class TransactionCreate(SQLModel):
    CustomerName: str
    CustomerMobile: str
    SampleWeight: float
    SampleType: str
    TouchValue: float
    KaratValue: float
    TestingMethod: str                    # <--- ADDED
    Remark: Optional[str] = ""

# ---- CREATE ----
@app.post("/entries")
def create_entry(entry: TransactionCreate = Body(...)):
    txn = GoldTestingTransactions(
        CustomerName=entry.CustomerName,
        CustomerMobile=entry.CustomerMobile,
        SampleWeight=entry.SampleWeight,
        SampleType=entry.SampleType,
        TouchValue=entry.TouchValue,
        KaratValue=entry.KaratValue,
        TestingMethod=entry.TestingMethod,  # <--- ADDED
        Remark=entry.Remark,
        TransactionDate=datetime.now().isoformat(),
        TestedOn=None
    )
    with Session(engine) as session:
        session.add(txn)
        session.commit()
        session.refresh(txn)
        return {
            "TransactionID": txn.TransactionID,
            "TransactionDate": txn.TransactionDate,
            "TestedOn": txn.TestedOn,
            "CustomerName": txn.CustomerName,
            "CustomerMobile": txn.CustomerMobile,
            "SampleWeight": txn.SampleWeight,
            "SampleType": txn.SampleType,
            "TouchValue": txn.TouchValue,
            "KaratValue": txn.KaratValue,
            "TestingMethod": txn.TestingMethod,  # <--- ADDED
            "Remark": txn.Remark
        }

# ---- READ ALL ----
@app.get("/entries")
def get_entries():
    with Session(engine) as session:
        txns = session.exec(select(GoldTestingTransactions)).all()
        result = []
        for t in txns:
            result.append({
                "TransactionID": t.TransactionID,
                "TransactionDate": t.TransactionDate,
                "TestedOn": t.TestedOn,
                "CustomerName": t.CustomerName,
                "CustomerMobile": t.CustomerMobile,
                "SampleWeight": t.SampleWeight,
                "SampleType": t.SampleType,
                "TouchValue": t.TouchValue,
                "KaratValue": t.KaratValue,
                "TestingMethod": t.TestingMethod,  # <--- ADDED
                "Remark": t.Remark
            })
        return result

# ---- READ SINGLE ----
@app.get("/entries/{entry_id}")
def get_entry(entry_id: int):
    with Session(engine) as session:
        txn = session.get(GoldTestingTransactions, entry_id)
        if txn is None:
            raise HTTPException(status_code=404, detail="GoldTestingTransactions not found")
        return {
            "TransactionID": txn.TransactionID,
            "TransactionDate": txn.TransactionDate,
            "TestedOn": txn.TestedOn,
            "CustomerName": txn.CustomerName,
            "CustomerMobile": txn.CustomerMobile,
            "SampleWeight": txn.SampleWeight,
            "SampleType": txn.SampleType,
            "TouchValue": txn.TouchValue,
            "KaratValue": txn.KaratValue,
            "TestingMethod": txn.TestingMethod,  # <--- ADDED
            "Remark": txn.Remark
        }

# ---- UPDATE ----
@app.put("/entries/{entry_id}")
def update_entry(entry_id: int, entry: TransactionCreate = Body(...)):
    with Session(engine) as session:
        txn = session.get(GoldTestingTransactions, entry_id)
        if txn is None:
            raise HTTPException(status_code=404, detail="GoldTestingTransactions not found")
        txn.CustomerName = entry.CustomerName
        txn.CustomerMobile = entry.CustomerMobile
        txn.SampleWeight = entry.SampleWeight
        txn.SampleType = entry.SampleType
        txn.TouchValue = entry.TouchValue
        txn.KaratValue = entry.KaratValue
        txn.TestingMethod = entry.TestingMethod  # <--- ADDED
        txn.Remark = entry.Remark
        txn.TestedOn = datetime.now().isoformat()
        session.add(txn)
        session.commit()
        session.refresh(txn)
        return {
            "TransactionID": txn.TransactionID,
            "TransactionDate": txn.TransactionDate,
            "TestedOn": txn.TestedOn,
            "CustomerName": txn.CustomerName,
            "CustomerMobile": txn.CustomerMobile,
            "SampleWeight": txn.SampleWeight,
            "SampleType": txn.SampleType,
            "TouchValue": txn.TouchValue,
            "KaratValue": txn.KaratValue,
            "TestingMethod": txn.TestingMethod,  # <--- ADDED
            "Remark": txn.Remark
        }

# ---- DELETE ----
@app.delete("/entries/{entry_id}")
def delete_entry(entry_id: int):
    with Session(engine) as session:
        txn = session.get(GoldTestingTransactions, entry_id)
        if txn is None:
            raise HTTPException(status_code=404, detail="GoldTestingTransactions not found")
        session.delete(txn)
        session.commit()
        return {"detail": "GoldTestingTransactions deleted", "TransactionID": entry_id}

# ---------- PRINT RECEIPT ----
@app.post("/print-receipt")
async def print_receipt(request: Request):
    data = await request.json()
    copies = int(data.get("Copies", 1))
    entry = data.get("Entry", {})
    print("Printing receipt with data:", entry, "Copies:", copies)
    result = do_print_receipt(entry, copies)
    return result
