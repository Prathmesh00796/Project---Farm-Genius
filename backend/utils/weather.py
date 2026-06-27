"""No-key live weather via Open-Meteo with farmer-friendly fields."""

from datetime import datetime, timezone
from typing import Optional, Tuple

import requests

MAHARASHTRA_DEFAULT_CITIES = [
    {"name": "Pune", "lat": 18.5204, "lon": 73.8567},
    {"name": "Nagpur", "lat": 21.1458, "lon": 79.0882},
    {"name": "Nashik", "lat": 19.9975, "lon": 73.7898},
    {"name": "Chhatrapati Sambhajinagar", "lat": 19.8762, "lon": 75.3433},
    {"name": "Kolhapur", "lat": 16.7050, "lon": 74.2433},
    {"name": "Sangli", "lat": 16.8524, "lon": 74.5945},
    {"name": "Ahilyanagar", "lat": 19.0952, "lon": 74.7496},
    {"name": "Solapur", "lat": 17.6599, "lon": 75.9064},
    {"name": "Jalgaon", "lat": 21.0077, "lon": 75.5626},
]


 # Get city info from name or default.
def _resolve_city(city: Optional[str]) -> dict:
    if city:
        for hub in MAHARASHTRA_DEFAULT_CITIES:
            if hub["name"].lower() == city.strip().lower():
                return hub
    return MAHARASHTRA_DEFAULT_CITIES[0]


 # Give farmer tips based on rain, humidity, wind.
def _farmer_tips_mm_rain(desc_mr: Tuple[str, str], rain_days: list, humidity: float, wind_ms: float) -> Tuple[str, str]:
    mr, en = [], []
    tomorrow = rain_days[1] if len(rain_days) > 1 else 0
    heavy = tomorrow >= 6

    if heavy:
        mr.append("उद्या चांगला पावसाचा अंदाज असल्यास फवाश्या आणि स्प्रे पुन्हा २–३ दिवसांच्या दिनदर्शिकेत ढकला का तपासा.")
        en.append("Rain ≥6 mm expected tomorrow — delay sprays until leaf surfaces stay dry.")

    if humidity >= 82:
        mr.append("आर्द्रता जास्त असल्यामुळे बुरशी आणि जीवाणू रोगांचा धोका वाढतो — वातानुकूल फवाश्याच्या वेळेचे निरीक्षण ठेवा.")
        en.append("High humidity increases fungal disease risk — time sprays with demos + leaf-dry forecasts.")

    if wind_ms >= 10:
        mr.append("वारा जोर असल्याने फवारणी ड्रिफ्ट होते — सकाळी हलका वारा आणि कमी टेंपरेचरची वेळ निवडा.")
        en.append("Strong drift risk — spray in calm morning windows.")

    mr.append(desc_mr[0])
    en.append(desc_mr[1])

    mr.append("शेतावर डोळ्यांनी पुन्हा तपाशा आणि जवळच्या घोषणेनुसारच फवाश्या ठरवा.")
    en.append("Walk the crop again and align sprays with local bulletins—not this screen alone.")

    return " ".join(mr), " ".join(en)


 # Fetch live weather for a city.
