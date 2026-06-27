"""
Marketplace APIs — authenticated farmers add crops; dealers browse.
"""
import os

import jwt
from flask import Blueprint, jsonify, request

from utils.db import (
    add_crop_listing,
    create_or_get_deal,
    get_listing_with_farmer,
    list_marketplace_for_viewer,
)

bp = Blueprint("market", __name__)
SECRET = os.environ.get("FARM_GENIUS_JWT_SECRET", "dev-change-me-use-env")

MH_CROPS = frozenset({"cotton", "sugarcane", "rice", "maize", "wheat", "soybean"})


def auth_header_uid():
    h = request.headers.get("Authorization", "")
    if not h.startswith("Bearer "):
        return None
    token = h.split(" ", 1)[1].strip()
    try:
        data = jwt.decode(token, SECRET, algorithms=["HS256"])
        return int(data["uid"]), str(data.get("role", ""))
    except Exception:
        return None


@bp.post("/add-crop")
def add_crop():
    info = auth_header_uid()
    if not info:
        return jsonify({"ok": False, "error": "Bearer token required"}), 401
    uid, role = info
    if role != "farmer":
        return jsonify({"ok": False, "error": "Only farmers list produce"}), 403
    body = request.get_json(force=True, silent=True) or {}

    raw = str(body.get("crop_name", "")).strip().lower()
    lc = "".join(raw.split())  # allow "Soy Bean" typo tolerance -> soya not valid
    if lc not in MH_CROPS:
        return jsonify(
            {
                "ok": False,
                "error": "Only Maharashtra-listed crops accepted",
                "whitelist": sorted(MH_CROPS),
            }
        ), 400

    try:
        qty = float(body["quantity_kg"])
        ppk = float(body["price_per_kg"])
    except (KeyError, TypeError, ValueError):
        return jsonify({"ok": False, "error": "quantity_kg, price_per_kg numbers required"}), 400

    lid = add_crop_listing(
        farmer_id=uid,
        crop_name=lc.capitalize(),
        quantity_kg=qty,
        price_per_kg=ppk,
        village_or_town=str(body.get("village_or_town", "")),
        district=str(body.get("district", "")),
        notes=str(body.get("notes", "")),
    )
    return jsonify({"ok": True, "listing_id": lid})


@bp.get("/marketplace")
def marketplace():
    info = auth_header_uid()
    uid, role = info if info else (None, None)
    return jsonify({"ok": True, "listings": list_marketplace_for_viewer(uid, role)})


@bp.post("/accept-deal")
def accept_deal():
    info = auth_header_uid()
    if not info:
        return jsonify({"ok": False, "error": "Bearer token required"}), 401
    uid, role = info
    if role != "dealer":
        return jsonify({"ok": False, "error": "Only dealers can accept deals"}), 403

    body = request.get_json(force=True, silent=True) or {}
    try:
        listing_id = int(body.get("listing_id"))
    except (TypeError, ValueError):
        return jsonify({"ok": False, "error": "listing_id (int) required"}), 400

    listing = get_listing_with_farmer(listing_id)
    if not listing:
        return jsonify({"ok": False, "error": "Listing not found"}), 404

    deal = create_or_get_deal(listing_id=listing_id, dealer_id=uid)
    return jsonify(
        {
            "ok": True,
            "deal_id": deal["id"] if deal else None,
            "listing_id": listing_id,
            "farmer_contact": {
                "name": listing.get("farmer_name"),
                "email": listing.get("farmer_email"),
                "phone_number": listing.get("farmer_phone") or "",
            },
        }
    )

