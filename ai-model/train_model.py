"""
=============================================================
  AI-Based Health Monitoring System — Model Training
=============================================================
  Three models are trained and saved :

  MODEL 1 — Health Status Classifier
    Input  : 1 measurement (heart_rate, temperature, spo2)
    Output : Normal / Fever / Bradycardia / Tachycardia / Critical
    Files  : health_model.pkl + label_encoder.pkl

  MODEL 2 — Trend Risk Predictor
    Input  : Last 10 measurements (sliding window)
    Output : low / medium / high risk
    Files  : trend_model.pkl + trend_encoder.pkl

  MODEL 3 — Isolation Forest (Anomaly Detection)
    Input  : Trend features from last 10 measurements
    Output : normal / anomaly flag
    File   : iso_forest.pkl
=============================================================
"""

import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier, IsolationForest
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import classification_report, accuracy_score
import pickle

# ─────────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────────

DATASET_PATH         = "dataset_clean.csv"
WINDOW_SIZE          = 10

MODEL_OUTPUT         = "health_model.pkl"
ENCODER_OUTPUT       = "label_encoder.pkl"
TREND_MODEL_OUTPUT   = "trend_model.pkl"
TREND_ENCODER_OUTPUT = "trend_encoder.pkl"
ISO_FOREST_OUTPUT    = "iso_forest.pkl"

FEATURES = [
    "heart_rate_bpm",
    "body_temperature_c",
    "spo2_percent",
]
TARGET = "clinical_label"

RISK_MAP = {
    "Normal":      "low",
    "Fever":       "medium",
    "Bradycardia": "medium",
    "Tachycardia": "medium",
    "Critical":    "high",
}

# ─────────────────────────────────────────────
# LOAD DATASET
# ─────────────────────────────────────────────

print("=" * 60)
print("  HEALTH AI — Training Pipeline")
print("=" * 60)

df = pd.read_csv(DATASET_PATH)
print(f"\n[INFO] Dataset loaded : {df.shape[0]} rows, {df.shape[1]} columns")
print(f"[INFO] Class distribution :")
print(df[TARGET].value_counts().to_string())

# ─────────────────────────────────────────────
# HELPER — TREND FEATURE EXTRACTION
# ─────────────────────────────────────────────

def compute_trend_features(window_df: pd.DataFrame) -> dict:
    """
    From a window of 10 readings, computes 4 stats per feature :
      slope → is value going up or down over time ?
      mean  → average over the window
      std   → how much the value fluctuates
      last  → the most recent value
    Returns 16 features total (4 stats x 4 sensors).
    """
    feats = {}
    x = np.arange(len(window_df))
    for col in FEATURES:
        vals  = window_df[col].values.astype(float)
        slope = np.polyfit(x, vals, 1)[0]
        feats[f"{col}_slope"] = slope
        feats[f"{col}_mean"]  = vals.mean()
        feats[f"{col}_std"]   = vals.std()
        feats[f"{col}_last"]  = vals[-1]
    return feats


# ═════════════════════════════════════════════
# MODEL 1 — HEALTH STATUS CLASSIFIER
# ═════════════════════════════════════════════

print("\n" + "─" * 60)
print("  MODEL 1 — Health Status Classifier")
print("─" * 60)

X = df[FEATURES].values
y = df[TARGET].values

le = LabelEncoder()
y_encoded = le.fit_transform(y)
print(f"[INFO] Classes : {dict(enumerate(le.classes_))}")

X_train, X_test, y_train, y_test = train_test_split(
    X, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded
)

clf = RandomForestClassifier(
    n_estimators=100,
    class_weight="balanced",
    random_state=42,
    n_jobs=-1,
)
clf.fit(X_train, y_train)

y_pred = clf.predict(X_test)
acc    = accuracy_score(y_test, y_pred)
print(f"\n[RESULT] Accuracy : {acc * 100:.2f}%")
print(classification_report(y_test, y_pred, target_names=le.classes_))

cv = cross_val_score(clf, X, y_encoded, cv=5, scoring="accuracy", n_jobs=-1)
print(f"[RESULT] Cross-val 5-fold : {cv.mean()*100:.2f}% ± {cv.std()*100:.2f}%")

print(f"\n[INFO] Feature importance :")
for feat, imp in sorted(zip(FEATURES, clf.feature_importances_), key=lambda x: -x[1]):
    print(f"  {feat:<25} {imp*100:.1f}%")

with open(MODEL_OUTPUT, "wb") as f:
    pickle.dump(clf, f)
with open(ENCODER_OUTPUT, "wb") as f:
    pickle.dump(le, f)