def fetch_weather(city: Optional[str], api_key: Optional[str]):
    # Keep signature unchanged; api_key intentionally unused now.
    hub = _resolve_city(city)

    live_desc_mr = ("आज शेतात पाण्याचे आणि पानांचे स्थान स्वतः तपाशा.", "Walk the field yourself and judge moisture/leaves.")
    lat, lon = hub["lat"], hub["lon"]
    params = {
        "latitude": lat,
        "longitude": lon,
        "current_weather": "true",
        "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum",
        "hourly": "relativehumidity_2m,surface_pressure,cloudcover,visibility",
        "timezone": "auto",
        "forecast_days": 5,
    }

    try:
        res = requests.get("https://api.open-meteo.com/v1/forecast", params=params, timeout=15)
        res.raise_for_status()
        payload = res.json()
    except Exception:
        data = _mock_bundle(hub["name"])
        data["farmer_tip_mr"], data["farmer_tip_en"] = _farmer_tips_mm_rain(
            live_desc_mr, data["rain_forecast_daily_mm"], data["humidity_percent"], data.get("wind_speed_ms", 0)
        )
        data["live"] = False
        return {"error": "upstream_unavailable", "mock": True, "data": data}

    cur = payload.get("current_weather") or {}
    daily = payload.get("daily") or {}
    rains = [round(float(x or 0), 2) for x in (daily.get("precipitation_sum") or [])[:5]]
    if not rains:
        rains = [0.0, 0.0, 0.0, 0.0, 0.0]

    time_iso = datetime.now(timezone.utc).isoformat()
    temp_now = float(cur.get("temperature", 0) or 0)
    wind_speed = round(float(cur.get("windspeed", 0) or 0), 2)

    hour = payload.get("hourly") or {}
    hum_arr = hour.get("relativehumidity_2m") or []
    prs_arr = hour.get("surface_pressure") or []
    cld_arr = hour.get("cloudcover") or []
    vis_arr = hour.get("visibility") or []
    humidity_pct = int(float(hum_arr[0])) if hum_arr else 0
    pressure_hpa = round(float(prs_arr[0]), 1) if prs_arr else None
    cloud_pct = int(float(cld_arr[0])) if cld_arr else None
    vis_m = int(float(vis_arr[0])) if vis_arr else None

    tmax = daily.get("temperature_2m_max") or []
    tmin = daily.get("temperature_2m_min") or []
    max_c = round(float(tmax[0]), 2) if tmax else temp_now
    min_c = round(float(tmin[0]), 2) if tmin else temp_now

    desc_text = "Live sky forecast"
    farmer_desc_mr = (
        f"आजचे आकाशः {desc_text} आणि तापमान {round(temp_now, 1)} °C.",
        f"Sky today: {desc_text} • air temp {round(temp_now, 1)} °C.",
    )

    farmer_tip_mr, farmer_tip_en = _farmer_tips_mm_rain(farmer_desc_mr, rains, humidity_pct, wind_speed)

    data = {
        "live": True,
        "source": "open-meteo",
        "city": hub["name"],
        "country": "IN",
        "observation_time_iso": time_iso,
        "temperature_c": round(temp_now, 2),
        "feels_like_c": round(temp_now, 2),
        "temp_min_c": min_c,
        "temp_max_c": max_c,
        "humidity_percent": humidity_pct,
        "pressure_hpa": pressure_hpa,
        "description": desc_text,
        "visibility_m": vis_m,
        "cloudiness_percent": cloud_pct,
        "wind_speed_ms": wind_speed,
        "wind_deg": cur.get("winddirection"),
        "sunrise_iso": "",
        "sunset_iso": "",
        "rain_forecast_daily_mm": rains,
        "farmer_tip_mr": farmer_tip_mr,
        "farmer_tip_en": farmer_tip_en,
    }

    return {"mock": False, **data}


 # Return a mock weather data bundle for a place.
def _mock_bundle(place: str):
    rains = [0.0, 2.4, 6.8, 0.0, 4.5]
    return {
        "live": False,
        "city": place or "Pune",
        "temperature_c": 28.6,
        "feels_like_c": 30.1,
        "temp_min_c": 26.2,
        "temp_max_c": 31.0,
        "humidity_percent": 64,
        "pressure_hpa": 1008,
        "description": "ढगाळ · साधारण अंदाज",
        "wind_speed_ms": 3.1,
        "wind_deg": 240,
        "cloudiness_percent": 45,
        "visibility_m": 8000,
        "rain_forecast_daily_mm": rains,
        "observation_time_iso": datetime.now(timezone.utc).isoformat(),
        "sunrise_iso": "",
        "sunset_iso": "",
    }
