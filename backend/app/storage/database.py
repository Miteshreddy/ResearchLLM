"""
SQLite Database Service
Stores research runs, history, and cached results.
"""

import json
import sqlite3
import logging
import os
from typing import Optional
from app.schemas.research import ResearchRun, RunStatus

logger = logging.getLogger(__name__)

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "researchpilot.db")


def ensure_db():
    """Create database and tables if they don't exist."""
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS research_runs (
            run_id TEXT PRIMARY KEY,
            query TEXT NOT NULL,
            depth TEXT DEFAULT 'standard',
            source_preference TEXT DEFAULT 'any',
            status TEXT DEFAULT 'pending',
            created_at TEXT NOT NULL,
            completed_at TEXT,
            data TEXT,
            error TEXT
        )
    """)
    conn.commit()
    conn.close()
    logger.info(f"Database initialized at {DB_PATH}")


def save_run(run: ResearchRun):
    """Save or update a research run."""
    ensure_db()
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    data = run.model_dump_json()
    cursor.execute("""
        INSERT OR REPLACE INTO research_runs 
        (run_id, query, depth, source_preference, status, created_at, completed_at, data, error)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        run.run_id, run.query, run.depth.value, run.source_preference.value,
        run.status.value, run.created_at, run.completed_at, data, run.error,
    ))
    conn.commit()
    conn.close()


def get_run(run_id: str) -> Optional[ResearchRun]:
    """Get a research run by ID."""
    ensure_db()
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT data FROM research_runs WHERE run_id = ?", (run_id,))
    row = cursor.fetchone()
    conn.close()
    if row and row[0]:
        return ResearchRun.model_validate_json(row[0])
    return None


def get_all_runs() -> list[dict]:
    """Get all research runs (summary only)."""
    ensure_db()
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        SELECT run_id, query, depth, status, created_at, completed_at 
        FROM research_runs 
        ORDER BY created_at DESC
        LIMIT 50
    """)
    rows = cursor.fetchall()
    conn.close()
    return [
        {
            "run_id": r[0],
            "query": r[1],
            "depth": r[2],
            "status": r[3],
            "created_at": r[4],
            "completed_at": r[5],
        }
        for r in rows
    ]


def delete_run(run_id: str):
    """Delete a research run."""
    ensure_db()
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM research_runs WHERE run_id = ?", (run_id,))
    conn.commit()
    conn.close()
