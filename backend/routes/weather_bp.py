"""GET /weather — Maharashtra city selection + OpenWeatherMap."""

import os

from flask import Blueprint, jsonify, request

from utils.weather import fetch_weather

bp = Blueprint("weather", __name__)


@bp.get("/weather")
def weather():
    city = request.args.get("city")
    data = fetch_weather(city, os.environ.get("OPENWEATHER_API_KEY"))
    if data.get("mock"):
        return jsonify({"ok": True, **data})
    return jsonify({"ok": True, **data})
