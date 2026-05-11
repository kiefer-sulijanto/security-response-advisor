from __future__ import annotations

from datetime import datetime


def distance_between_centers(c1: list[float] | None, c2: list[float] | None) -> float:
    if not c1 or not c2 or len(c1) != 2 or len(c2) != 2:
        return float("inf")
    dx = float(c1[0]) - float(c2[0])
    dy = float(c1[1]) - float(c2[1])
    return (dx * dx + dy * dy) ** 0.5


def parse_timestamp(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value)
    except (TypeError, ValueError):
        return None
