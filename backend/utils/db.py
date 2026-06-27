"""
SQLite persistence for Farm Genius (MySQL-compatible SQL in database/schema.sql for reference).
"""
from __future__ import annotations

import os
import sqlite3
from pathlib import Path
from werkzeug.security import generate_password_hash, check_password_hash

ROOT = Path(__file__).resolve().parents[2]
DB_PATH = ROOT / "database" / "farm_genius.sqlite3"


 # Get a connection to the SQLite database.
def get_conn():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH.as_posix())
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


 # Create tables for users, crop listings, and deal requests.
def init_db():
    """Create tables matching Maharashtra marketplace requirements."""
    with get_conn() as c:
        c.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'farmer' CHECK(role IN ('farmer','dealer')),
                full_name TEXT NOT NULL,
                phone_number TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS crop_listings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                farmer_id INTEGER NOT NULL,
                crop_name TEXT NOT NULL,
                quantity_kg REAL NOT NULL,
                price_per_kg REAL NOT NULL,
                village_or_town TEXT,
                district TEXT,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (farmer_id) REFERENCES users(id)
            );
            CREATE TABLE IF NOT EXISTS deal_requests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                listing_id INTEGER NOT NULL,
                dealer_id INTEGER NOT NULL,
                status TEXT NOT NULL DEFAULT 'accepted' CHECK(status IN ('accepted')),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(listing_id, dealer_id),
                FOREIGN KEY (listing_id) REFERENCES crop_listings(id),
                FOREIGN KEY (dealer_id) REFERENCES users(id)
            );
            """
        )
        # Lightweight migration for existing DBs.
        cols = [r["name"] for r in c.execute("PRAGMA table_info(users)").fetchall()]
        if "phone_number" not in cols:
            c.execute("ALTER TABLE users ADD COLUMN phone_number TEXT")
        c.commit()


 # Create a new user in the database.
def create_user(email: str, password: str, full_name: str, role: str = "farmer", phone_number: str = ""):
    pwd = generate_password_hash(password)
    try:
        with get_conn() as c:
            cur = c.execute(
                """INSERT INTO users (email, password_hash, role, full_name, phone_number)
                   VALUES (?, ?, ?, ?, ?)""",
                (
                    email.lower().strip(),
                    pwd,
                    role if role in ("farmer", "dealer") else "farmer",
                    full_name.strip(),
                    (phone_number or "").strip(),
                ),
            )
            c.commit()
            return cur.lastrowid
    except sqlite3.IntegrityError:
        return None


 # Authenticate a user by email and password.
def authenticate(email: str, password: str):
    with get_conn() as c:
        row = c.execute(
            "SELECT * FROM users WHERE email = ?", (email.lower().strip(),)
        ).fetchone()
    if not row or not check_password_hash(row["password_hash"], password):
        return None
    return dict(row)


 # Add a new crop listing to the marketplace.
def add_crop_listing(
    farmer_id: int,
    crop_name: str,
    quantity_kg: float,
    price_per_kg: float,
    village_or_town: str = "",
    district: str = "",
    notes: str = "",
):
    with get_conn() as c:
        cur = c.execute(
            """INSERT INTO crop_listings
               (farmer_id, crop_name, quantity_kg, price_per_kg, village_or_town, district, notes)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (farmer_id, crop_name, quantity_kg, price_per_kg, village_or_town, district, notes),
        )
        c.commit()
        return int(cur.lastrowid)


 # List all crop listings in the marketplace.
def list_marketplace():
    with get_conn() as c:
        rows = c.execute(
            """
            SELECT cl.*, u.full_name AS farmer_name, u.email AS farmer_email
                 , u.phone_number AS farmer_phone
            FROM crop_listings cl
            JOIN users u ON u.id = cl.farmer_id
            ORDER BY cl.created_at DESC
            """
        ).fetchall()
    return [dict(r) for r in rows]

def get_market_price(crop_name: str):
    with get_conn() as c:

        row = c.execute(
            """
            SELECT
                AVG(price_per_kg) as avg_price,
                MAX(price_per_kg) as max_price,
                MIN(price_per_kg) as min_price,
                COUNT(*) as listings
            FROM crop_listings
            WHERE LOWER(crop_name)=LOWER(?)
            """,
            (crop_name,)
        ).fetchone()

    if not row:
        return None

    return {
        "avg_price": float(row["avg_price"] or 0),
        "max_price": float(row["max_price"] or 0),
        "min_price": float(row["min_price"] or 0),
        "listings": int(row["listings"] or 0)
    }



def get_market_price(crop_name):

    with get_conn() as c:

        row = c.execute(
            """
            SELECT
                AVG(price_per_kg) AS avg_price,
                MAX(price_per_kg) AS max_price,
                MIN(price_per_kg) AS min_price
            FROM crop_listings
            WHERE LOWER(crop_name)=LOWER(?)
            """,
            (crop_name,)
        ).fetchone()

    if not row:
        return None

    return {
        "avg_price": float(row["avg_price"] or 0),
        "max_price": float(row["max_price"] or 0),
        "min_price": float(row["min_price"] or 0)
    }



 # List crop listings for a viewer, hiding accepted ones for dealers.
def list_marketplace_for_viewer(viewer_id: int | None = None, viewer_role: str | None = None):
    """
    Dealer should not see listings already accepted by that same dealer.
    Others see full marketplace list.
    """
    if viewer_role == "dealer" and viewer_id is not None:
        with get_conn() as c:
            rows = c.execute(
                """
                SELECT cl.*, u.full_name AS farmer_name, u.email AS farmer_email, u.phone_number AS farmer_phone
                FROM crop_listings cl
                JOIN users u ON u.id = cl.farmer_id
                LEFT JOIN deal_requests dr
                    ON dr.listing_id = cl.id
                   AND dr.dealer_id = ?
                WHERE dr.id IS NULL
                ORDER BY cl.created_at DESC
                """,
                (int(viewer_id),),
            ).fetchall()
        return [dict(r) for r in rows]
    return list_marketplace()


 # Get a crop listing with farmer details by listing ID.
def get_listing_with_farmer(listing_id: int):
    with get_conn() as c:
        row = c.execute(
            """
            SELECT cl.*, u.full_name AS farmer_name, u.email AS farmer_email, u.phone_number AS farmer_phone
            FROM crop_listings cl
            JOIN users u ON u.id = cl.farmer_id
            WHERE cl.id = ?
            """,
            (int(listing_id),),
        ).fetchone()
    return dict(row) if row else None


 # Create or get a deal request for a listing and dealer.
def create_or_get_deal(listing_id: int, dealer_id: int):
    with get_conn() as c:
        c.execute(
            """
            INSERT OR IGNORE INTO deal_requests (listing_id, dealer_id, status)
            VALUES (?, ?, 'accepted')
            """,
            (int(listing_id), int(dealer_id)),
        )
        row = c.execute(
            """
            SELECT * FROM deal_requests
            WHERE listing_id = ? AND dealer_id = ?
            """,
            (int(listing_id), int(dealer_id)),
        ).fetchone()
        c.commit()
    return dict(row) if row else None
