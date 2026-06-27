"""Disease, recommendation, yield — Maharashtra crop scope enforced."""

import os

from flask import Blueprint, current_app, jsonify, request
from tensorflow import python

from utils.disease_predict import normalize_crop_focus_key, predict_with_model, validate_model_output_shape
from utils.farmer_economics import quintals_to_sale_range_rs
from utils.farmer_recommend import farming_steps_mr, weather_from_fetch
from utils.ml_models import CROPS_MH, predict_best_crop, predict_yield
from utils.weather import fetch_weather

bp = Blueprint("ml_api", __name__)


@bp.post("/predict-disease")
def predict_disease():
    # Maharashtra farmers → Marathi default; pass ?lang=en for English summaries
    lang = request.args.get("lang", "mr")
    crop_focus = (request.form.get("crop") or request.args.get("crop") or "").strip()

    model = getattr(current_app, "disease_model", None)
    if model is None:
        return jsonify(
            {
                "ok": False,
                "error_mr": "पान तपास यंत्रणा लवकर उपलब्ध होईल असे पुन्हा प्रयत्न करा.",
                "error": "Photo check is not ready right now. Please try again in a moment.",
            }
        ), 503

    f = request.files.get("image")
    if not f:
        body = request.get_json(force=True, silent=True) or {}
        if body.get("_ping"):
            return jsonify({"ok": True, "model_loaded": True})
        return jsonify({"ok": False, "error": "Field 'image' (file upload) required"}), 400

    image_bytes = f.read()
    if not image_bytes:
        return jsonify({"ok": False, "error": "Empty file"}), 400

    if not crop_focus:
        return jsonify(
            {
                "ok": False,
                "error_mr": "आधी पीक निवडून पुन्हा प्रयत्न करा — निवड नाही तर इतर पिकांचा गोंधळ होतो.",
                "error": "Missing crop. Pick Cotton/Sugarcane/etc. first.",
            }
        ), 400
    if normalize_crop_focus_key(crop_focus) is None:
        return jsonify(
            {
                "ok": False,
                "error_mr": "पिकाचे नाव ओळखले नाही — Cotton, Sugarcane, Rice, Maize, Wheat, Soybean पैकी एक निवडा.",
                "error": "Unknown crop. Use one of: Cotton, Sugarcane, Rice, Maize, Wheat, Soybean.",
            }
        ), 400

    try:
        outs = getattr(model, "output_shape", None) or getattr(model.outputs[0], "shape")
        dim = outs[-1] if outs else 0
        ok, mismatch_msg = validate_model_output_shape(dim)
        if not ok:
            current_app.logger.warning(mismatch_msg)
        result = dict(
            predict_with_model(model, image_bytes, lang=lang, crop_focus=crop_focus or None)
        )
        result["label_alignment_warning"] = None if ok else mismatch_msg
        return jsonify({"ok": True, **result})
    except Exception as e:
        current_app.logger.exception(e)
        return jsonify({"ok": False, "error": str(e)}), 500

import joblib
import pandas as pd
crop_model = joblib.load("models/crop_model.pkl")
fert_model = joblib.load("models/fertilizer_model.pkl")

district_encoder = joblib.load(
    "models/district_encoder.pkl"
)

soil_encoder = joblib.load(
    "models/soil_encoder.pkl"
)

crop_encoder = joblib.load(
    "models/crop_encoder.pkl"
)

fert_encoder = joblib.load(
    "models/fert_encoder.pkl"
)


