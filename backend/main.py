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
    SampleWeight: float  # Max 3 decimal places
    SampleType: str
    TouchValue: float    # Max 2 decimal places (0-100 range)
    Remark: Optional[str] = ""
    
    @classmethod
    def validate_decimals(cls, weight: float, touch: float):
        # Round weight to 3 decimal places
        weight = round(weight, 3)
        # Round touch to 2 decimal places and clamp to 0-100
        touch = max(0, min(100, round(touch, 2)))
        return weight, touch

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

            # 2. Save all items linked to this header (with validation)
            for item_data in data.Items:
                # Apply decimal validation
                weight = round(item_data.SampleWeight, 3)
                touch = max(0, min(100, round(item_data.TouchValue, 2)))
                
                new_item = GoldTestingItem(
                    SampleWeight=weight,
                    SampleType=item_data.SampleType,
                    TouchValue=touch,
                    Remark=item_data.Remark or "",
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

# ---- UPDATE (Multi-Item) ----
@app.put("/entries/{txn_id}")
def update_entry(txn_id: int, request: Request = None):
    import asyncio
    # Get the raw JSON body
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    
    with Session(engine) as session:
        header = session.get(GoldTestingHeader, txn_id)
        if not header:
            raise HTTPException(status_code=404, detail="Transaction not found")
        
        return header

@app.put("/entries/{txn_id}/items")
async def update_entry_items(txn_id: int, request: Request):
    """Update items for a transaction (Touch, Remark values)"""
    data = await request.json()
    items_data = data.get("items", [])
    
    with Session(engine) as session:
        header = session.get(GoldTestingHeader, txn_id)
        if not header:
            raise HTTPException(status_code=404, detail="Transaction not found")
        
        # Update each item with validation
        for item_update in items_data:
            item_id = item_update.get("ItemID")
            if item_id:
                item = session.get(GoldTestingItem, item_id)
                if item and item.TransactionID == txn_id:
                    # Validate Touch: max 2 decimals, range 0-100
                    touch_val = float(item_update.get("TouchValue", item.TouchValue))
                    touch_val = max(0, min(100, round(touch_val, 2)))
                    
                    item.TouchValue = touch_val
                    item.Remark = item_update.get("Remark", item.Remark)
                    session.add(item)
        
        # Update the header's TestedOn timestamp
        header.TestedOn = datetime.now().isoformat()
        session.add(header)
        session.commit()
        
        # Return updated header with items
        session.refresh(header)
        items = session.exec(select(GoldTestingItem).where(GoldTestingItem.TransactionID == txn_id)).all()
        result = header.dict()
        result["items"] = [item.dict() for item in items]
        return result

# ---- DELETE ----
@app.delete("/entries/{txn_id}")
def delete_entry(txn_id: int):
    with Session(engine) as session:
        header = session.get(GoldTestingHeader, txn_id)
        if not header:
            raise HTTPException(status_code=404, detail="Transaction not found")
        
        # Delete all items first (manual cascade)
        items = session.exec(select(GoldTestingItem).where(GoldTestingItem.TransactionID == txn_id)).all()
        for item in items:
            session.delete(item)
        
        # Then delete the header
        session.delete(header)
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