from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler
from urllib import error, request


FEEDBACK_KEY = "baby_feedback"
MAX_MESSAGES = 1000


class handler(BaseHTTPRequestHandler):
    def do_GET(self) -> None:
        try:
            messages = kv_lrange(FEEDBACK_KEY, 0, -1)
        except RuntimeError as exc:
            self.send_json({"error": str(exc)}, HTTPStatus.SERVICE_UNAVAILABLE)
            return

        parsed_messages = []
        for message in messages:
            try:
                parsed_messages.append(json.loads(message))
            except json.JSONDecodeError:
                continue

        self.send_json(parsed_messages)

    def do_POST(self) -> None:
        try:
            payload = self.read_json_body()
        except (ValueError, json.JSONDecodeError):
            self.send_json({"error": "Invalid JSON"}, HTTPStatus.BAD_REQUEST)
            return

        name = clean_text(payload.get("name"), 120)
        relationship = clean_text(payload.get("relationship"), 120)
        message_type = clean_text(payload.get("messageType"), 40) or "advice"
        message = clean_text(payload.get("message"), 4000)
        email = clean_text(payload.get("email"), 180)
        shareable = payload.get("shareable") is True

        if not name or not message:
            self.send_json(
                {"error": "Name and message are required"},
                HTTPStatus.BAD_REQUEST,
            )
            return

        feedback = {
            "id": datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S%f"),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "name": name,
            "relationship": relationship,
            "message_type": message_type,
            "message": message,
            "email": email,
            "shareable": shareable,
        }

        try:
            kv_pipeline(
                [
                    ["LPUSH", FEEDBACK_KEY, json.dumps(feedback)],
                    ["LTRIM", FEEDBACK_KEY, "0", str(MAX_MESSAGES - 1)],
                ]
            )
        except RuntimeError as exc:
            self.send_json({"error": str(exc)}, HTTPStatus.SERVICE_UNAVAILABLE)
            return

        self.send_json(feedback, HTTPStatus.CREATED)

    def read_json_body(self) -> dict:
        length = int(self.headers.get("Content-Length", "0"))
        raw_body = self.rfile.read(length)
        payload = json.loads(raw_body.decode("utf-8"))

        if not isinstance(payload, dict):
            raise ValueError("JSON body must be an object")

        return payload

    def send_json(self, payload: object, status: HTTPStatus = HTTPStatus.OK) -> None:
        encoded = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store, max-age=0")
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)


def clean_text(value: object, limit: int) -> str:
    if not isinstance(value, str):
        return ""

    return value.strip()[:limit]


def kv_env() -> tuple[str, str]:
    url = os.environ.get("KV_REST_API_URL") or os.environ.get("UPSTASH_REDIS_REST_URL")
    token = os.environ.get("KV_REST_API_TOKEN") or os.environ.get("UPSTASH_REDIS_REST_TOKEN")

    if not url or not token:
        raise RuntimeError("Redis storage is not configured")

    return url.rstrip("/"), token


def kv_request(path: str, body: object | None = None) -> object:
    base_url, token = kv_env()
    data = None
    headers = {"Authorization": f"Bearer {token}"}

    if body is not None:
        data = json.dumps(body).encode("utf-8")
        headers["Content-Type"] = "application/json"

    req = request.Request(f"{base_url}{path}", data=data, headers=headers, method="POST")

    try:
        with request.urlopen(req, timeout=10) as response:
            return json.loads(response.read().decode("utf-8"))
    except error.HTTPError as exc:
        detail = exc.read().decode("utf-8")
        raise RuntimeError(f"Vercel KV request failed: {detail}") from exc
    except error.URLError as exc:
        raise RuntimeError(f"Vercel KV request failed: {exc.reason}") from exc


def kv_lrange(key: str, start: int, end: int) -> list[str]:
    response = kv_request(f"/lrange/{key}/{start}/{end}")
    result = response.get("result") if isinstance(response, dict) else None

    if not isinstance(result, list):
        return []

    return [item for item in result if isinstance(item, str)]


def kv_pipeline(commands: list[list[str]]) -> None:
    kv_request("/pipeline", commands)
