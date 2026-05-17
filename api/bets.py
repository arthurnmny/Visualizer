from __future__ import annotations

import json
import os
import sqlite3
from datetime import datetime, timezone
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler


DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'bets.sqlite3')


class handler(BaseHTTPRequestHandler):
    def do_GET(self) -> None:
        try:
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM bets ORDER BY submitted_at DESC')
            rows = cursor.fetchall()
            conn.close()

            # Convert to dict
            bets = []
            for row in rows:
                bets.append({
                    'id': row[0],
                    'submitted_at': row[1],
                    'name': row[2],
                    'q1chips': row[3],
                    'q1response': row[4],
                    'q2chips': row[5],
                    'q2response': row[6],
                    'q3chips': row[7],
                    'q3response': row[8],
                    'q4chips': row[9],
                    'q4response': row[10],
                    'q5chips': row[11],
                    'q5response': row[12],
                })

            self.send_json(bets)
        except Exception as exc:
            self.send_json({"error": str(exc)}, HTTPStatus.SERVICE_UNAVAILABLE)

    def do_POST(self) -> None:
        try:
            payload = self.read_json_body()
        except (ValueError, json.JSONDecodeError):
            self.send_json({"error": "Invalid JSON"}, HTTPStatus.BAD_REQUEST)
            return

        name = clean_text(payload.get("name"), 120)
        q1chips = int(payload.get("q1chips", 0))
        q1response = clean_text(payload.get("q1response"), 200)
        q2chips = int(payload.get("q2chips", 0))
        q2response = clean_text(payload.get("q2response"), 200)
        q3chips = int(payload.get("q3chips", 0))
        q3response = clean_text(payload.get("q3response"), 200)
        q4chips = int(payload.get("q4chips", 0))
        q4response = clean_text(payload.get("q4response"), 200)
        q5chips = int(payload.get("q5chips", 0))
        q5response = clean_text(payload.get("q5response"), 200)

        total_chips = q1chips + q2chips + q3chips + q4chips + q5chips
        if total_chips > 100:
            self.send_json({"error": "Total chips exceed 100"}, HTTPStatus.BAD_REQUEST)
            return

        if not name:
            self.send_json({"error": "Name is required"}, HTTPStatus.BAD_REQUEST)
            return

        try:
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO bets (submitted_at, name, q1chips, q1response, q2chips, q2response, q3chips, q3response, q4chips, q4response, q5chips, q5response)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (datetime.now(timezone.utc).isoformat(), name, q1chips, q1response, q2chips, q2response, q3chips, q3response, q4chips, q4response, q5chips, q5response))
            bet_id = cursor.lastrowid
            conn.commit()
            conn.close()

            bet = {
                "id": bet_id,
                "submitted_at": datetime.now(timezone.utc).isoformat(),
                "name": name,
                "q1chips": q1chips,
                "q1response": q1response,
                "q2chips": q2chips,
                "q2response": q2response,
                "q3chips": q3chips,
                "q3response": q3response,
                "q4chips": q4chips,
                "q4response": q4response,
                "q5chips": q5chips,
                "q5response": q5response,
            }

            self.send_json(bet, HTTPStatus.CREATED)
        except Exception as exc:
            self.send_json({"error": str(exc)}, HTTPStatus.SERVICE_UNAVAILABLE)

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


# Initialize database if not exists
def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS bets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            submitted_at TEXT NOT NULL,
            name TEXT NOT NULL,
            q1chips INTEGER DEFAULT 0,
            q1response TEXT,
            q2chips INTEGER DEFAULT 0,
            q2response TEXT,
            q3chips INTEGER DEFAULT 0,
            q3response TEXT,
            q4chips INTEGER DEFAULT 0,
            q4response TEXT,
            q5chips INTEGER DEFAULT 0,
            q5response TEXT
        )
    ''')
    conn.commit()
    conn.close()


init_db()