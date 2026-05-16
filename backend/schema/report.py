from typing import Optional
from pydantic import BaseModel


class CreateReportRequest(BaseModel):
    officerId: str
    officerName: Optional[str] = None
    officerBadge: Optional[str] = None
    type: Optional[str] = None
    incidentType: Optional[str] = None
    location: str
    description: str
    severity: Optional[str] = "low"
