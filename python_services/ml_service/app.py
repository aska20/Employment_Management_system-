"""
Leave Prediction Service — port 5002

HYBRID MODEL (3 components):

  Component 1 — Random Forest (weight: 30%)
    Trained on 1500-record CSV dataset.
    Learns general patterns: which leave types/durations
    tend to get approved in typical HR settings.
    Feature importances shown to explain decisions.

  Component 2 — Bayesian Personal Rate (weight: 50%)
    Uses this employee's actual approve/reject history.
    Starts at industry average (65%) when no history.
    Shifts toward real rate as history grows.
    Most important component — personal behavior matters most.

  Component 3 — Rule Constraints (weight: 20%)
    Hard limits on duration by leave type.
    Caps unrealistic requests.

  Final = RF*0.30 + Bayes*0.50 + Rules*0.20

  Also shows:
    - Feature importances from RF
    - Relationship between CSV patterns and employee history
    - Confidence grows with more employee data
    - Exact breakdown of all 3 components
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
import joblib
import os
from datetime import datetime
from zoneinfo import ZoneInfo
from pymongo import MongoClient
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
from sklearn.preprocessing import StandardScaler
from functools import wraps

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

app = Flask(__name__)

ALLOWED_ORIGIN = os.environ.get("FRONTEND_URL", "http://localhost:5173")
CORS(app, origins=[ALLOWED_ORIGIN, "http://localhost:5174", "http://localhost:3000"])

MONGO_URI   = os.environ.get("MONGO_URI",     "mongodb://localhost:27017")
DB_NAME     = os.environ.get("DB_NAME",        "ems")
MODEL_PATH  = os.environ.get("MODEL_PATH",     "leave_model.pkl")
CSV_PATH    = os.environ.get("CSV_PATH",       "hr_leave_dataset.csv")
SERVICE_KEY = os.environ.get("ML_SERVICE_KEY", "ems-ml-secret-2024")
TIMEZONE    = ZoneInfo(os.environ.get("TIMEZONE", "Asia/Kathmandu"))

client = MongoClient(MONGO_URI)
db     = client[DB_NAME]

# Features used by Random Forest
RF_FEATURES = [
    "leaveType_enc",      # 0=Annual, 1=Casual, 2=Sick
    "leaveDuration",      # days requested
    "month",              # 1-12
    "dayOfWeek",          # 0=Mon, 6=Sun
    "previousLeavesTaken" # total approved leaves before
]

# Human-readable feature names
FEATURE_LABELS = {
    "leaveType_enc":       "Leave Type",
    "leaveDuration":       "Duration Requested",
    "month":               "Month of Year",
    "dayOfWeek":           "Day of Week",
    "previousLeavesTaken": "Previous Leaves Taken",
}

LT_MAP = {"Annual Leave": 0, "Casual Leave": 1, "Sick Leave": 2}
LT_REV = {0: "Annual Leave", 1: "Casual Leave", 2: "Sick Leave"}

# Duration limits per leave type
DURATION_LIMITS = {
    "Sick Leave":   {"normal": 3, "acceptable": 14, "max": 30},
    "Casual Leave": {"normal": 3, "acceptable": 7,  "max": 14},
    "Annual Leave": {"normal": 7, "acceptable": 14, "max": 21},
}

# ── Component 1: Random Forest ──────────────────────────

def train_rf_model():
    """
    Train Random Forest on CSV data only.
    CSV gives general HR patterns as a baseline.
    """
    if not os.path.exists(CSV_PATH):
        print("  CSV not found — RF component disabled")
        return None, None, None

    df = pd.read_csv(CSV_PATH)
    # CSV now contains only relevant columns:
    # leaveType, leaveDuration, month, dayOfWeek, previousLeavesTaken, status
    df["leaveType_enc"]       = df["leaveType"].map(LT_MAP).fillna(1).astype(int)
    df["target"]              = (df["status"] == "Approved").astype(int)
    df["previousLeavesTaken"] = df["previousLeavesTaken"].fillna(0).astype(int)

    X = df[RF_FEATURES]
    y = df["target"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    rf = RandomForestClassifier(
        n_estimators=300,
        max_depth=8,
        min_samples_split=10,
        min_samples_leaf=5,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1
    )
    rf.fit(X_train, y_train)

    acc = accuracy_score(y_test, rf.predict(X_test))

    # Feature importances
    importances = dict(zip(RF_FEATURES, rf.feature_importances_.tolist()))

    print(f"  RF trained on {len(df)} CSV records — accuracy: {acc*100:.1f}%")
    print(f"  Feature importances:")
    for feat, imp in sorted(importances.items(), key=lambda x: -x[1]):
        print(f"    {FEATURE_LABELS[feat]:<30} {imp*100:.1f}%")

    joblib.dump({
        "model":        rf,
        "accuracy":     acc,
        "importances":  importances,
        "csv_records":  len(df),
        "trained":      datetime.now(TIMEZONE).isoformat(),
        "features":     RF_FEATURES,
    }, MODEL_PATH)

    return rf, acc, importances


def get_rf_model():
    if os.path.exists(MODEL_PATH):
        data = joblib.load(MODEL_PATH)
        return data["model"], data["accuracy"], data["importances"]
    print("Training RF model...")
    return train_rf_model()


def rf_predict(rf_model, leave_type_enc, duration, month, day_of_week, prev_leaves):
    """Get RF probability for a request."""
    row = pd.DataFrame([{
        "leaveType_enc":       leave_type_enc,
        "leaveDuration":       min(duration, 60),
        "month":               month,
        "dayOfWeek":           day_of_week,
        "previousLeavesTaken": prev_leaves,
    }])[RF_FEATURES]
    prob = rf_model.predict_proba(row)[0]
    return float(prob[1]) if len(prob) > 1 else float(1 - prob[0])


# ── Component 2: Bayesian Personal Rate ─────────────────

# Industry prior: 65% of leaves get approved (from CSV)
PRIOR_APPROVED = 65
PRIOR_REJECTED = 35

def bayesian_approval_rate(approved, rejected, leave_type=None, type_approved=0, type_rejected=0):
    """
    Bayesian estimate of this employee's approval probability.

    Starts at industry average (65%) with no data.
    Shifts toward real rate as history grows.
    Uses stronger prior for type-specific history.

    Returns (overall_rate, type_rate, confidence_pct, explanation)
    """
    # Overall rate
    alpha = PRIOR_APPROVED + approved
    beta  = PRIOR_REJECTED + rejected
    overall = alpha / (alpha + beta)

    # Type-specific rate (stronger prior since less data)
    type_alpha = 45 + type_approved  # stronger prior
    type_beta  = 25 + type_rejected
    type_rate  = type_alpha / (type_alpha + type_beta)

    # Combined: 60% overall + 40% type-specific
    combined = overall * 0.60 + type_rate * 0.40

    # Confidence: how much do we trust this vs the prior?
    total_decisions = approved + rejected
    if total_decisions == 0:
        confidence = 10  # very low — using industry average
        explanation = f"No history — using industry average ({PRIOR_APPROVED}% baseline)"
    elif total_decisions <= 3:
        confidence = 30
        explanation = f"Limited history ({total_decisions} decisions) — mixed with industry average"
    elif total_decisions <= 8:
        confidence = 60
        explanation = f"Moderate history ({total_decisions} decisions) — partially reliable"
    elif total_decisions <= 15:
        confidence = 80
        explanation = f"Good history ({total_decisions} decisions) — mostly reliable"
    else:
        confidence = 95
        explanation = f"Strong history ({total_decisions} decisions) — highly reliable"

    return {
        "rate":         round(combined * 100, 1),
        "overall_rate": round(overall * 100, 1),
        "type_rate":    round(type_rate * 100, 1),
        "confidence":   confidence,
        "explanation":  explanation,
        "approved":     approved,
        "rejected":     rejected,
        "total":        total_decisions,
    }


def get_employee_history(employee_id_str, leave_type_name=None):
    """
    Fetch and analyze employee leave history from MongoDB.
    Returns history data for Bayesian calculation.
    """
    try:
        emp = db.employees.find_one({"employeeId": employee_id_str})
        if not emp:
            return None

        decided = list(db.leaves.find({
            "employeeId": emp["_id"],
            "status":     {"$in": ["Approved", "Rejected"]}
        }))

        all_leaves = list(db.leaves.find({"employeeId": emp["_id"]}))
        pending    = [l for l in all_leaves if l["status"] == "Pending"]

        approved = [l for l in decided if l["status"] == "Approved"]
        rejected = [l for l in decided if l["status"] == "Rejected"]

        # Type-specific history
        type_approved = len([l for l in approved if l.get("leaveType") == leave_type_name])
        type_rejected = len([l for l in rejected if l.get("leaveType") == leave_type_name])

        # Current year leaves
        year = datetime.now(TIMEZONE).year
        year_leaves = [l for l in decided if l.get("startDate") and
                       hasattr(l["startDate"], "year") and l["startDate"].year == year]

        # Average approved duration
        durations = []
        for l in approved:
            if l.get("startDate") and l.get("endDate"):
                d = (l["endDate"] - l["startDate"]).days + 1
                durations.append(d)
        avg_duration = round(sum(durations) / len(durations), 1) if durations else 0

        # Monthly pattern — does employee tend to take same month?
        month_counts = {}
        for l in decided:
            if l.get("startDate") and hasattr(l["startDate"], "month"):
                m = l["startDate"].month
                month_counts[m] = month_counts.get(m, 0) + 1

        # Day-of-week pattern — Mon/Fri abuse?
        dow_counts = {}
        for l in decided:
            if l.get("startDate") and hasattr(l["startDate"], "weekday"):
                d = l["startDate"].weekday()
                dow_counts[d] = dow_counts.get(d, 0) + 1

        mon_fri = dow_counts.get(0, 0) + dow_counts.get(4, 0)
        mon_fri_rate = mon_fri / len(decided) if decided else 0

        return {
            "approved":       len(approved),
            "rejected":       len(rejected),
            "pending":        len(pending),
            "total_decided":  len(decided),
            "type_approved":  type_approved,
            "type_rejected":  type_rejected,
            "year_count":     len(year_leaves),
            "avg_duration":   avg_duration,
            "month_counts":   month_counts,
            "mon_fri_rate":   round(mon_fri_rate * 100),
            "raw_rate":       round(len(approved) / len(decided) * 100) if decided else None,
        }

    except Exception as e:
        print(f"History error: {e}")
        return None


# ── Component 3: Rule Constraints ───────────────────────

def rule_score(leave_type_name, duration):
    """
    Returns (score_0_to_1, reason, hard_blocked)
    Pure duration-based rules.
    """
    limits = DURATION_LIMITS.get(leave_type_name, DURATION_LIMITS["Casual Leave"])

    if duration <= limits["normal"]:
        return 1.0, f"Duration within normal range for {leave_type_name}", False
    elif duration <= limits["acceptable"]:
        return 0.75, f"Duration slightly above normal ({limits['normal']} days) but acceptable", False
    elif duration <= limits["max"]:
        return 0.35, f"Duration significantly above normal — will require strong justification", False
    else:
        return 0.05, f"Duration exceeds maximum reasonable limit for {leave_type_name} ({limits['max']} days)", True


# ── Relationship analysis ────────────────────────────────

def analyze_relationship(employee_history, rf_prob, leave_type_name):
    """
    Compares CSV general patterns with employee-specific history.
    Shows whether employee is above or below the general trend.
    """
    if not employee_history or employee_history["total_decided"] == 0:
        return {
            "alignment": "unknown",
            "message": "No personal history to compare with general patterns.",
            "detail": f"General approval rate for {leave_type_name} from industry data: {round(rf_prob*100)}%"
        }

    raw_rate = employee_history["raw_rate"]
    rf_pct   = round(rf_prob * 100)

    diff = raw_rate - rf_pct if raw_rate is not None else 0

    if raw_rate is None:
        return {
            "alignment": "unknown",
            "message": "Insufficient history to compare.",
            "detail": f"General trend shows {rf_pct}% approval for this type."
        }
    elif abs(diff) <= 10:
        return {
            "alignment": "aligned",
            "message": f"Employee behavior aligns with general patterns.",
            "detail": f"Personal approval rate ({raw_rate}%) is close to general trend ({rf_pct}%). Consistent pattern."
        }
    elif diff > 10:
        return {
            "alignment": "above",
            "message": f"Employee has better approval record than general trend.",
            "detail": f"Personal rate ({raw_rate}%) is {diff}pts above general trend ({rf_pct}%). Positive track record."
        }
    else:
        return {
            "alignment": "below",
            "message": f"Employee approval rate is below general trend.",
            "detail": f"Personal rate ({raw_rate}%) is {abs(diff)}pts below general trend ({rf_pct}%). History suggests caution."
        }


# ── Auth ─────────────────────────────────────────────────

def require_service_key(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        key = request.headers.get("X-Service-Key", "")
        if not key and request.is_json:
            key = request.json.get("serviceKey", "")
        if key != SERVICE_KEY:
            return jsonify({"error": "Unauthorized"}), 401
        return f(*args, **kwargs)
    return decorated


# ── Routes ───────────────────────────────────────────────

@app.route("/health", methods=["GET"])
def health():
    model_ready = os.path.exists(MODEL_PATH)
    info = {"status": "running", "model_ready": model_ready, "version": "3.0-hybrid"}
    if model_ready:
        data = joblib.load(MODEL_PATH)
        info.update({
            "rf_accuracy":    f"{data.get('accuracy',0)*100:.1f}%",
            "csv_records":    data.get("csv_records", 0),
            "trained_at":     data.get("trained"),
            "top_rf_feature": max(data.get("importances",{}), key=data.get("importances",{}).get, default="N/A"),
        })
    return jsonify(info)


@app.route("/train", methods=["POST"])
@require_service_key
def retrain():
    try:
        if os.path.exists(MODEL_PATH):
            os.remove(MODEL_PATH)
        rf, acc, importances = train_rf_model()
        if rf is None:
            return jsonify({"success": False, "error": "CSV file not found"}), 500
        return jsonify({
            "success":     True,
            "accuracy":    f"{acc*100:.1f}%",
            "importances": {FEATURE_LABELS.get(k, k): f"{v*100:.1f}%" for k, v in importances.items()},
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/predict-leave", methods=["POST"])
def predict_leave():
    """
    Hybrid prediction: RF + Bayesian + Rules.
    Returns full breakdown of all 3 components.
    """
    data = request.json
    if not data:
        return jsonify({"error": "No data provided"}), 400

    leave_type_name = data.get("leaveTypeName", "Casual Leave")
    duration        = max(1, int(data.get("leaveDuration", 1)))
    employee_id     = data.get("employeeId", "")
    month           = int(data.get("month", datetime.now(TIMEZONE).month))
    day_of_week     = int(data.get("dayOfWeek", 0))
    prev_leaves     = int(data.get("previousLeavesTaken", 0))
    leave_type_enc  = LT_MAP.get(leave_type_name, 1)

    try:
        # ── Component 1: RF prediction ──────────────────
        rf_model, rf_acc, rf_importances = get_rf_model()

        if rf_model is not None:
            rf_prob = rf_predict(rf_model, leave_type_enc, duration, month, day_of_week, prev_leaves)
            rf_available = True
            # Top features driving this specific prediction
            top_features = sorted(
                [(FEATURE_LABELS.get(k, k), v) for k, v in rf_importances.items()],
                key=lambda x: -x[1]
            )[:3]
            rf_info = {
                "probability":    round(rf_prob * 100, 1),
                "accuracy":       f"{rf_acc*100:.1f}%",
                "weight":         30,
                "top_factors":    [{"factor": f, "importance": f"{v*100:.1f}%"} for f, v in top_features],
                "description":    f"Based on patterns from 1500 HR records. RF model accuracy: {rf_acc*100:.1f}%",
            }
        else:
            rf_prob      = 0.65  # fallback
            rf_available = False
            rf_info      = {"probability": 65, "weight": 30, "description": "RF model not available — using average"}

        # ── Component 2: Bayesian personal rate ─────────
        history = get_employee_history(employee_id, leave_type_name) if employee_id else None

        if history:
            bayes = bayesian_approval_rate(
                history["approved"], history["rejected"],
                leave_type_name,
                history["type_approved"], history["type_rejected"]
            )
            prev_leaves = history["year_count"]  # use real count
        else:
            bayes = bayesian_approval_rate(0, 0)
            history = {
                "approved": 0, "rejected": 0, "pending": 0,
                "total_decided": 0, "type_approved": 0, "type_rejected": 0,
                "year_count": 0, "avg_duration": 0,
                "mon_fri_rate": 0, "raw_rate": None,
            }

        bayes_prob = bayes["rate"] / 100

        bayes_info = {
            "probability":      bayes["rate"],
            "overall_rate":     bayes["overall_rate"],
            "type_rate":        bayes["type_rate"],
            "confidence":       bayes["confidence"],
            "weight":           50,
            "explanation":      bayes["explanation"],
            "history_approved": history["approved"],
            "history_rejected": history["rejected"],
            "history_total":    history["total_decided"],
            "type_approved":    history["type_approved"],
            "type_rejected":    history["type_rejected"],
            "year_count":       history["year_count"],
            "avg_duration":     history["avg_duration"],
            "description":      "Based on this employee's personal leave history with Bayesian smoothing.",
        }

        # ── Component 3: Rule constraints ───────────────
        rule_prob, rule_reason, hard_blocked = rule_score(leave_type_name, duration)
        rule_info = {
            "probability":   round(rule_prob * 100, 1),
            "weight":        20,
            "reason":        rule_reason,
            "hard_blocked":  hard_blocked,
            "description":   "Based on leave type limits and duration reasonableness.",
        }

        # ── Combine all 3 ───────────────────────────────
        if hard_blocked:
            final_score = rule_prob * 100
            final_score = max(2, min(8, final_score))
        else:
            final_score = (
                rf_prob    * 100 * 0.30 +
                bayes_prob * 100 * 0.50 +
                rule_prob  * 100 * 0.20
            )
            final_score = max(3, min(92, final_score))

        # Patterns and flags
        patterns = []
        if history["mon_fri_rate"] > 60 and history["total_decided"] >= 4:
            patterns.append({
                "type": "warning",
                "msg":  f"{history['mon_fri_rate']}% of leaves start on Monday or Friday — unusual pattern"
            })
        if history["avg_duration"] > 0 and duration > history["avg_duration"] * 2:
            patterns.append({
                "type": "warning",
                "msg":  f"Requested {duration} days — more than double their average ({history['avg_duration']} days)"
            })
        if history["year_count"] >= 8:
            patterns.append({
                "type": "warning",
                "msg":  f"Already taken {history['year_count']} leaves this year — high usage"
            })
        if history["type_rejected"] >= 2:
            patterns.append({
                "type": "info",
                "msg":  f"This leave type ({leave_type_name}) was rejected {history['type_rejected']} time(s) before"
            })
        if history["total_decided"] >= 5 and history["raw_rate"] and history["raw_rate"] >= 80:
            patterns.append({
                "type": "good",
                "msg":  f"Consistent record — {history['raw_rate']}% of previous requests approved"
            })

        # Relationship between RF and Bayesian
        relationship = analyze_relationship(history, rf_prob, leave_type_name)

        # Verdict
        score = round(final_score)
        if hard_blocked:
            verdict = "Not Recommended"
            verdict_class = "reject"
        elif score >= 72:
            verdict = "Likely to be Approved"
            verdict_class = "approve"
        elif score >= 52:
            verdict = "Could go either way"
            verdict_class = "neutral"
        elif score >= 35:
            verdict = "Unlikely to be Approved"
            verdict_class = "reject"
        else:
            verdict = "Not Recommended for Approval"
            verdict_class = "reject"

        # Overall confidence (weighted average of component confidences)
        overall_confidence = (
            (rf_acc * 100 if rf_available else 50) * 0.30 +
            bayes["confidence"]                    * 0.50 +
            85                                     * 0.20
        )

        return jsonify({
            "score":               score,
            "approve_probability": score,
            "reject_probability":  100 - score,
            "verdict":             verdict,
            "verdict_class":       verdict_class,
            "overall_confidence":  round(overall_confidence),

            # Three components breakdown
            "components": {
                "random_forest": rf_info,
                "bayesian":      bayes_info,
                "rules":         rule_info,
            },

            # Data relationship
            "relationship":    relationship,
            "patterns":        patterns,

            # Summary for display
            "data_sources": [
                {
                    "name":    "General HR Patterns (Random Forest)",
                    "weight":  "30%",
                    "data":    "1500 historical HR records",
                    "value":   rf_info["probability"],
                    "note":    f"Model accuracy: {rf_info.get('accuracy','N/A')}"
                },
                {
                    "name":    "Personal History (Bayesian)",
                    "weight":  "50%",
                    "data":    f"{history['total_decided']} decided leaves for this employee",
                    "value":   bayes["rate"],
                    "note":    bayes["explanation"]
                },
                {
                    "name":    "Duration Rules",
                    "weight":  "20%",
                    "data":    f"{leave_type_name} limits",
                    "value":   rule_info["probability"],
                    "note":    rule_reason
                }
            ],

            "hard_blocked": hard_blocked,
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    print("Leave Prediction Service — port 5002")
    print("Model: Hybrid (Random Forest 30% + Bayesian 50% + Rules 20%)")
    get_rf_model()
    app.run(host="0.0.0.0", port=5002, debug=False)
