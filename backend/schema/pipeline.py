from typing import Optional
from pydantic import BaseModel


class CCTVDetectionRequest(BaseModel):
    label: str
    location: str
    camera_id: Optional[str] = None
    confidence: float = 1.0
    timestamp: Optional[str] = None
    in_restricted_area: bool = False
    image_base64: Optional[str] = None


class CCTVFrameRequest(BaseModel):
    image_base64: str
    camera_id: str
    location: Optional[str] = None
    confidence_threshold: Optional[float] = None
    frame_timestamp_seconds: Optional[float] = None
    timestamp: Optional[str] = None
    include_debug: bool = False


class AccessLogRequest(BaseModel):
    action: str
    location: str
    user_id: Optional[str] = None
    door_id: Optional[str] = None
    timestamp: Optional[str] = None


class ManualEventRequest(BaseModel):
    event_type: str
    location: str
    timestamp: Optional[str] = None
    source: str = "manual_trigger"
    metadata: Optional[dict] = None
