"""
Maharashtra crop disease inference.
Env: FG_DISEASE_PREPROCESS=mobilenet (default) | raw255
"""
from __future__ import annotations

import json
import os
import re
from io import BytesIO
from pathlib import Path

import numpy as np
from PIL import Image

CONFIG = Path(__file__).resolve().parents[1] / "config" / "labels.json"
ADVICE = Path(__file__).resolve().parents[1] / "config" / "advice_pack.json"

# If advice_pack.json fails to load, we still show farmer-friendly Marathi titles (not "Wheat Healthy").
MR_TITLE_FALLBACK = {
    "cotton_bacterial_leaf_blight": "कापूस — जीवाणूजन्य पान काळे सदृश",
    "cotton_leaf_curl_virus": "कापूस — कोळी / वेलची पाने",
    "cotton_healthy": "कापूस निरोगी दिसतो",
    "sugarcane_red_rot": "ऊस — लाल सड / रेड रॉट सदृश",
    "sugarcane_rust": "ऊस — रस्ट / गंजण्याचे डाग",
    "sugarcane_healthy": "ऊस निरोगी दिसतो",
    "rice_blast": "भात — धान ब्लास्ट सदृश",
    "rice_brown_spot": "भात — ब्राउन स्पॉट सदृश",
    "rice_healthy": "भात निरोगी दिसतो",
    "maize_rust": "मका — रस्ट सदृश",
    "maize_gray_leaf_spot": "मका — ग्रे लीफ स्पॉट सदृश",
    "maize_healthy": "मका निरोगी दिसतो",
    "wheat_stripe_rust": "गहू — पिवळा / पट्ट्यासारखा रस्ट",
    "wheat_septoria": "गहू — सेप्टोरिया सदृश डाग",
    "wheat_healthy": "गहू निरोगी दिसतो",
    "soybean_frog_eye_leaf_spot": "सोयाबीन — फ्रॉग आय सदृश डाग",
    "soybean_bacterial_blight": "सोयाबीन — जीवाणूजन्य डाग",
    "soybean_healthy": "सोयाबीन निरोगी दिसते",
}


 # Load and return JSON data from a file.
def _load_json(path: Path):
    with open(path, "r", encoding="utf-8-sig") as f:
        return json.load(f)


 # Load disease label config from file.
def _load_label_config():
    return _load_json(CONFIG)


 # Load advice data from file, return empty if error.
def _load_advice():
    try:
        return _load_json(ADVICE)
    except OSError:
        return {}
    except json.JSONDecodeError:
        return {}


 # Make class name readable (e.g., "cotton_blight" → "Cotton Blight").
def humanize_class(raw: str) -> str:
    return raw.replace("_", " ").title()


# Must match labels.json class_name prefixes (first segment before _).
_CROP_ALIAS = {
    "cotton": "cotton",
    "kapus": "cotton",
    "kapoos": "cotton",
    "sugarcane": "sugarcane",
    "sugar cane": "sugarcane",
    "sugarcan": "sugarcane",
    "us": "sugarcane",
    "oos": "sugarcane",
    "rice": "rice",
    "paddy": "rice",
    "dhaan": "rice",
    "dhaanya": "rice",
    "bhath": "rice",
    "maize": "maize",
    "makaa": "maize",
    "corn": "maize",
    "wheat": "wheat",
    "gehu": "wheat",
    "soybean": "soybean",
    "soya": "soybean",
}


 # Convert crop name to standard key (e.g., "kapus" → "cotton").