print(f"\n[OK] Saved → {MODEL_OUTPUT}")
print(f"[OK] Saved → {ENCODER_OUTPUT}")


# ═════════════════════════════════════════════
# MODEL 2 — TREND RISK PREDICTOR
# ═════════════════════════════════════════════

print("\n" + "─" * 60)
print(f"  MODEL 2 — Trend Risk Predictor (window = {WINDOW_SIZE})")
print("─" * 60)

trend_rows   = []
trend_labels = []

for i in range(len(df) - WINDOW_SIZE):
    window     = df.iloc[i : i + WINDOW_SIZE]
    feats      = compute_trend_features(window)
    last_label = df.iloc[i + WINDOW_SIZE][TARGET]
    trend_rows.append(feats)
    trend_labels.append(RISK_MAP[last_label])

trend_df      = pd.DataFrame(trend_rows)
TREND_FEATURES = list(trend_df.columns)
y_risk        = np.array(trend_labels)

print(f"[INFO] Trend dataset    : {trend_df.shape[0]} windows of {WINDOW_SIZE} readings")
print(f"[INFO] Risk distribution: {dict(pd.Series(y_risk).value_counts())}")
print(f"[INFO] Features ({len(TREND_FEATURES)})  : {TREND_FEATURES}")

le_risk    = LabelEncoder()
y_risk_enc = le_risk.fit_transform(y_risk)
print(f"[INFO] Risk classes : {dict(enumerate(le_risk.classes_))}")

Xt_train, Xt_test, yt_train, yt_test = train_test_split(
    trend_df.values, y_risk_enc,
    test_size=0.2, random_state=42, stratify=y_risk_enc,
)

trend_clf = RandomForestClassifier(
    n_estimators=100,
    class_weight="balanced",
    random_state=42,
    n_jobs=-1,
)
trend_clf.fit(Xt_train, yt_train)

yt_pred = trend_clf.predict(Xt_test)
t_acc   = accuracy_score(yt_test, yt_pred)
print(f"\n[RESULT] Accuracy : {t_acc * 100:.2f}%")
print(classification_report(yt_test, yt_pred, target_names=le_risk.classes_))

cv_t = cross_val_score(trend_clf, trend_df.values, y_risk_enc, cv=5, scoring="accuracy", n_jobs=-1)
print(f"[RESULT] Cross-val 5-fold : {cv_t.mean()*100:.2f}% ± {cv_t.std()*100:.2f}%")

with open(TREND_MODEL_OUTPUT, "wb") as f:
    pickle.dump(trend_clf, f)
with open(TREND_ENCODER_OUTPUT, "wb") as f:
    pickle.dump(le_risk, f)
print(f"\n[OK] Saved → {TREND_MODEL_OUTPUT}")
print(f"[OK] Saved → {TREND_ENCODER_OUTPUT}")


# ═════════════════════════════════════════════
# MODEL 3 — ISOLATION FOREST (ANOMALY DETECTION)
# ═════════════════════════════════════════════

print("\n" + "─" * 60)
print("  MODEL 3 — Isolation Forest (Anomaly Detection)")
print("─" * 60)

# contamination=0.1 → expects ~10% of readings to be anomalies
iso = IsolationForest(
    n_estimators=100,
    contamination=0.1,
    random_state=42,
    n_jobs=-1,
)
iso.fit(trend_df.values)

sample_flags  = iso.predict(trend_df.values[:5])   # -1=anomaly, 1=normal
sample_scores = iso.decision_function(trend_df.values[:5])
print(f"[INFO] Sample flags  (first 5) : {sample_flags.tolist()}  (-1=anomaly, 1=normal)")
print(f"[INFO] Sample scores (first 5) : {[round(s,3) for s in sample_scores]}")

with open(ISO_FOREST_OUTPUT, "wb") as f:
    pickle.dump(iso, f)
print(f"\n[OK] Saved → {ISO_FOREST_OUTPUT}")


# ─────────────────────────────────────────────
# FINAL SUMMARY
# ─────────────────────────────────────────────

print("\n" + "=" * 60)
print("  TRAINING COMPLETE")
print("=" * 60)
print(f"  Model 1 — Classifier     : {acc*100:.2f}%  → {MODEL_OUTPUT}")
print(f"  Model 2 — Trend Risk     : {t_acc*100:.2f}%  → {TREND_MODEL_OUTPUT}")
print(f"  Model 3 — Anomaly Detect : Isolation Forest → {ISO_FOREST_OUTPUT}")
print(f"\n  Encoders : {ENCODER_OUTPUT}, {TREND_ENCODER_OUTPUT}")
print("\n[DONE] Run : python app.py to start the API ✓")
