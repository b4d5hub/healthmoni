"""
=============================================================
  AI-Based Health Monitoring System — Flask API
=============================================================
  Endpoints :

  GET  /health              → API status check
  GET  /classes             → List of all possible labels

  POST /predict             → Single reading classification
  POST /predict/trend       → Risk prediction from last 10 readings
  POST /predict/batch       → Batch predictions (up to 100)

  Request examples are shown in the docstring of each endpoint.
=============================================================
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import pickle
import numpy as np
import os
from datetime import datetime

# ─────────────────────────────────────────────
# LOAD ALL MODELS AT STARTUP
# ─────────────────────────────────────────────

app = Flask(__name__)
CORS(app)

REQUIRED_FILES = {
    "health_model.pkl":   "Classifier model",
    "label_encoder.pkl":  "Label encoder",
    "trend_model.pkl":    "Trend risk model",
    "trend_encoder.pkl":  "Trend risk encoder",
    "iso_forest.pkl":     "Isolation Forest",
}

for fname, label in REQUIRED_FILES.items():
    if not os.path.exists(fname):
        raise FileNotFoundError(
            f"Missing : {fname} ({label}). Run python train_model.py first."
        )

with open("health_model.pkl",  "rb") as f: model         = pickle.load(f)
with open("label_encoder.pkl", "rb") as f: label_encoder = pickle.load(f)
with open("trend_model.pkl",   "rb") as f: trend_model   = pickle.load(f)
with open("trend_encoder.pkl", "rb") as f: trend_encoder = pickle.load(f)
with open("iso_forest.pkl",    "rb") as f: iso_forest    = pickle.load(f)

print("[OK] All models loaded successfully.")

# ─────────────────────────────────────────────
# CONSTANTS
# ─────────────────────────────────────────────

FEATURES      = ["heart_rate_bpm", "body_temperature_c", "spo2_percent"]
WINDOW_SIZE   = 10

# 16 trend features (4 stats × 3 sensors) — must match train_model.py
TREND_FEATURES = [
    f"{feat}_{stat}"
    for feat in FEATURES
    for stat in ["slope", "mean", "std", "last"]
]

# Severity mapping for the classifier
SEVERITY_MAP = {
    "Normal":      "low",
    "Fever":       "medium",
    "Bradycardia": "medium",
    "Tachycardia": "medium",
    "Critical":    "high",
}

# Hard medical thresholds — rule-based safety net
ALERT_RULES = {
    "heart_rate_bpm":    {"min": 40,   "max": 180,  "msg": "Heart rate out of safe range"},
    "body_temperature_c":{"min": 35.0, "max": 40.0, "msg": "Body temperature abnormal"},
    "spo2_percent":      {"min": 88.0, "max": 100.0,"msg": "Critical SpO2 — hypoxia risk"},
}

# ─────────────────────────────────────────────
# UTILITIES
# ─────────────────────────────────────────────

def validate_input(data: dict) -> tuple:
    """Check all features are present and numeric."""
    for feat in FEATURES:
        if feat not in data:
            return False, f"Missing field : '{feat}'"
        try:
            val = float(data[feat])
            if np.isnan(val) or np.isinf(val):
                return False, f"Invalid value for '{feat}' : {data[feat]}"
        except (TypeError, ValueError):
            return False, f"'{feat}' must be a number, got : {data[feat]}"
    return True, ""


def check_alerts(data: dict) -> list:
    """Generate alerts when values cross medical thresholds."""
    alerts = []
    for feat, rules in ALERT_RULES.items():
        val = float(data[feat])
        if val < rules["min"] or val > rules["max"]:
            alerts.append(f"{rules['msg']} ({feat} = {val})")
    return alerts


def predict_single(data: dict) -> dict:
    """Run Model 1 — single measurement classification."""
    X          = np.array([[float(data[feat]) for feat in FEATURES]])
    label_idx  = model.predict(X)[0]
    proba      = model.predict_proba(X)[0]
    label_name = label_encoder.inverse_transform([label_idx])[0]
    confidence = float(proba[label_idx])

    top3 = sorted(
        [
            {
                "class":       label_encoder.inverse_transform([i])[0],
                "probability": round(float(p), 4),
            }
            for i, p in enumerate(proba)
        ],
        key=lambda x: -x["probability"],
    )[:3]

    return {
        "prediction":   label_name,
        "confidence":   round(confidence, 4),
        "severity":     SEVERITY_MAP.get(label_name, "unknown"),
        "top3":         top3,
        "alerts":       check_alerts(data),
        "timestamp":    datetime.utcnow().isoformat() + "Z",
        "input_values": {feat: float(data[feat]) for feat in FEATURES},
    }


def compute_trend_features(readings: list) -> np.ndarray:
    """
    From a list of 10 dicts (each with the 3 sensor values),
    compute the 12 trend features used by Model 2 and Model 3.
    """
    feats = []
    x = np.arange(len(readings))
    for feat in FEATURES:
        vals  = np.array([float(r[feat]) for r in readings])
        slope = np.polyfit(x, vals, 1)[0]
        feats.extend([slope, vals.mean(), vals.std(), vals[-1]])
    return np.array(feats).reshape(1, -1)


# ─────────────────────────────────────────────
# ENDPOINTS
# ─────────────────────────────────────────────

@app.route("/health", methods=["GET"])
def health_check():
    """API status — quick ping to verify the server is running."""
    return jsonify({
        "status":        "ok",
        "models_loaded": True,
        "endpoints": [
            "POST /predict",
            "POST /predict/trend",
            "POST /predict/batch",
            "GET  /classes",
        ],
    })


@app.route("/classes", methods=["GET"])
def get_classes():
    """Returns all possible prediction classes and risk levels."""
    descriptions = {
        "Normal":      "Heart rate and temperature within normal range",
        "Fever":       "Elevated body temperature detected",
        "Bradycardia": "Heart rate too low (< 60 bpm)",
        "Tachycardia": "Heart rate too high (> 100 bpm)",
        "Critical":    "Critical state — immediate medical attention required",
    }
    return jsonify({
        "classifier_classes": [
            {"name": c, "severity": SEVERITY_MAP[c], "description": descriptions[c]}
            for c in label_encoder.classes_
        ],
        "risk_levels": list(trend_encoder.classes_),
    })


@app.route("/predict", methods=["POST"])
def predict():
    """
    MODEL 1 — Classify a single health measurement.

    Body JSON :
    {
        "heart_rate_bpm": 110,
        "body_temperature_c": 38.9,
        "spo2_percent": 94.0,
    }

    Response :
    {
        "prediction": "Tachycardia",
        "confidence": 0.97,
        "severity": "medium",
        "top3": [...],
        "alerts": [...],
        "timestamp": "...",
        "input_values": {...}
    }
    """
    data = request.get_json()
    if not data:
        return jsonify({"error": "Empty or missing JSON body"}), 400

    is_valid, error_msg = validate_input(data)
    if not is_valid:
        return jsonify({"error": error_msg}), 422

    return jsonify(predict_single(data)), 200


@app.route("/predict/trend", methods=["POST"])
def predict_trend():
    """
    MODEL 2 + MODEL 3 — Analyze the last 10 readings to detect
    health trends and predict risk level.

    Body JSON :
    {
        "readings": [
            {"heart_rate_bpm": 80, "body_temperature_c": 37.0, "spo2_percent": 97},
            {"heart_rate_bpm": 83, "body_temperature_c": 37.1, "spo2_percent": 97},
            ... (10 readings total)
        ]
    }

    Response :
    {
        "risk_level": "medium",
        "risk_confidence": 0.89,
        "risk_probabilities": {"high": 0.05, "low": 0.06, "medium": 0.89},
        "anomaly_detected": false,
        "anomaly_score": 0.12,
        "trends": {
            "heart_rate_bpm":    {"slope": +2.5,  "direction": "increasing", "mean": 88.0},
            "body_temperature_c":{"slope": +0.05, "direction": "stable",     "mean": 37.2},
            "spo2_percent":      {"slope": -0.3,  "direction": "decreasing", "mean": 96.1},
        },
        "warning_signs": ["Heart rate is gradually increasing"],
        "timestamp": "..."
    }
    """
    data = request.get_json()
    if not data or "readings" not in data:
        return jsonify({"error": "'readings' field is required"}), 400

    readings = data["readings"]

    # Validate window size
    if not isinstance(readings, list):
        return jsonify({"error": "'readings' must be a list"}), 422
    if len(readings) != WINDOW_SIZE:
        return jsonify({
            "error": f"Exactly {WINDOW_SIZE} readings required, got {len(readings)}"
        }), 422

    # Validate each reading
    for i, reading in enumerate(readings):
        is_valid, error_msg = validate_input(reading)
        if not is_valid:
            return jsonify({"error": f"Reading {i}: {error_msg}"}), 422

    # Compute 16 trend features
    trend_feats = compute_trend_features(readings)

    # ── Model 2 : Risk prediction ──
    risk_idx     = trend_model.predict(trend_feats)[0]
    risk_proba   = trend_model.predict_proba(trend_feats)[0]
    risk_label   = trend_encoder.inverse_transform([risk_idx])[0]
    risk_conf    = float(risk_proba[risk_idx])
    risk_proba_d = {
        cls: round(float(p), 4)
        for cls, p in zip(trend_encoder.classes_, risk_proba)
    }

    # ── Model 3 : Anomaly detection ──
    iso_flag     = iso_forest.predict(trend_feats)[0]      # -1=anomaly, 1=normal
    iso_score    = float(iso_forest.decision_function(trend_feats)[0])
    anomaly_det  = bool(iso_flag == -1)

    # ── Trend analysis per feature ──
    x = np.arange(WINDOW_SIZE)
    trends = {}
    warning_signs = []

    for feat in FEATURES:
        vals  = np.array([float(r[feat]) for r in readings])
        slope = np.polyfit(x, vals, 1)[0]

        # Direction label
        if slope > 0.5:
            direction = "increasing"
        elif slope < -0.5:
            direction = "decreasing"
        else:
            direction = "stable"

        trends[feat] = {
            "slope":     round(float(slope), 4),
            "direction": direction,
            "mean":      round(float(vals.mean()), 2),
            "last":      round(float(vals[-1]), 2),
        }

        # Generate human-readable warning signs
        if feat == "heart_rate_bpm" and direction == "increasing" and vals[-1] > 90:
            warning_signs.append("Heart rate is gradually increasing")
        if feat == "heart_rate_bpm" and direction == "decreasing" and vals[-1] < 65:
            warning_signs.append("Heart rate is gradually decreasing")
        if feat == "body_temperature_c" and direction == "increasing" and vals[-1] > 37.5:
            warning_signs.append("Body temperature is rising — possible early fever")
        if feat == "spo2_percent" and direction == "decreasing" and vals[-1] < 95:
            warning_signs.append("SpO2 is dropping — monitor closely")

    if anomaly_det:
        warning_signs.append("Unusual pattern detected in the last 10 readings")

    return jsonify({
        "risk_level":          risk_label,
        "risk_confidence":     round(risk_conf, 4),
        "risk_probabilities":  risk_proba_d,
        "anomaly_detected":    anomaly_det,
        "anomaly_score":       round(iso_score, 4),
        "trends":              trends,
        "warning_signs":       warning_signs,
        "readings_analyzed":   WINDOW_SIZE,
        "timestamp":           datetime.utcnow().isoformat() + "Z",
    }), 200


@app.route("/predict/batch", methods=["POST"])
def predict_batch():
    """
    MODEL 1 — Batch classification for multiple single readings.
    Maximum 100 readings per request.

    Body JSON :
    {
        "measurements": [
            {"heart_rate_bpm": 85, "body_temperature_c": 36.6, "spo2_percent": 97},
            {"heart_rate_bpm": 120, "body_temperature_c": 38.9, "spo2_percent": 94}
        ]
    }
    """
    data = request.get_json()
    if not data or "measurements" not in data:
        return jsonify({"error": "'measurements' field is required"}), 400

    measurements = data["measurements"]
    if not isinstance(measurements, list) or len(measurements) == 0:
        return jsonify({"error": "'measurements' must be a non-empty list"}), 422
    if len(measurements) > 100:
        return jsonify({"error": "Maximum 100 measurements per batch request"}), 422

    results = []
    for i, m in enumerate(measurements):
        is_valid, error_msg = validate_input(m)
        if not is_valid:
            results.append({"index": i, "error": error_msg})
        else:
            result = predict_single(m)
            result["index"] = i
            results.append(result)

    return jsonify({"count": len(results), "results": results}), 200


# ─────────────────────────────────────────────
# START
# ─────────────────────────────────────────────

if __name__ == "__main__":
    print("=" * 60)
    print("  Health Monitoring AI — Flask API")
    print("  http://localhost:5000")
    print("=" * 60)
    app.run(debug=False, host="0.0.0.0", port=5000)
