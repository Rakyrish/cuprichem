"""
Binds the acting user to the current thread.

Service functions deep in the call stack need to attribute a change without
every caller threading `request` through. A thread-local is the pragmatic way to
do that under Django's synchronous request model.

The value is always cleared in `finally`, so a pooled worker thread can never
leak one request's actor into the next.
"""

from __future__ import annotations

import threading

_state = threading.local()


def get_actor():
    return getattr(_state, "actor", None)


def get_actor_ip() -> str | None:
    return getattr(_state, "ip", None)


def set_actor(user, ip: str | None = None) -> None:
    _state.actor = user
    _state.ip = ip


def clear_actor() -> None:
    _state.actor = None
    _state.ip = None


def client_ip(request) -> str | None:
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR", "")
    if forwarded:
        # Left-most entry is the original client when the proxy chain is trusted.
        return forwarded.split(",")[0].strip() or None
    return request.META.get("REMOTE_ADDR") or None


class AuditActorMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        try:
            # DRF authenticates inside the view, so request.user here is often
            # still anonymous. Views that need precise attribution call
            # set_actor() themselves; this covers session-authenticated access.
            user = getattr(request, "user", None)
            set_actor(user if (user and user.is_authenticated) else None, client_ip(request))
            return self.get_response(request)
        finally:
            clear_actor()