def normalize_crop_focus_key(raw: str | None) -> str | None:
    """Return canonical crop key (e.g. sugarcane) or None."""
    if raw is None:
        return None
    s = str(raw).strip().lower()
    if not s:
        return None
    s = re.sub(r"\s+", " ", s)
    if s in _CROP_ALIAS:
        return _CROP_ALIAS[s]
    head = s.split("_", 1)[0].split(" ", 1)[0]
    if head in _CROP_ALIAS:
        return _CROP_ALIAS[head]
    # Title-case UI labels: Cotton, Sugarcane, ...
    simple = s.replace("-", " ").strip()
    if simple in _CROP_ALIAS:
        return _CROP_ALIAS[simple]
    cand = simple.replace(" ", "")
    if cand in _CROP_ALIAS:
        return _CROP_ALIAS[cand]
    return None


 # Add underscore to crop key (e.g., "cotton" → "cotton_").
def prefix_for_crop_key(key: str | None) -> str | None:
    if not key:
        return None
    return f"{key}_"


 # Filter predictions to only one crop, re-normalize.
def apply_crop_focus(labels: list[str], probs: np.ndarray, crop_focus: str | None):
    """
    Restrict softmax to classes belonging to one crop, then re-normalize.
    Never fall back to the global 18-class vector — if the model puts ~0 mass on that crop,
    falling back would show Rice/Sugarcane while the farmer picked Cotton.
    """
    ck = normalize_crop_focus_key(crop_focus)
    pref = prefix_for_crop_key(ck)
    if pref is None:
        return probs.astype(np.float64), None, None

    mask = np.array([str(lab).startswith(pref) for lab in labels], dtype=np.float64)
    p = probs.astype(np.float64) * mask
    # Tiny floor on allowed indices only → always a valid distribution inside this crop.
    eps = float(os.environ.get("FG_CROP_FOCUS_EPS", "1e-10"))
    p = p + eps * mask
    tot = float(p.sum())
    if tot <= 0:
        p = mask / max(float(mask.sum()), 1.0)
        tot = float(p.sum())
    normed = p / tot
    note_mr = (
        "तुम्ही निवडलेल्या पिकासाठी फक्त त्या पिकाच्या रोगांचीच तुलना केली आहे — "
        "इतर पिकांना येथे विचारात घेतले नाही."
    )
    note_en = "Only diseases for your selected crop were compared — other crops are ignored."
    return normed, (note_mr, note_en), ck


 # Prepare image for model prediction.
def preprocess_image(image_bytes: bytes) -> np.ndarray:
    img = Image.open(BytesIO(image_bytes)).convert("RGB")
    img = img.resize((224, 224), Image.Resampling.BILINEAR)
    arr = np.asarray(img, dtype=np.float32)
    batch = np.expand_dims(arr, axis=0)
    mode = os.environ.get("FG_DISEASE_PREPROCESS", "mobilenet").strip().lower()
    if mode in ("raw", "raw255", "0_1"):
        return batch / 255.0
    try:
        from tensorflow.keras.applications.mobilenet_v2 import preprocess_input as mn_prep

        return mn_prep(batch)
    except Exception:
        return batch / 255.0


 # Make sure advice sections are never empty.
