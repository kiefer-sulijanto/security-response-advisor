import asyncio
import json
from typing import List, Optional

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

router = APIRouter()

# Captured at startup so sync route handlers (run in threadpool) can push safely.
_loop: Optional[asyncio.AbstractEventLoop] = None
_subscribers: List[asyncio.Queue] = []


def set_event_loop(loop: asyncio.AbstractEventLoop) -> None:
    global _loop
    _loop = loop


def notify(event_type: str) -> None:
    """Push a named event to every connected SSE client.

    Thread-safe: can be called from synchronous FastAPI route handlers.
    """
    if _loop is None or not _subscribers:
        return
    payload = {"type": event_type}
    for q in list(_subscribers):
        try:
            _loop.call_soon_threadsafe(q.put_nowait, payload)
        except Exception:
            pass


async def _stream():
    queue: asyncio.Queue = asyncio.Queue(maxsize=20)
    _subscribers.append(queue)
    try:
        # Initial ping so the client knows the connection is live.
        yield 'data: {"type":"connected"}\n\n'
        while True:
            try:
                event = await asyncio.wait_for(queue.get(), timeout=25.0)
                yield f"data: {json.dumps(event)}\n\n"
            except asyncio.TimeoutError:
                # Keepalive comment — prevents proxies from closing idle connections.
                yield ": keepalive\n\n"
    except (asyncio.CancelledError, GeneratorExit):
        pass
    finally:
        try:
            _subscribers.remove(queue)
        except ValueError:
            pass


@router.get("/api/events")
async def sse_events():
    return StreamingResponse(
        _stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
