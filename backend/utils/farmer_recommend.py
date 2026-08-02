from __future__ import annotations

# Simple Marathi steps + cues from dashboard-style weather payloads.

STEPS_MR: dict[str, list[str]] = {
    "Cotton": [
        "नांगरणी आणि कल्पस घेऊन माती खोलीत करा.",
        "स्वच्छ बियाणे व योग्य अंतरावर रोपण करा.",
        "नत्र‑स्फुरद‑पालाश संतुलित द्या आणि पाने व टिव्ह्यांना ताण पडू न द्या.",
        "नियमित निरक्षण — गुलाबी व हिरवा घुटमुंड, पाने कुरतडणारे रोग वेळीच व्यवस्थापित करा.",
        "ओला व कोरडा प्राप्त फरकाने साठवा व विक्री व्यवस्थित करा.",
    ],
    "Sugarcane": [
        "पाणी निचरा सुलभ आणि सेंद्रिय पदार्थाने जमीन सज्ज करा.",
        "चांगल्या जातीच्या रोपणात / खोड तुकड्यांचे योग्य अंतर ठेवा.",
        "वेळेवर खत व पाने कमी करून खोड मजबुत ठेवा.",
        "उकळ, पोपट व पाने कुळवणारे रोग नियमित बघा.",
        "तोडणी कारखाना किंवा बाजार वेळेनुसार आखा.",
    ],
    "Rice": [
        "नर्सरी मजबुत करून वेळेवर रोपण करा.",
        "पाण्याचा पातळ टप्पा ठेवा; लागल्यास थोडक्यातला SRIही विचारात घ्या.",
        "नत्र तुकड्यात आणि वेळेवर द्या; तण कमी ठेवा.",
        "शेंग आणि पाने येणारे रोग व कीड तपाशा.",
        "भुस काळजीपूर्वक वाळवा आणि विक्रीसाठी स्वच्छ ठेवा.",
    ],
    "Maize": [
        "मातीवर स्थिर स्थिती — नागवण व रोपण वेळ ठरवून करा.",
        "घनता आणि जात हंगामाशी जुळावी.",
        "खत डोळ्यात आणि पाने पिवळी होऊ न द्या.",
        "शेंगा व पाने खाणारी कीड आणि रोग नियमित टोहली.",
        "दाणे पिकले की वेळीच तोडणी आणि सुके साठवा.",
    ],
    "Wheat": [
        "सिंचित/कोरट पद्धती निवडून वेळेवर विलंब न करता पेरण.",
        "नत्र आणि वर्षानुसार खत पुस्तकांनुसार पाळावे.",
        "गवत नियोजित नियंत्रण आणि पाणी योग्य ठेवा.",
        "पावडरी आणि पाने जळणारे आजार डोळ्यात.",
        "स्वच्छ दाणे वेळोवेळी काढून वाजव्या बाजारसाठी घ्या.",
    ],
    "Soybean": [
        "बियाणे राइझोबियमसह उपचारीत करा आणि अंतर ठेवा.",
        "नत्र अतिरेक आणि दुहेरी फवार्नी टाळा जेणेकरून वाढ स्थिर होईल.",
        "दुहेरी आणि रोग टाळण्याची दक्षता.",
        "भुंडी व पोपट डोळ्यात आणि वेळीच कारवाई करा.",
        "पाने गळल्याशिवाय उपटू नका — पुरेशी कोरटेपणाला व्हा आणि मगच विक्री.",
    ],
}


 # Normalize fetch_weather payload to flat observation dict.
def weather_from_fetch(fetch):
    """Normalize `fetch_weather` payload to flat observation dict."""
    if not isinstance(fetch, dict):
        return {}
    if fetch.get("mock"):
        return dict(fetch.get("data") or {})
    return {k: v for k, v in fetch.items() if k not in {"mock", "error"}}


 # Create a summary weather line in Marathi.
def weather_line_mr(wx: dict):
    rains = wx.get("rain_forecast_daily_mm") or []
    if not isinstance(rains, list):
        rains = []

    rains_2 = sum(float(r or 0) for r in rains[:2])
    rains_5 = sum(float(r or 0) for r in rains[:5])

    t_now = wx.get("temperature_c")
    hum = wx.get("humidity_percent")

    city = (wx.get("city") or "").strip()

    wind = wx.get("wind_speed_ms")
    parts = []

    if city:
        parts.append(city)

    if t_now is not None:

        try:
            parts.append(f"आता सुमारे {float(t_now):.1f} °C.")
        except (TypeError, ValueError):
            pass

    if hum is not None:

        try:
            parts.append(f"आर्द्रता सुमारे {int(round(float(hum)))} %.")
        except (TypeError, ValueError):
            pass

    if rains_2 > 0.1:
        parts.append(f"पुढच्या दोन दिवसांत सुमारे {rains_2:.1f} मिमी पावसाचा अंदाज.")

    elif len(rains) >= 5:
        parts.append(f"आठवड्यात एकूण सुमारे {rains_5:.1f} मिमी पाण्याची शक्यता.")

    if isinstance(wind, (int, float)) and wind >= 8:
        parts.append("वारा जोर असल्यास फवाश्या शांत वेळीच घ्या.")

    snapshot = {
        "city": city or None,
        "temperature_c_now": t_now,
        "humidity_percent_now": hum,
        "rain_next_2d_mm": round(rains_2, 1),
        "rain_next_5d_mm": round(rains_5, 1),
        "live": bool(wx.get("live")),
    }

    text = (" ".join(parts)).strip()

    line = ""

    if text:
        suffix = ""

        if city:
            suffix = " — हा भागीय अंदाज आहे."

        line = text + suffix

    return line, snapshot


 # Give extra weather-based tips for a crop in Marathi.
def weather_tail_mr(crop: str, wx: dict) -> str:
    if not isinstance(wx, dict) or not wx:
        return ""

    rains = wx.get("rain_forecast_daily_mm") or []

    if not isinstance(rains, list):
        rains = []

    rains_2 = sum(float(r or 0) for r in rains[:2])

    tips = []

    if rains_2 > 20:

        tips.append("पाऊस जास्त असेल तर पाने कोरटी होईपर्यंत फवारणी पुढे ठेवा आणि पाने मोकळी ठेवा.")

    elif rains_2 < 0.8 and rains and len(rains) >= 3:

        tips.append("पाणी थोडे असेल तर सिंचन व टप्प्याने खत व्यवस्थित द्या.")

    try:

        t_now = wx.get("temperature_c")

        if t_now is not None and float(t_now) >= 37:

            tips.append(
                "उष्णतेत फवारणी आणि पिकाला जळजळ टाळा — संध्याकाळ उपयुक्त होते."

            )

    except (TypeError, ValueError):

        pass

    if crop == "Sugarcane":

        try:

            hm = wx.get("humidity_percent")

            if hm is not None and float(hm) >= 82:

                tips.append("आर्द्रता जास्त — कुज व पोपट डोळ्यात ठेवा.")

        except (TypeError, ValueError):

            pass

    return " ".join(tips).strip()


 # Get farming steps for a crop, including weather and tips.
def farming_steps_mr(crop: str, wx: dict | None):
    wx = wx or {}
    steps = []
    line, snapshot = weather_line_mr(wx)

    if line:

        steps.append(line)

    else:

        snapshot = snapshot or {}

    steps.extend(STEPS_MR.get(crop, STEPS_MR["Wheat"]))

    tail = weather_tail_mr(crop, wx)

    if tail:
        steps.append(tail)

    return steps, snapshot
