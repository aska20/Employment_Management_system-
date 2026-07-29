"""
evaluate_model.py

Run this from python_services/ml_service/ (same folder as app.py and
hr_leave_dataset_clean.csv). Reproduces the exact training pipeline from
app.py, then prints accuracy + a full confusion matrix + classification
report, and saves a heatmap image for your report/slides.

Usage:
    cd python_services/ml_service
    python evaluate_model.py
"""
import hashlib
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score, confusion_matrix, classification_report,
    ConfusionMatrixDisplay
)

CSV_PATH = "hr_leave_dataset_clean.csv"
LT_MAP = {"Sick Leave": 0, "Casual Leave": 1, "Annual Leave": 2,
          "Emergency Leave": 3, "Maternity Leave": 4, "Paternity Leave": 5}
RF_FEATURES = ["leaveType_enc", "leaveDuration", "month", "dayOfWeek",
               "previousLeavesTaken", "dept_enc", "ageYears", "tenureMonths",
               "attendanceReliability"]
DEPT_BUCKETS = 8

def dept_encode(dep_name):
    if not dep_name:
        return 0
    return int(hashlib.md5(str(dep_name).strip().lower().encode()).hexdigest(), 16) % DEPT_BUCKETS

df = pd.read_csv(CSV_PATH)
df["leaveType_enc"]         = df["leaveType"].map(LT_MAP).fillna(1).astype(int)
df["target"]                = (df["status"] == "Approved").astype(int)
df["previousLeavesTaken"]   = df["previousLeavesTaken"].fillna(0).astype(int)
df["dept_enc"]              = df.get("department", "").apply(dept_encode) if "department" in df.columns else 0
df["ageYears"]              = df.get("ageYears", 30).fillna(30).astype(int)
df["tenureMonths"]          = df.get("tenureMonths", 12).fillna(12).astype(int)
df["attendanceReliability"] = df.get("attendanceReliability", 85.0).fillna(85.0).astype(float)

X = df[RF_FEATURES]
y = df["target"]

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

rf = RandomForestClassifier(
    n_estimators=300, max_depth=8, min_samples_split=10,
    min_samples_leaf=5, random_state=42, n_jobs=-1
)
rf.fit(X_train, y_train)
y_pred = rf.predict(X_test)

acc = accuracy_score(y_test, y_pred)
cm  = confusion_matrix(y_test, y_pred)

print(f"\nTraining rows: {len(X_train)}  |  Test rows: {len(X_test)}")
print(f"Accuracy: {acc*100:.2f}%\n")

print("Confusion Matrix (rows = actual, cols = predicted):")
print("                 Pred: Rejected   Pred: Approved")
print(f"Actual: Rejected      {cm[0][0]:<15}{cm[0][1]}")
print(f"Actual: Approved      {cm[1][0]:<15}{cm[1][1]}\n")

print("Classification Report:")
print(classification_report(y_test, y_pred, target_names=["Rejected", "Approved"]))

print("Feature importances:")
for f, imp in sorted(zip(RF_FEATURES, rf.feature_importances_), key=lambda x: -x[1]):
    print(f"  {f:<24} {imp*100:.1f}%")

disp = ConfusionMatrixDisplay(confusion_matrix=cm, display_labels=["Rejected", "Approved"])
fig, ax = plt.subplots(figsize=(5, 4))
disp.plot(ax=ax, cmap="Blues", colorbar=True)
plt.title(f"Leave Approval — Confusion Matrix (Accuracy: {acc*100:.1f}%)")
plt.tight_layout()
plt.savefig("confusion_matrix.png", dpi=150)
print("\nSaved confusion_matrix.png")