def _ensure_upay_blocks(class_key: str, tip: dict, summary_mr: str, summary_en: str) -> dict:
    """Never return empty organic/chemical/immediate — farmers always see उपाय."""
    om = (tip.get("organic_mr") or "").strip()
    oe = (tip.get("organic_en") or "").strip()
    im = (tip.get("inorganic_mr") or "").strip()
    ie = (tip.get("inorganic_en") or "").strip()
    nm = (tip.get("immediate_mr") or "").strip()
    ne = (tip.get("immediate_en") or "").strip()

    base_mr = summary_mr or "या लक्षणांसाठी स्थानिक केव्हीके / कृषी अधिकाऱ्याशी तात्काळ संपर्क साधा."
    base_en = summary_en or "Contact KVK or extension officer with leaf samples."

    if not om:
        om = (
            "जैविक दिशा: सेंद्रिय कंपोस्ट, जैविक ट्रायकोडर्मा, फेरपालट, तण नियंत्रण आणि हवा/पाणी व्यवस्थापन प्राधान्य. "
            "पाने जास्त वेळ ओले राहू नयेत.\n\n"
            + base_mr
        )
    if not oe:
        oe = (
            "Organic route: compost, biocontrol where advised, rotation, weed control, airflow & water timing.\n\n" + base_en
        )
    if not im:
        im = (
            "अजैविक (रासायनिक) उपाय फक्त मान्यता प्राप्त औषधांनी आणि केव्हीके / जिल्हा घोषणेनुसारच घ्या — डोस पुस्तक वाचून मास्क घाला.\n\n"
            + base_mr
        )
    if not ie:
        ie = (
            "Chemical path: only labelled approved products at KVK timings — read label, PPE.\n\n" + base_en
        )
    if not nm:
        nm = (
            "१) आत्ताच सर्वात आजारीत पाने कापून नमुना घ्या आणि जवळच्या केव्हीकेला फोटोसह दाखवा। "
            "२) शेतातील इतर झाडांवरही डाग तपासा। ३) पुढच्या फवाश्या हवामान पत्रकाशी जुळवा।"
        )
    if not ne:
        ne = (
            "1) Sample worst leaves + photo for KVK. 2) Scout neighbouring rows. "
            "3) Plan sprays around rain/humidity windows."
        )

    return {
        "organic_mr": om,
        "organic_en": oe,
        "inorganic_mr": im,
        "inorganic_en": ie,
        "immediate_mr": nm,
        "immediate_en": ne,
    }


 # Predict disease from image using model.
