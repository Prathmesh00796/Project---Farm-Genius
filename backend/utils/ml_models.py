"""
Explainable, dependency-light helpers for recommendation and yield.
Designed for classroom/demo clarity (rule based), not scientific final advice.
Includes lazy loading getters for PKL models to fit Render 512MB RAM limits.
"""
from __future__ import annotations

import os
from math import exp
from pathlib import Path
import joblib

ROOT = Path(__file__).resolve().parents[1]
MODEL_DIR = ROOT / "models"
CROPS_MH = ["Cotton", "Sugarcane", "Rice", "Maize", "Wheat", "Soybean"]

# Lazy-loaded singletons
_crop_model = None
_district_encoder = None
_soil_encoder = None
_crop_encoder = None
_fert_encoder = None
_fert_model = None


def ensure_models():
    """Ensure directory exists without pre-loading models into RAM."""
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    return None, None, None


def get_crop_model():
    global _crop_model
    if _crop_model is None:
        _crop_model = joblib.load(MODEL_DIR / "crop_model.pkl")
    return _crop_model


def get_district_encoder():
    global _district_encoder
    if _district_encoder is None:
        _district_encoder = joblib.load(MODEL_DIR / "district_encoder.pkl")
    return _district_encoder


def get_soil_encoder():
    global _soil_encoder
    if _soil_encoder is None:
        _soil_encoder = joblib.load(MODEL_DIR / "soil_encoder.pkl")
    return _soil_encoder


def get_crop_encoder():
    global _crop_encoder
    if _crop_encoder is None:
        _crop_encoder = joblib.load(MODEL_DIR / "crop_encoder.pkl")
    return _crop_encoder


def get_fert_encoder():
    global _fert_encoder
    if _fert_encoder is None:
        _fert_encoder = joblib.load(MODEL_DIR / "fert_encoder.pkl")
    return _fert_encoder


def get_fert_model():
    global _fert_model
    if _fert_model is None:
        model_path = MODEL_DIR / "fertilizer_model.pkl"

        if not os.path.exists(model_path):
            MODEL_DIR.mkdir(parents=True, exist_ok=True)
            import requests

            url = "https://huggingface.co/prem0079696/fertilzers/resolve/main/fertilizer_model.pkl"
            response = requests.get(url, stream=True)
            response.raise_for_status()

            with open(model_path, "wb") as f:
                for chunk in response.iter_content(8192):
                    f.write(chunk)

        _fert_model = joblib.load(model_path)
    return _fert_model


# Each crop has an "ideal-ish" center for Maharashtra style conditions.
_CROP_PROFILE = {
    "Cotton": {"N": 90.0, "P": 45.0, "K": 55.0, "pH": 7.2, "moisture": 34.0},
    "Sugarcane": {"N": 150.0, "P": 55.0, "K": 170.0, "pH": 7.0, "moisture": 58.0},
    "Rice": {"N": 95.0, "P": 42.0, "K": 42.0, "pH": 6.7, "moisture": 62.0},
    "Maize": {"N": 115.0, "P": 52.0, "K": 60.0, "pH": 6.9, "moisture": 44.0},
    "Wheat": {"N": 102.0, "P": 46.0, "K": 58.0, "pH": 7.0, "moisture": 30.0},
    "Soybean": {"N": 55.0, "P": 58.0, "K": 52.0, "pH": 6.8, "moisture": 36.0},
}

_WEIGHTS = {"N": 1.0, "P": 1.0, "K": 1.0, "pH": 2.0, "moisture": 1.4}
_SCALE = {"N": 55.0, "P": 25.0, "K": 65.0, "pH": 0.9, "moisture": 18.0}


# Score how well field values match a crop's ideal.
def _score_crop(values: dict, crop: str) -> float:
    prof = _CROP_PROFILE[crop]
    z2 = 0.0
    for k in ("N", "P", "K", "pH", "moisture"):
        dv = (float(values[k]) - prof[k]) / _SCALE[k]
        z2 += _WEIGHTS[k] * (dv * dv)
    return exp(-0.5 * z2)


# Predict the best crop for given field values.
def predict_best_crop(npv: dict):
    scores = []
    for crop in CROPS_MH:
        scores.append((crop, _score_crop(npv, crop)))
    total = sum(s for _, s in scores) or 1.0
    ranked = sorted(scores, key=lambda t: t[1], reverse=True)
    pred = ranked[0][0]
    probs = [{"crop": c, "probability": round(float(s / total), 4)} for c, s in ranked]
    return pred, probs


# Clamp a value between two bounds.
def _clamp(v: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, float(v)))


# Predict crop yield using a transparent formula.
def predict_yield(payload: dict):
    crop = str(payload["crop"]).strip()
    if crop not in CROPS_MH:
        raise ValueError(f"Maharashtra whitelist only: {CROPS_MH}")

    n_val = float(payload["N"])
    p_val = float(payload["P"])
    k_val = float(payload["K"])
    ph = float(payload["pH"])
    rain_mm = float(payload["rain_mm"])

    base_qtha = {
        "Cotton": 20.0,
        "Sugarcane": 780.0,
        "Rice": 30.0,
        "Maize": 35.0,
        "Wheat": 31.0,
        "Soybean": 16.0,
    }[crop]

    prof = _CROP_PROFILE[crop]
    nutrient_factor = (
        1.0
        - 0.18 * abs((n_val - prof["N"]) / max(40.0, prof["N"]))
        - 0.14 * abs((p_val - prof["P"]) / max(20.0, prof["P"]))
        - 0.14 * abs((k_val - prof["K"]) / max(25.0, prof["K"]))
    )
    nutrient_factor = _clamp(nutrient_factor, 0.65, 1.18)

    ph_factor = _clamp(1.0 - 0.08 * abs(ph - prof["pH"]), 0.72, 1.08)

    rain_opt = {
        "Cotton": 850.0,
        "Sugarcane": 1200.0,
        "Rice": 1100.0,
        "Maize": 800.0,
        "Wheat": 650.0,
        "Soybean": 900.0,
    }[crop]
    rain_factor = _clamp(1.0 - 0.00028 * abs(rain_mm - rain_opt), 0.68, 1.15)

    yhat = base_qtha * nutrient_factor * ph_factor * rain_factor
    floor = 6.0 if crop != "Sugarcane" else 220.0
    return round(max(yhat, floor), 3)