from utils.db import get_market_price
@bp.post("/recommend-crop")
def recommend_crop():

    body = request.get_json(force=True, silent=True) or {}

    city = str(body.get("city") or "").strip()
    district = city

    try:
        N = float(body["N"])
        P = float(body["P"])
        K = float(body["K"])
        moisture = float(body["moisture"])
        pH = float(body["pH"])

    except Exception:
        return jsonify({
            "ok": False,
            "error": "N,P,K,pH,moisture required"
        }),400

    # ===================================
    # DEFAULT VALUES
    # ===================================

    soil_color = "Black"

    rainfall = 900
    temperature = 28

    # ===================================
    # WEATHER
    # ===================================

    wx_pack = fetch_weather(
        city or None,
        os.environ.get("OPENWEATHER_API_KEY")
    )

    wx_flat = weather_from_fetch(wx_pack)

    if wx_flat:

        rainfall = wx_flat.get("rainfall", 900)

        temperature = wx_flat.get(
            "temperature",
            temperature
        )

    # ===================================
    # ENCODE
    # ===================================

    district_encoded = district_encoder.transform(
        [district]
    )[0]

    soil_encoded = soil_encoder.transform(
        [soil_color]
    )[0]

    crop_features = pd.DataFrame([{
        "District_Name": district_encoded,
        "Soil_color": soil_encoded,
        "Nitrogen": N,
        "Phosphorus": P,
        "Potassium": K,
        "pH": pH,
        "Rainfall": rainfall,
        "Temperature": temperature
    }])

    # ===================================
    # CROP PREDICTION
    # ===================================

    crop_pred = crop_model.predict(
        crop_features
    )[0]

    crop_name = crop_encoder.inverse_transform(
        [crop_pred]
    )[0]

    # ===================================
    # TOP CANDIDATES
    # ===================================

    probs = crop_model.predict_proba(
        crop_features
    )[0]

    candidates = []

    for i,p in enumerate(probs):

        candidates.append({
            "crop":
                crop_encoder.classes_[i],

            "probability":
                round(float(p),4)
        })

    candidates.sort(
        key=lambda x:x["probability"],
        reverse=True
    )

    candidates = candidates[:5]

    # ===================================
    # FERTILIZER
    # ===================================

    crop_encoded = crop_encoder.transform(
        [crop_name]
    )[0]

    fert_features = crop_features.copy()

    fert_features["Crop_Encoded"] = crop_encoded

    fert_pred = fert_model.predict(
        fert_features
    )[0]

    fertilizer = fert_encoder.inverse_transform(
        [fert_pred]
    )[0]

    # ===================================
    # ORGANIC SOLUTIONS
    # ===================================

    organic_en = {
        "Urea":
            "Use vermicompost, cow dung compost and jeevamrut.",
        "DAP":
            "Use bone meal, phosphate rich compost and FYM.",
        "10-26-26":
            "Use compost plus wood ash.",
        "17-17-17":
            "Use vermicompost and biofertilizers.",
        "20-20":
            "Use farmyard manure and organic compost.",
        "28-28":
            "Use phosphate rich organic manure.",
        "14-35-14":
            "Use bone meal and organic phosphorus sources."
    }

    organic_mr = {
        "Urea":
            "शेणखत, गांडूळखत व जीवामृत वापरा.",
        "DAP":
            "हाडखत, सेंद्रिय फॉस्फरस व शेणखत वापरा.",
        "10-26-26":
            "कंपोस्ट व लाकडाची राख वापरा.",
        "17-17-17":
            "गांडूळखत व जैवखते वापरा.",
        "20-20":
            "शेणखत व सेंद्रिय कंपोस्ट वापरा.",
        "28-28":
            "सेंद्रिय फॉस्फरसयुक्त खत वापरा.",
        "14-35-14":
            "हाडखत व सेंद्रिय फॉस्फरस स्रोत वापरा."
    }

    steps_mr, weather_snapshot = farming_steps_mr(
        crop_name,
        wx_flat
    )

    return jsonify({

        "ok": True,

        "recommended_crop":
            crop_name,

        "recommended_fertilizer":
            fertilizer,

        "organic_solution_en":
            organic_en.get(
                fertilizer,
                "Use compost and biofertilizers."
            ),

        "organic_solution_mr":
            organic_mr.get(
                fertilizer,
                "सेंद्रिय कंपोस्ट व जैवखते वापरा."
            ),

        "maharashtra_candidates":
            candidates,

        "weather_live":
            wx_flat.get("live"),

        "weather_city":
            wx_flat.get("city"),

        "farming_steps_mr":
            steps_mr,

        "weather_snapshot":
            weather_snapshot,

        "hint_mr":
            "AI आधारित पीक व खत शिफारस",

        "hint_en":
            "AI based crop and fertilizer recommendation"
    })

@bp.post("/predict-yield")
def predict_yield_route():

    body = request.get_json(force=True, silent=True) or {}

    crop = body.get("crop")

    try:
        payload = {
            "N": float(body["N"]),
            "P": float(body["P"]),
            "K": float(body["K"]),
            "pH": float(body["pH"]),
            "rain_mm": float(body["rain_mm"]),
            "area_ha": float(body["area_ha"]),
            "crop": str(crop).strip(),
        }

    except (KeyError, TypeError, ValueError):

        return jsonify({
            "ok": False,
            "error": "N, P, K, pH, rain_mm, area_ha, crop required"
        }), 400

    try:
        yhat = predict_yield(payload)

    except ValueError as e:

        return jsonify({
            "ok": False,
            "error": str(e)
        }), 400

    crop = payload["crop"]

    area_ha = float(payload["area_ha"])

    per_ha = round(float(yhat), 3)

    total_quintals = round(
        per_ha * area_ha,
        3
    )

    market = get_market_price(crop)

    avg_price = market["avg_price"] if market else 0
    max_price = market["max_price"] if market else 0
    min_price = market["min_price"] if market else 0

    total_kg = round(
        total_quintals * 100.0,
        1
    )

    TRACTOR_COST_PER_HA = {
        "cotton": 3000,
        "sugarcane": 5000,
        "rice": 3500,
        "maize": 2500,
        "wheat": 2500,
        "soybean": 2500,
    }

    LABOUR_COST_PER_HA = {
        "cotton": 7000,
        "sugarcane": 10000,
        "rice": 6000,
        "maize": 4000,
        "wheat": 3500,
        "soybean": 3500,
    }

    gross_income = round(
        total_kg * avg_price,
        2
    )

    tractor_cost = round(
        TRACTOR_COST_PER_HA.get(
            crop.lower(),
            3000
        ) * area_ha,
        2
    )

    labour_cost = round(
        LABOUR_COST_PER_HA.get(
            crop.lower(),
            4000
        ) * area_ha,
        2
    )

    net_profit = round(
        gross_income
        - tractor_cost
        - labour_cost,
        2
    )

    return jsonify({
        "ok": True,

        "crop": crop,

        "yield_quintals_per_hectare": per_ha,

        "farm_area_hectares": area_ha,

        "estimated_total_quintals_for_farm":
            total_quintals,

        "estimated_total_kg_for_farm":
            total_kg,

        "market_price": {
            "average_price_per_kg": avg_price,
            "highest_price_per_kg": max_price,
            "lowest_price_per_kg": min_price
        },

        "gross_income":
            gross_income,

        "tractor_cost":
            tractor_cost,

        "labour_cost":
            labour_cost,

        "estimated_net_profit":
            net_profit
    })