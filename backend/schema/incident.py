from typing import Optional
from pydantic import BaseModel, Field


class AnalyzeRequest(BaseModel):
    incidentType: str
    location: str
    source: str = "CCTV"
    description: str = ""


class CreateIncidentRequest(BaseModel):
    incidentType: Optional[str] = None
    videoName: Optional[str] = None
    location: Optional[str] = None
    source: str = "CCTV"
    description: str = ""
    flag: str = "green"
    severity: Optional[str] = None
    explanation: str = ""
    flagReason: str = ""
    actions: list[str] = Field(default_factory=list)
    aiDetails: Optional[dict] = None
    snapshot_base64: Optional[str] = None


class UpdateIncidentRequest(BaseModel):
    status: Optional[str] = None
    assignedTo: Optional[str] = None
