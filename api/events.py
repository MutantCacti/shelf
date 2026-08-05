"""In-memory per-user event broadcast for SSE refresh pings.

Valid for a single uvicorn process: subscribers are asyncio queues living
on the server's event loop, and notify() is only called from async route
handlers on that same loop.
"""

import asyncio
from collections import defaultdict

# user_id -> {(queue, client_id)}
_subscribers: dict[int, set[tuple[asyncio.Queue, str | None]]] = defaultdict(set)


def subscribe(user_id: int, client_id: str | None) -> tuple[asyncio.Queue, str | None]:
    """Register a listener. Returns the entry to pass to unsubscribe()."""
    entry = (asyncio.Queue(), client_id)
    _subscribers[user_id].add(entry)
    return entry


def unsubscribe(user_id: int, entry: tuple[asyncio.Queue, str | None]) -> None:
    _subscribers[user_id].discard(entry)
    if not _subscribers[user_id]:
        del _subscribers[user_id]


def notify(user_id: int, exclude_client_id: str | None = None) -> None:
    """Ping every listener of a user except the client that caused the change."""
    for queue, client_id in _subscribers.get(user_id, set()).copy():
        if exclude_client_id is not None and client_id == exclude_client_id:
            continue
        queue.put_nowait("changed")
