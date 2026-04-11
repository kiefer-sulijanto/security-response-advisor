from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class Incident:
    name: str
    location: str
    timestamp: datetime
    triggering_events: list = field(default_factory=list)
    risk_score: int = 0
    description: str = ""
    status: str = "NEW"

    def to_dict(self) -> dict:
        try:
            serialized_events = [
                event.to_dict() if hasattr(event, "to_dict") else str(event)
                for event in self.triggering_events
            ]
        except (AttributeError, TypeError):
            serialized_events = []

        return {
            "name": self.name,
            "location": self.location,
            "timestamp": self.timestamp.isoformat() if hasattr(self.timestamp, "isoformat") else str(self.timestamp),
            "triggering_events": serialized_events,
            "risk_score": self.risk_score,
            "description": self.description,
            "status": self.status,
        }