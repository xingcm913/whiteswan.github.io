"""SQLite 数据访问层：管理 API Key、参数预设、训练样本、对话记录。"""
from __future__ import annotations

import json
import sqlite3
import threading
import time
import uuid
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Iterator

DB_PATH = Path(__file__).resolve().parent.parent / "data" / "assistant.db"
_lock = threading.Lock()


def _connect() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA foreign_keys=ON;")
    return conn


@contextmanager
def get_conn() -> Iterator[sqlite3.Connection]:
    """线程安全的数据库连接上下文。"""
    with _lock:
        conn = _connect()
        try:
            yield conn
            conn.commit()
        finally:
            conn.close()


def init_db() -> None:
    """初始化表结构。幂等。"""
    schema = """
    CREATE TABLE IF NOT EXISTS settings (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS api_keys (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        key          TEXT UNIQUE NOT NULL,
        name         TEXT NOT NULL DEFAULT '',
        created_at   INTEGER NOT NULL,
        last_used_at INTEGER,
        is_active     INTEGER NOT NULL DEFAULT 1,
        call_count   INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS training_samples (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        role       TEXT NOT NULL,           -- system / user / assistant
        content    TEXT NOT NULL,
        tag        TEXT NOT NULL DEFAULT '',-- 分组标签
        created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS conversations (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        role       TEXT NOT NULL,
        content    TEXT NOT NULL,
        ts         INTEGER NOT NULL,
        api_key    TEXT
    );

    CREATE TABLE IF NOT EXISTS presets (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        name            TEXT NOT NULL,
        temperature     REAL NOT NULL,
        top_p           REAL NOT NULL,
        max_tokens      INTEGER NOT NULL,
        presence_penalty REAL NOT NULL DEFAULT 0,
        frequency_penalty REAL NOT NULL DEFAULT 0,
        system_prompt   TEXT NOT NULL DEFAULT '',
        model           TEXT NOT NULL DEFAULT '',
        created_at      INTEGER NOT NULL
    );
    """
    with get_conn() as conn:
        conn.executescript(schema)
        # 默认设置
        defaults = {
            "base_url": "https://open.bigmodel.cn/api/paas/v4/",
            "model": "glm-4-plus",
            "api_key": "",
            "temperature": "0.7",
            "top_p": "0.9",
            "max_tokens": "2048",
            "presence_penalty": "0",
            "frequency_penalty": "0",
            "system_prompt": "你是一个乐于助人的中文 AI 助手。",
            "use_training": "1",
            "inject_time": "1",
        }
        for k, v in defaults.items():
            conn.execute(
                "INSERT OR IGNORE INTO settings(key, value) VALUES(?, ?)", (k, v)
            )
        # 默认参数预设
        existing = conn.execute("SELECT COUNT(*) FROM presets").fetchone()[0]
        if existing == 0:
            presets = [
                ("创意", 1.1, 0.95, 4096, 0.6, 0.4, "你是一个富有想象力的创作助手。", ""),
                ("平衡", 0.7, 0.9, 2048, 0.0, 0.0, "你是一个乐于助人的中文 AI 助手。", ""),
                ("严谨", 0.2, 0.7, 1024, 0.0, 0.0, "你是一个严谨准确的学术助手，回答务必有依据。", ""),
            ]
            ts = int(time.time())
            for name, t, p, mt, pp, fp, sp, m in presets:
                conn.execute(
                    "INSERT INTO presets(name, temperature, top_p, max_tokens, "
                    "presence_penalty, frequency_penalty, system_prompt, model, created_at) "
                    "VALUES(?,?,?,?,?,?,?,?,?)",
                    (name, t, p, mt, pp, fp, sp, m, ts),
                )


# ---------- 设置 ----------
def get_setting(key: str, default: str = "") -> str:
    with get_conn() as conn:
        row = conn.execute("SELECT value FROM settings WHERE key=?", (key,)).fetchone()
    return row["value"] if row else default


def get_settings(keys: list[str] | None = None) -> dict[str, str]:
    with get_conn() as conn:
        if keys:
            placeholders = ",".join("?" * len(keys))
            rows = conn.execute(
                f"SELECT key, value FROM settings WHERE key IN ({placeholders})", keys
            ).fetchall()
        else:
            rows = conn.execute("SELECT key, value FROM settings").fetchall()
    return {r["key"]: r["value"] for r in rows}


def set_setting(key: str, value: str) -> None:
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO settings(key, value) VALUES(?, ?) "
            "ON CONFLICT(key) DO UPDATE SET value=excluded.value",
            (key, value),
        )


