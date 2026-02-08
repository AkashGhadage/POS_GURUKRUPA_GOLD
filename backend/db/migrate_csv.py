import csv
import os
from sqlmodel import SQLModel, Field, Relationship, Session, create_engine
from typing import Optional, List

# 1. SETTINGS & PATHS
BASE_DIR = r"C:\Akash\POS_GURUKRUPA_GOLD\backend\db"
TEXT_FILE_PATH = os.path.join(BASE_DIR, "gold_data.txt")
DB_PATH = os.path.join(BASE_DIR, "GK_DB.db")
DB_URL = f"sqlite:///{DB_PATH}"

# 2. MODELS
class GoldTestingHeader(SQLModel, table=True):
    __tablename__ = "GoldTestingHeaders"
    TransactionID: Optional[int] = Field(default=None, primary_key=True)
    CustomerName: str
    CustomerMobile: str
    TransactionDate: Optional[str] = Field(default=None)
    TestingMethod: Optional[str] = Field(default="XRF")
    TestedOn: Optional[str] = Field(default=None)
    Remark: Optional[str] = Field(default="")
    
    items: List["GoldTestingItem"] = Relationship(back_populates="header")

class GoldTestingItem(SQLModel, table=True):
    __tablename__ = "GoldTestingItems"
    ItemID: Optional[int] = Field(default=None, primary_key=True)
    SampleWeight: float
    SampleType: str
    TouchValue: float
    
    TransactionID: int = Field(foreign_key="GoldTestingHeaders.TransactionID")
    header: GoldTestingHeader = Relationship(back_populates="items")

# 3. EXECUTION
def run_migration():
    engine = create_engine(DB_URL)
    # Create the new tables in GK_DB.db
    SQLModel.metadata.create_all(engine)

    if not os.path.exists(TEXT_FILE_PATH):
        print(f"❌ File not found: {TEXT_FILE_PATH}")
        return

    with Session(engine) as session:
        try:
            with open(TEXT_FILE_PATH, mode='r', encoding='utf-8') as f:
                # DictReader handles the header row automatically
                reader = csv.DictReader(f)
                
                count = 0
                for row in reader:
                    # SIMPLY UPPERCASE THE NAME
                    clean_name = row['CustomerName'].strip().upper()
                    
                    # Create the Header (Parent)
                    header = GoldTestingHeader(
                        TransactionID=int(row['TransactionID']),
                        CustomerName=clean_name,
                        CustomerMobile=row.get('CustomerMobile', ''),
                        TransactionDate=row.get('TransactionDate', ''),
                        TestingMethod=row.get('TestingMethod', 'XRF'),
                        TestedOn=row.get('TestedOn', ''),
                        Remark=row.get('Remark', '')
                    )
                    
                    # Create the Item (Child)
                    item = GoldTestingItem(
                        SampleWeight=float(row.get('SampleWeight', 0)),
                        SampleType=row.get('SampleType', 'Gold'),
                        TouchValue=float(row.get('TouchValue', 0)),
                        TransactionID=int(row['TransactionID'])
                    )
                    
                    session.add(header)
                    session.add(item)
                    count += 1
                
                session.commit()
                print(f"✅ Successfully migrated {count} records to {DB_PATH}")
                print(f"Last record processed: {clean_name}")

        except Exception as e:
            print(f"❌ Error during migration: {e}")

if __name__ == "__main__":
    run_migration()