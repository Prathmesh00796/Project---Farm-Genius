"""
POST /login, POST /register — JWT Bearer for SPA.
"""
import os

import jwt
from flask import Blueprint, jsonify, request

from utils.db import authenticate, create_user

bp = Blueprint("auth", __name__)
SECRET = os.environ.get("FARM_GENIUS_JWT_SECRET", "dev-change-me-use-env")


def mint_token(row: dict):
    payload = {"uid": row["id"], "role": row["role"], "email": row["email"]}
    token = jwt.encode(payload, SECRET, algorithm="HS256")
    if isinstance(token, bytes):
        token = token.decode("utf-8")
    return token


@bp.post("/login")
def login():
    body = request.get_json(force=True, silent=True) or {}
    email = body.get("email", "")
    password = body.get("password", "")
    row = authenticate(email, password)
    if not row:
        return jsonify({"ok": False, "error": "Invalid credentials"}), 401
    token = mint_token(row)
    return jsonify(
        {
            "ok": True,
            "token": token,
            "user": {
                "id": row["id"],
                "email": row["email"],
                "full_name": row["full_name"],
                "role": row["role"],
                "phone_number": row.get("phone_number", ""),
            },
        }
    )


@bp.post("/register")
def register():
    body = request.get_json(force=True, silent=True) or {}
    email = body.get("email", "").strip()
    password = body.get("password", "")
    full_name = body.get("full_name", "").strip()
    phone_number = body.get("phone_number", "").strip()
    role = body.get("role", "farmer")

    if not email or len(password) < 6:
        return jsonify({"ok": False, "error": "Email needed and password min 6 chars"}), 400
    uid = create_user(email, password, full_name, role, phone_number=phone_number)
    if uid is None:
        return jsonify({"ok": False, "error": "Email already registered"}), 409
    row = {
        "id": uid,
        "email": email.lower(),
        "role": role if role in ("farmer", "dealer") else "farmer",
        "full_name": full_name,
        "phone_number": phone_number,
    }
    token = mint_token(row)
    return jsonify({"ok": True, "token": token, "user": {**row, "id": uid}})
