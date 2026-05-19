from typing import Optional
from pydantic import BaseModel


class UpdateOfficerRequest(BaseModel):
    status: Optional[str] = None
    location: Optional[str] = None
    task: Optional[str] = None
    online: Optional[bool] = None
