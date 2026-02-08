from fastapi import FastAPI, Request, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import SQLModel, Session, create_engine, select
from typing import Optional, List
from utils.print_receipt import do_print_receipt
from models import GoldTestingHeader, GoldTestingItem # Ensure these match your models.py
from datetime import datetime
from pathlib import Path

# --- Database Setup ---
BASE_DIR = Path(__file__).parent
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

# ---- Request Models (Schemas) ----
class ItemCreate(SQLModel):
    SampleWeight: float
    SampleType: str
    TouchValue: float
    KaratValue: float
    Remark: Optional[str] = ""

class TransactionCreate(SQLModel):
    CustomerName: str
    CustomerMobile: str
    TestingMethod: str
    Items: List[ItemCreate]  # Expects an array of items from React

# ---- CREATE (Multi-Item) ----
@app.post("/entries")
def create_entry(data: TransactionCreate = Body(...)):
    with Session(engine) as session:
        try:
            # 1. Save Header
            header = GoldTestingHeader(
                CustomerName=data.CustomerName,
                CustomerMobile=data.CustomerMobile,
                TestingMethod=data.TestingMethod,
                TransactionDate=datetime.now().isoformat()
            )
            session.add(header)
            session.commit()
            session.refresh(header)

            # 2. Save all items linked to this header
            for item_data in data.Items:
                new_item = GoldTestingItem(
                    **item_data.dict(),
                    TransactionID=header.TransactionID
                )
                session.add(new_item)
            
            session.commit()
            session.refresh(header) # Refresh to include items in the response

            return header
        except Exception as e:
            session.rollback()
            raise HTTPException(status_code=500, detail=str(e))
# ---- READ ALL (Visits) - NESTED VERSION ----
@app.get("/entries")
def get_entries():
    with Session(engine) as session:
        # Get all headers first (sorted by newest)
        headers = session.exec(select(GoldTestingHeader).order_by(GoldTestingHeader.TransactionID.desc())).all()
        
        output = []
        for header in headers:
            # Get all items belonging to this specific header
            items = session.exec(select(GoldTestingItem).where(GoldTestingItem.TransactionID == header.TransactionID)).all()
            
            # Convert header to dict and nest the items inside it
            header_data = header.dict()
            header_data["items"] = [item.dict() for item in items]
            
            output.append(header_data)
            
        return output
# ---- READ SINGLE (Full Visit Details) ----
@app.get("/entries/{txn_id}")
def get_entry(txn_id: int):
    with Session(engine) as session:
        header = session.get(GoldTestingHeader, txn_id)
        if not header:
            raise HTTPException(status_code=404, detail="Transaction not found")
        return header

# ---- DELETE ----
@app.delete("/entries/{txn_id}")
def delete_entry(txn_id: int):
    with Session(engine) as session:
        header = session.get(GoldTestingHeader, txn_id)
        if not header:
            raise HTTPException(status_code=404, detail="Transaction not found")
        session.delete(header) # SQLModel handles cascading if configured, or delete items manually
        session.commit()
        return {"detail": "Deleted", "TransactionID": txn_id}

# ---- PRINT RECEIPT ----
@app.post("/print-receipt")
async def print_receipt(request: Request):
    data = await request.json()
    copies = int(data.get("Copies", 1))
    entry = data.get("Entry", {}) 
    # 'entry' here will now contain the Header and the 'items' list
    print("Printing multi-item receipt...")
    result = do_print_receipt(entry, copies)
    return result

@app.get("/customers/search")
def search_customers(q: str):
    with Session(engine) as session:
        # We select distinct pairs of Name and Mobile
        statement = select(GoldTestingHeader.CustomerName, GoldTestingHeader.CustomerMobile)\
            .where(
                (GoldTestingHeader.CustomerName.contains(q)) | 
                (GoldTestingHeader.CustomerMobile.contains(q))
            ).distinct().limit(10)
        
        results = session.exec(statement).all()
        
        # Format for the Autocomplete component
        return [{"CustomerName": r[0], "CustomerMobile": r[1]} for r in results]