# ---------- API Key ----------
def create_api_key(name: str = "") -> dict[str, Any]:
    raw = f"sk-assistant-{uuid.uuid4().hex}{uuid.uuid4().hex[:8]}"
    with get_conn() as conn:
        cur = conn.execute(
            "INSERT INTO api_keys(key, name, created_at) VALUES(?,?,?)",
            (raw, name, int(time.time())),
        )
        return {"id": cur.lastrowid, "key": raw, "name": name}


def list_api_keys() -> list[dict[str, Any]]:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT id, key, name, created_at, last_used_at, is_active, call_count "
            "FROM api_keys ORDER BY created_at DESC"
        ).fetchall()
    return [dict(r) for r in rows]


def delete_api_key(api_id: int) -> bool:
    with get_conn() as conn:
        cur = conn.execute("DELETE FROM api_keys WHERE id=?", (api_id,))
        return cur.rowcount > 0


def toggle_api_key(api_id: int, active: bool) -> bool:
    with get_conn() as conn:
        cur = conn.execute(
            "UPDATE api_keys SET is_active=? WHERE id=?", (1 if active else 0, api_id)
        )
        return cur.rowcount > 0


def validate_api_key(raw_key: str) -> dict[str, Any] | None:
    if not raw_key:
        return None
    with get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM api_keys WHERE key=? AND is_active=1", (raw_key,)
        ).fetchone()
        if row:
            conn.execute(
                "UPDATE api_keys SET last_used_at=?, call_count=call_count+1 "
                "WHERE id=?",
                (int(time.time()), row["id"]),
            )
            return dict(row)
    return None


# ---------- 训练样本 ----------
def add_training_sample(role: str, content: str, tag: str = "") -> dict[str, Any]:
    if role not in ("system", "user", "assistant"):
        raise ValueError("role 必须是 system/user/assistant")
    with get_conn() as conn:
        cur = conn.execute(
            "INSERT INTO training_samples(role, content, tag, created_at) VALUES(?,?,?,?)",
            (role, content, tag, int(time.time())),
        )
        return {"id": cur.lastrowid, "role": role, "content": content, "tag": tag}


def list_training_samples(tag: str = "") -> list[dict[str, Any]]:
    with get_conn() as conn:
        if tag:
            rows = conn.execute(
                "SELECT * FROM training_samples WHERE tag=? ORDER BY id", (tag,)
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM training_samples ORDER BY id"
            ).fetchall()
    return [dict(r) for r in rows]


def delete_training_sample(sample_id: int) -> bool:
    with get_conn() as conn:
        cur = conn.execute("DELETE FROM training_samples WHERE id=?", (sample_id,))
        return cur.rowcount > 0


def training_tags() -> list[str]:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT DISTINCT tag FROM training_samples WHERE tag != '' ORDER BY tag"
        ).fetchall()
    return [r["tag"] for r in rows]


# ---------- 预设 ----------
def list_presets() -> list[dict[str, Any]]:
    with get_conn() as conn:
        rows = conn.execute("SELECT * FROM presets ORDER BY id").fetchall()
    return [dict(r) for r in rows]


def create_preset(data: dict[str, Any]) -> dict[str, Any]:
    with get_conn() as conn:
        cur = conn.execute(
            "INSERT INTO presets(name, temperature, top_p, max_tokens, "
            "presence_penalty, frequency_penalty, system_prompt, model, created_at) "
            "VALUES(?,?,?,?,?,?,?,?,?,?)",
            (
                data["name"],
                float(data.get("temperature", 0.7)),
                float(data.get("top_p", 0.9)),
                int(data.get("max_tokens", 2048)),
                float(data.get("presence_penalty", 0)),
                float(data.get("frequency_penalty", 0)),
                data.get("system_prompt", ""),
                data.get("model", ""),
                int(time.time()),
            ),
        )
        return {"id": cur.lastrowid, **data}


def delete_preset(pid: int) -> bool:
    with get_conn() as conn:
        cur = conn.execute("DELETE FROM presets WHERE id=?", (pid,))
        return cur.rowcount > 0


# ---------- 对话记录 ----------
def log_message(role: str, content: str, api_key: str | None = None) -> None:
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO conversations(role, content, ts, api_key) VALUES(?,?,?,?)",
            (role, content, int(time.time()), api_key),
        )


def list_conversations(limit: int = 200) -> list[dict[str, Any]]:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM conversations ORDER BY id DESC LIMIT ?", (limit,)
        ).fetchall()
    return [dict(r) for r in reversed(rows)]


def clear_conversations() -> None:
    with get_conn() as conn:
        conn.execute("DELETE FROM conversations")
