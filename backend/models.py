from sqlmodel import SQLModel, Field
from typing import Optional

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
    TestingMethod: Optional[str] = Field(default=None, sa_column_kwargs={"nullable": True})  # <--- ADDED
    Remark: Optional[str] = Field(default="", sa_column_kwargs={"nullable": True})           # <--- ADDED
    TestedOn: Optional[str] = Field(default=None, sa_column_kwargs={"nullable": True})       # <--- ADDED
