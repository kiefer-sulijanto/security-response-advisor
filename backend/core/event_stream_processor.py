from collections import deque
from datetime import timedelta


class EventStreamProcessor:
    def __init__(self, window_seconds=120):
        self.window = timedelta(seconds=window_seconds)
        self.event_buffer = deque()

    def add_event(self, event):
        if event is None:
            return

        if not hasattr(event, "timestamp"):
            return

        self.event_buffer.append(event)

        try:
            self._remove_old_events()
        except (AttributeError, TypeError, ValueError):
            pass

    def get_events(self):
        try:
            return sorted(
                self.event_buffer,
                key=lambda e: e.timestamp
            )
        except (AttributeError, TypeError):
            return list(self.event_buffer)

    def _remove_old_events(self):
        if not self.event_buffer:
            return

        valid_events = [
            e for e in self.event_buffer
            if hasattr(e, "timestamp")
        ]
        if not valid_events:
            self.event_buffer.clear()
            return

        latest_time = max(e.timestamp for e in valid_events)
        cutoff_time = latest_time - self.window

        filtered = deque()

        for event in self.event_buffer:
            if not hasattr(event, "timestamp"):
                continue

            if event.timestamp >= cutoff_time:
                filtered.append(event)

        self.event_buffer = filtered