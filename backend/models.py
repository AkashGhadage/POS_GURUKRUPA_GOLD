from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List
from datetime import datetime

# 1. The Header: Renamed to keep 'TransactionID' as the main ID
class GoldTestingHeader(SQLModel, table=True):
    __tablename__ = "GoldTestingHeaders"
    
    # Keeping your original primary key name
    TransactionID: Optional[int] = Field(default=None, primary_key=True)
    CustomerName: str
    CustomerMobile: str
    TransactionDate: Optional[str] = Field(default_factory=lambda: datetime.now().isoformat())
    TestingMethod: Optional[str] = Field(default="XRF")
    TestedOn: Optional[str] = Field(default=None)
    Remark: Optional[str] = Field(default="")
    
    # Relationship to link the items
    items: List["GoldTestingItem"] = Relationship(back_populates="header")

# 2. The Items: These hold the specific gold values
class GoldTestingItem(SQLModel, table=True):
    __tablename__ = "GoldTestingItems"
    
    ItemID: Optional[int] = Field(default=None, primary_key=True)
    
    # Original field names kept exactly as you had them
    SampleWeight: float
    SampleType: str
    TouchValue: float
    
    # The Link: Points back to the Header's TransactionID
    TransactionID: int = Field(foreign_key="GoldTestingHeaders.TransactionID")
    
    # Link back to parent
    header: GoldTestingHeader = Relationship(back_populates="items")