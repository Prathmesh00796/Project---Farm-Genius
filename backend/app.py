"""
Farm Genius API — Maharashtra-only agriculture helpers.
Run from repository root:

  cd backend && python app.py

Or: flask --app app.py run --port 5000
"""
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, jsonify
from flask_cors import CORS

from routes.auth import bp as auth_bp
from routes.market import bp as market_bp
from routes.ml_api import bp as ml_bp
from routes.weather_bp import bp as weather_bp
from utils.db import init_db
from utils.ml_models import ensure_models

# Load .env from repo root or backend/
_here = Path(__file__).resolve().parent
load_dotenv(dotenv_path=_here.parent / ".env", override=False)
load_dotenv(dotenv_path=_here / ".env", override=False)


def create_app():
    app = Flask(__name__)
    app.config["MAX_CONTENT_LENGTH"] = 15 * 1024 * 1024  # 15 MB uploads
    CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

    # Blueprints expose required paths exactly as specified
    app.register_blueprint(auth_bp, url_prefix="")
    app.register_blueprint(ml_bp, url_prefix="")
    app.register_blueprint(market_bp, url_prefix="")
    app.register_blueprint(weather_bp, url_prefix="")

    init_db()
    ensure_models()

    model_path = _here / "model.h5"
    app.disease_model = None

    try:
        if model_path.exists():
            from tensorflow.keras.models import load_model

            app.disease_model = load_model(model_path.as_posix())
            app.logger.info("Loaded disease model from %s", model_path)
        else:
            app.logger.warning("model.h5 not found — place your trained weights at %s", model_path)
    except Exception as e:
        app.logger.exception("Could not load model.h5: %s", e)
        app.disease_model = None

    @app.get("/health")
    def health():
        return jsonify(
            {
                "app": "Farm Genius",
                "region": "Maharashtra",
                "disease_model_ready": bool(getattr(app, "disease_model", None)),
            }
        )

    return app


app = create_app()

if __name__ == "__main__":
    # TensorFlow loads are heavy — disable werkzeug's import reloader so the model loads once reliably.
    app.run(host="0.0.0.0", port=5000, debug=True, use_reloader=False)
