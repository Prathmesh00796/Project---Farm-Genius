"""
Explainable, dependency-light helpers for recommendation and yield.
Designed for classroom/demo clarity (rule based), not scientific final advice.
"""
from __future__ import annotations

from math import exp
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MODEL_DIR = ROOT / "backend" / "models_pickles"
CROPS_MH = ["Cotton", "Sugarcane", "Rice", "Maize", "Wheat", "Soybean"]


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


 # Ensure model directory exists (placeholder for loading models).
def ensure_models():
    """Keep previous contract used by app.py startup."""
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    return None, None, None


 # Score how well field values match a crop's ideal.
def _score_crop(values: dict, crop: str) -> float:
    prof = _CROP_PROFILE[crop]
    z2 = 0.0
    for k in ("N", "P", "K", "pH", "moisture"):
        dv = (float(values[k]) - prof[k]) / _SCALE[k]
        z2 += _WEIGHTS[k] * (dv * dv)
    # Gaussian-like closeness score: 1 near center, falls with distance.
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
    """
    Return predicted quintal/hectare using a transparent formula:
    base_by_crop * nutrient_factor * pH_factor * rainfall_factor.
    """
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

    # Crop-specific rainfall sweet spot.
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
