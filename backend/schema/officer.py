from typing import Optional
from pydantic import BaseModel


class UpdateOfficerRequest(BaseModel):
    status: Optional[str] = None
    location: Optional[str] = None
    task: Optional[str] = None


class CreateReportRequest(BaseModel):
    officerId: str
    officerName: Optional[str] = None
    officerBadge: Optional[str] = None
    type: Optional[str] = None
    incidentType: Optional[str] = None
    location: str
    description: str
    severity: Optional[str] = "low"
