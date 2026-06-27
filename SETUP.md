# Farm Genius — setup (Maharashtra)

## Prerequisites

- Python **3.10+** recommended (TensorFlow wheels vary by OS)
- **Node.js 20+**
- Copy your trained **`model.h5`** beside `backend/app.py` (same folder as this backend entry file)

### OpenWeatherMap (real-time weather)

1. Create a free API key at [OpenWeatherMap](https://openweathermap.org/).
2. Copy `.env.example` to `.env` at the repo root (or inside `backend/`) and set **`OPENWEATHER_API_KEY`**.
3. Restart Flask. The dashboard shows a **live** badge once data is retrieved; without a key you only see the demo row with a tip in Marathi/English.

Optional: if your leaf model was trained with **pixel ÷ 255** only (no ImageNet scaling), set **`FG_DISEASE_PREPROCESS=raw255`** alongside the API key section in `.env`.

## Backend (Flask)

```powershell
cd c:\Users\Prem\Desktop\farma
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
cd backend
python app.py
```

The API listens on `http://127.0.0.1:5000`. On first boot, SQLite is created at `database/farm_genius.sqlite3` and scikit pickles are cached under `backend/models_pickles/`.

### Matching `labels.json` to `model.h5`

See `backend/README_MODEL.md`. **Class order must match your softmax.**

## Frontend (Vite)

```powershell
cd c:\Users\Prem\Desktop\farma\frontend
copy .env.example .env    # optional: set VITE_API_URL
npm run dev
```

Production build:

```powershell
npm run build
npm run preview
```

## API summary

| Method | Path | Notes |
|--------|------|-------|
| POST | `/predict-disease` | multipart field `image`; query `lang=en|mr` |
| POST | `/recommend-crop` | JSON N,P,K,pH,moisture |
| POST | `/predict-yield` | JSON + crop in whitelist |
| GET | `/weather` | `?city=Pune` |
| POST | `/add-crop` | farmer JWT |
| GET | `/marketplace` | public |
| POST | `/login` | JSON email, password |
| POST | `/register` | JSON email, password, full_name, role |

Maharashtra crop whitelist everywhere: **Cotton, Sugarcane, Rice, Maize, Wheat, Soybean**.
