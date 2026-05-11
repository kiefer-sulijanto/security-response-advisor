from typing import Optional
from pydantic import BaseModel


class CreateDispatchRequest(BaseModel):
    incidentId: str
    officerId: str
    instruction: str
    location: Optional[str] = None
    priority: Optional[str] = "high"


class UpdateDispatchRequest(BaseModel):
    status: str