def predict_with_model(model, image_bytes: bytes, lang: str = "mr", crop_focus: str | None = None):
    cfg = _load_label_config()
    advice_pack = _load_advice()
    blk = advice_pack.get("by_class") or {}
    labels = cfg["class_names"]
    te = cfg.get("treatments_en") or {}
    tm = cfg.get("treatments_mr") or {}

    x = preprocess_image(image_bytes)
    preds = []
    preds.append(np.asarray(model.predict(x, verbose=0)).flatten())

    enable_tta = os.environ.get("FG_DISEASE_TTA", "1").strip().lower() not in ("0", "false", "no", "off")
    if enable_tta:
        xf = np.flip(x, axis=2)
        preds.append(np.asarray(model.predict(xf, verbose=0)).flatten())

    probs_full = np.mean(np.stack(preds, axis=0), axis=0)
    if len(labels) != probs_full.size:
        raise ValueError(
            f"Model output size {probs_full.size} != labels.json count {len(labels)} — edit backend/config/labels.json."
        )

    probs, focus_notes, crop_key_norm = apply_crop_focus(labels, probs_full, crop_focus)
    crop_focus_note_mr = focus_notes[0] if focus_notes else ""
    crop_focus_note_en = focus_notes[1] if focus_notes else ""

    order = np.argsort(-probs)
    top_idx = int(order[0])
    second_idx = int(order[1]) if probs.size > 1 else top_idx

    class_key = labels[top_idx]
    raw_top = float(probs[top_idx])
    conf = round(raw_top * 100.0, 2)
    secondary_key = labels[second_idx]
    secondary_conf = round(float(probs[second_idx]) * 100.0, 2)

    tip = blk.get(class_key, {})
    sec_tip = blk.get(secondary_key, {})

    title_mr = tip.get("title_mr") or MR_TITLE_FALLBACK.get(class_key) or humanize_class(class_key)
    title_en = tip.get("title_en") or humanize_class(class_key)
    secondary_title_mr = sec_tip.get("title_mr") or MR_TITLE_FALLBACK.get(secondary_key) or humanize_class(
        secondary_key
    )

    summary_mr = tm.get(class_key, te.get(class_key, ""))
    summary_en = te.get(class_key, summary_mr)

    blocks = _ensure_upay_blocks(class_key, tip, summary_mr, summary_en)

    acc_mr = advice_pack.get("_accuracy_note_mr") or ""
    acc_en = advice_pack.get("_accuracy_note_en") or ""

    lng = str(lang or "mr").lower()
    treatment_primary = summary_mr if lng.startswith("mr") else summary_en

    thr = float(os.environ.get("FG_DISEASE_CONF_WARN_BELOW", "50"))
    low_confidence = conf < thr

    top_predictions = []
    for j in range(min(3, len(order))):
        idx = int(order[j])
        k = labels[idx]
        pct = round(float(probs[idx]) * 100.0, 2)
        tb = blk.get(k, {})
        top_predictions.append(
            {
                "class_key": k,
                "confidence": pct,
                "title_mr": tb.get("title_mr") or MR_TITLE_FALLBACK.get(k) or humanize_class(k),
                "title_en": tb.get("title_en") or humanize_class(k),
            }
        )

    raw_second = float(probs[second_idx]) if probs.size > 1 else raw_top
    margin = raw_top - raw_second

    low_confidence_warning_mr = ""
    low_confidence_warning_en = ""
    if low_confidence or margin < 0.12:
        low_confidence_warning_mr = (
            f"ही खात्री फक्त सुमारे {conf}% आहे — फोटोशी पुर्ण जुळणे निश्चित नाही. खालील उपाय '{title_mr}' या एका शक्यतेनुसार आहेत; "
            "दुसरीही शक्यता पहा आणि नमुना केव्हीकेला दाखवा."
        )
        low_confidence_warning_en = (
            f"Confidence is only about {conf}% — the photo may not match one disease clearly. "
            f"The steps below assume «{title_en}» — check alternatives and verify with extension staff."
        )

    alternate = None
    if secondary_key != class_key:
        alternate = {
            "class_key": secondary_key,
            "confidence": secondary_conf,
            "title_mr": secondary_title_mr,
            "title_en": sec_tip.get("title_en") or humanize_class(secondary_key),
        }

    return {
        "lang": lang,
        "crop_focus_requested": (crop_focus or "").strip() or None,
        "crop_focus_normalized": crop_key_norm,
        "crop_focus_note_mr": crop_focus_note_mr,
        "crop_focus_note_en": crop_focus_note_en,
        "class_key": class_key,
        "confidence": conf,
        "confidence_raw": raw_top,
        "low_confidence": low_confidence or margin < 0.12,
        "low_confidence_warning_mr": low_confidence_warning_mr,
        "low_confidence_warning_en": low_confidence_warning_en,
        "top_predictions": top_predictions,
        "disease": title_en,
        "disease_mr": title_mr,
        "disease_en": title_en,
        "summary_mr": summary_mr,
        "summary_en": summary_en,
        "treatment": treatment_primary,
        "organic_mr": blocks["organic_mr"],
        "organic_en": blocks["organic_en"],
        "inorganic_mr": blocks["inorganic_mr"],
        "inorganic_en": blocks["inorganic_en"],
        "immediate_mr": blocks["immediate_mr"],
        "immediate_en": blocks["immediate_en"],
        "accuracy_note_mr": acc_mr,
        "accuracy_note_en": acc_en,
        "alternate": alternate,
        "how_to_improve_accuracy_mr": (
            "फोटो स्पष्ट आणि जवळून नाही तर निकाल चुकीचे वाटू शकतील — पाने मध्य फ्रेममध्ये ठेवा, जास्त चमक टाळा आणि "
            "आजगावातील स्थानिक अधिकाऱ्याशी नमुन्यासह पुन्हा चर्चा करा."
        ),
        "how_to_improve_accuracy_en": (
            "Blurry distant photos confuse the tool — centre one affected leaf with even light, "
            "avoid harsh glare, and recheck locally with clearer samples."
        ),
    }


 # Check if model output matches expected label count.
def validate_model_output_shape(num_outputs: int) -> tuple[bool, str]:
    cfg = _load_label_config()
    expected = len(cfg["class_names"])
    ok = num_outputs == expected
    msg = ""
    if not ok:
        msg = f"Softmax outputs: {num_outputs}; labels.json: {expected}. Align before accurate predictions."
    return ok, msg
