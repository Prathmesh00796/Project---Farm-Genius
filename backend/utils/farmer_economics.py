# Indicative ₹ per quintal for rough sale planning (not MSP / mandi rate).
PRICE_RS_PER_quintal = {
    "Cotton": (5800.0, 8500.0),
    "Sugarcane": (260.0, 340.0),
    "Rice": (1700.0, 2600.0),
    "Maize": (1500.0, 2300.0),
    "Wheat": (1900.0, 2700.0),
    "Soybean": (4300.0, 5700.0),
}

SALE_NOTE_MR = "ही रक्कम फक्त साधारण उदाहरणाचे दर आणि तुमच्या दिलेल्या उत्पादन अंदाजावर आधारित आहे — विक्रीवेळीचा भाव बदलू शकतो."
SALE_NOTE_EN = "Rough example only — real prices change with mandi timing and grade."


 # Estimate sale price range for a crop.
def quintals_to_sale_range_rs(crop: str, total_quintals: float) -> dict:
    low, high = PRICE_RS_PER_quintal.get(crop, (1500.0, 2800.0))
    tq = max(0.0, float(total_quintals))
    return {
        "rs_per_quintal_low": low,
        "rs_per_quintal_high": high,
        "estimated_sale_inr_low": int(round(tq * low)),
        "estimated_sale_inr_high": int(round(tq * high)),
        "note_mr": SALE_NOTE_MR,
        "note_en": SALE_NOTE_EN,
    }
