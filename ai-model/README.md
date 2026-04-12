# AI Integration

## API URL
https://elnadaa-health-monitoring-ai.hf.space

## Endpoints

### POST /predict
Single reading classification.

Request:
{
  "heart_rate_bpm": 110,
  "body_temperature_c": 38.9,
  "spo2_percent": 97.0,
  "rmssd_ms": 0.0
}

Response:
{
  "prediction": "Tachycardia",
  "confidence": 0.97,
  "severity": "medium",
  "alerts": [...],
  "timestamp": "..."
}

### POST /predict/trend
Last 10 readings risk analysis.

Request:
{
  "readings": [
    {"heart_rate_bpm": 80, "body_temperature_c": 37.0, "spo2_percent": 97, "rmssd_ms": 40},
    ... (10 readings total)
  ]
}

Response:
{
  "risk_level": "medium",
  "anomaly_detected": false,
  "warning_signs": [...],
  "trends": {...}
}
