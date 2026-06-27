# Disease model (`model.h5`)

1. Place your **MobileNetV2**-style classifier at `backend/model.h5` (next to `app.py`).
2. Open `backend/config/labels.json` and edit the `class_names` array so that **index `i` matches output neuron `i`** from your training.
3. Update `treatments_en` / `treatments_mr` with the same keys as `class_names` for farmer-facing advice.

If the softmax dimension and `class_names` length differ, `/predict-disease` returns an error until you align them.

For a quick health check: `GET http://127.0.0.1:5000/health` shows `disease_model_ready`.

### Preprocessing

By default inference uses **`mobilenet_v2.preprocess_input`**.  
If **your training script** resized to 224×224 and divided by **255 only**, set env before starting Flask:

```text
FG_DISEASE_PREPROCESS=raw255
```

Farmer-readable Marathi organic / chemical / urgent lines live in **`config/advice_pack.json`** keyed by each `class_names` entry.
