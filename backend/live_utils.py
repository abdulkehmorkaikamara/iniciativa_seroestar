import os
import re


def build_room_name(session_id, title):
    slug = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")
    return f"{slug}-{session_id}" if slug else f"session-{session_id}"


def build_room_url(room_name, daily_domain=None):
    domain = daily_domain or os.getenv("DAILY_DOMAIN", "seroestar.daily.co")
    if domain.startswith("http://") or domain.startswith("https://"):
        return f"{domain.rstrip('/')}/{room_name}"
    return f"https://{domain}/{room_name}"


def build_room_details(session_id, title, daily_domain=None):
    room_name = build_room_name(session_id, title)
    room_url = build_room_url(room_name, daily_domain=daily_domain)
    return {
        "room_name": room_name,
        "room_url": room_url,
        "join_token": "demo-token",
    }
