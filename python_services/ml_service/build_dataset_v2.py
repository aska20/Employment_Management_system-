"""
build_dataset_v2.py

Produces TWO CSVs from the real "Absenteeism at Work" dataset:
  1. hr_leave_dataset_raw.csv    — straight column mapping, no cleaning
  2. hr_leave_dataset_clean.csv  — cleaned + feature-engineered version
     (this is the one app.py actually trains on)

This version adds features that are genuinely part of YOUR EMS's own
schema, instead of borrowed/generic ones — so every feature here has a
direct, explainable counterpart in your Employee/Attendance/Leave Mongo
collections:

  leaveType_enc         <- Employee.leaveType (enum, same as before)
  leaveDuration          <- computed from startDate/endDate in Leave model
  month, dayOfWeek       <- from Leave.startDate
  previousLeavesTaken    <- COUNT of employee's own approved Leave docs
                            this year (Mongo query, live at predict time)
  dept_enc               <- Employee.department -> Department.dep_name
  ageYears                <- Employee.dob -> age in years
  tenureMonths           <- Employee.createdAt -> months since joining
  attendanceReliability  <- % of days Present/Late (not Absent) over the
                            employee's last 90 Attendance records — this
                            is the feature that ties your face-recognition
                            attendance module INTO leave prediction. It's
                            a real, meaningful relationship: an employee
                            who is frequently absent/late may get more
                            scrutiny on leave requests.

RAW -> CLEAN preprocessing steps applied (all listed explicitly so you
can describe each one to your teacher):

  1. DROP invalid rows        — Month of absence == 0 (undefined/missing)
  2. DROP duplicate rows       — exact duplicate absence records
  3. TYPE CASTING              — hours/service-time/age forced to numeric,
                                  coercing bad values to NaN then dropping
  4. MISSING VALUE HANDLING    — rows with NaN in required fields dropped
                                  (small dataset — imputing would distort
                                  a real record; document this trade-off)
  5. OUTLIER CAPPING           — Absenteeism time in hours capped at the
                                  99th percentile before converting to
                                  days, so one extreme record (max=120hrs)
                                  doesn't dominate duration scaling
  6. CATEGORICAL ENCODING      — Reason for absence -> leaveType (grouped
                                  by ICD chapter), Day of week remapped
                                  from UCI's Mon=2..Fri=6 to app's Mon=0..Fri=4
  7. FEATURE ENGINEERING       — previousLeavesTaken (running per-employee
                                  count), department (derived), ageYears /
                                  tenureMonths (from Age / Service time,
                                  scaled to your schema's units),
                                  attendanceReliability (bootstrap prior —
                                  see note below)
  8. LABEL DERIVATION          — status (Approved/Rejected) derived from
                                  real Disciplinary failure flag + duration
                                  rule + history pressure + real
                                  performance/workload variance (NOT fed
                                  back in as a feature — avoids leakage)
  9. BOOTSTRAP AUGMENTATION    — replay each real employee's cleaned event
                                  sequence N times with independent label
                                  draws, to stabilize training on a small
                                  (36-employee) real dataset

NOTE on attendanceReliability in the bootstrap CSV: the real UCI dataset
has no attendance/punctuality field, so we cannot honestly derive this
from real data at the CSV stage. We seed it as a mild, weakly-varying
prior (not tied to the label at all) so training doesn't crash and the
column exists with the right shape — but its REAL predictive power only
turns on once your live system has accumulated real Attendance records,
because app.py always overrides this at prediction time with a live
Mongo query (see get_attendance_reliability() in app.py). This is an
honest, correct design for a growing system, and worth stating exactly
this way in your report: "cold-start prior in training data, live signal
in production."
"""
import math
import hashlib
import numpy as np
import pandas as pd

IN_CSV        = "Absenteeism_at_work.csv"
RAW_OUT_CSV   = "hr_leave_dataset_raw.csv"
CLEAN_OUT_CSV = "hr_leave_dataset_clean.csv"

DURATION_LIMITS = {
    "Sick Leave":   {"normal": 3, "acceptable": 14, "max": 30},
    "Casual Leave": {"normal": 3, "acceptable": 7,  "max": 14},
    "Annual Leave": {"normal": 7, "acceptable": 14, "max": 21},
}
SICK_CODES   = set(range(1, 15)) | {22, 23, 25, 28}
ANNUAL_CODES = {15, 16, 17, 18, 21, 24}
DEPT_MAP = {"Sick Leave": "Health & Safety", "Annual Leave": "Operations", "Casual Leave": "Administration"}
DOW_MAP  = {2: 0, 3: 1, 4: 2, 5: 3, 6: 4}


def leave_type_for(reason_code):
    if reason_code in SICK_CODES:
        return "Sick Leave"
    if reason_code in ANNUAL_CODES:
        return "Annual Leave"
    return "Casual Leave"


def rule_score(leave_type, duration):
    limits = DURATION_LIMITS[leave_type]
    if duration <= limits["normal"]:
        return 1.00
    elif duration <= limits["acceptable"]:
        return 0.75
    elif duration <= limits["max"]:
        return 0.35
    return 0.05


def history_factor(leaves_this_cycle):
    if leaves_this_cycle <= 4:
        return 1.0
    elif leaves_this_cycle <= 8:
        return 1.0 - (leaves_this_cycle - 4) * 0.06
    return max(0.15, 0.76 - (leaves_this_cycle - 8) * 0.08)


def performance_factor(hit_target, workload, wl_min, wl_max):
    perf = hit_target / 100.0
    wl_norm = (workload - wl_min) / max(1.0, (wl_max - wl_min))
    return float(np.clip(perf * 0.6 + (1 - wl_norm) * 0.4, 0, 1))


# ---------- STEP 1-6: RAW extraction (light mapping, no cleaning yet) ----------
def build_raw():
    df = pd.read_csv(IN_CSV, sep=";")
    df.columns = [c.strip() for c in df.columns]

    raw_rows = []
    for _, r in df.iterrows():
        raw_rows.append({
            "employeeRef":   r["ID"],
            "reasonCode":    r["Reason for absence"],
            "monthRaw":      r["Month of absence"],
            "dayRaw":        r["Day of the week"],
            "hoursRaw":      r["Absenteeism time in hours"],
            "ageRaw":        r["Age"],
            "serviceYears":  r["Service time"],
            "disciplinary":  r["Disciplinary failure"],
            "hitTarget":     r["Hit target"],
            "workload":      r["Work load Average/day"],
        })
    raw = pd.DataFrame(raw_rows)
    raw.to_csv(RAW_OUT_CSV, index=False)
    print(f"RAW:   wrote {len(raw)} rows -> {RAW_OUT_CSV} (unfiltered, uncleaned)")
    return df


# ---------- STEP 1-9: CLEAN + feature engineering + label + augmentation ----------
def build_clean(df, n_bootstrap=10):
    before = len(df)

    # 1. drop invalid rows (Month of absence == 0 = undefined)
    df = df[df["Month of absence"] != 0].copy()
    # 2. drop exact duplicates
    df = df.drop_duplicates()
    # 3. type casting, coerce bad values to NaN
    numeric_cols = ["Absenteeism time in hours", "Age", "Service time",
                     "Hit target", "Work load Average/day", "Disciplinary failure"]
    for c in numeric_cols:
        df[c] = pd.to_numeric(df[c], errors="coerce")
    # 4. drop rows with missing required values
    df = df.dropna(subset=numeric_cols)
    # 5. outlier capping at 99th percentile before day conversion
    cap = df["Absenteeism time in hours"].quantile(0.99)
    df["Absenteeism time in hours"] = df["Absenteeism time in hours"].clip(upper=cap)

    after = len(df)
    print(f"CLEAN: {before} raw rows -> {after} after cleaning "
          f"({before - after} dropped: invalid month / duplicates / missing values)")

    wl_min = df["Work load Average/day"].min()
    wl_max = df["Work load Average/day"].max()
    df = df.sort_index()

    all_rows = []
    for b in range(n_bootstrap):
        running = {}
        last_month = {}
        for _, r in df.iterrows():
            emp = r["ID"]
            reason = int(r["Reason for absence"])
            leave_type = leave_type_for(reason)                       # 6. categorical encoding
            duration = max(1, math.ceil(r["Absenteeism time in hours"] / 8))
            month = int(r["Month of absence"])
            dow = DOW_MAP.get(int(r["Day of the week"]), 0)            # 6. categorical remap
            disciplinary = int(r["Disciplinary failure"])

            if emp in last_month and month < last_month[emp]:
                running[emp] = 0
            last_month[emp] = month
            leaves_so_far = running.get(emp, 0)                        # 7. engineered: history

            age_years = int(r["Age"])                                  # 7. engineered: age
            tenure_months = int(r["Service time"] * 12)                # 7. engineered: tenure

            # 7. engineered: attendance reliability — cold-start prior only
            # (mild noise around a plausible baseline, NOT tied to label;
            # production always overrides this with a live Mongo query)
            attendance_reliability = float(np.clip(
                np.random.normal(loc=88, scale=6), 40, 100
            ))

            # 8. label derivation (real Disciplinary flag + rules + history + perf variance)
            if disciplinary == 1:
                status = "Rejected"
            else:
                r_score  = rule_score(leave_type, duration)
                h_factor = history_factor(leaves_so_far)
                p_factor = performance_factor(r["Hit target"], r["Work load Average/day"], wl_min, wl_max)
                prob = 0.35 * r_score + 0.20 * h_factor + 0.20 * p_factor + 0.25 * np.random.random()
                status = "Approved" if np.random.random() < prob else "Rejected"

            all_rows.append({
                "department":            DEPT_MAP[leave_type],
                "leaveType":             leave_type,
                "leaveDuration":         duration,
                "month":                 month,
                "dayOfWeek":             dow,
                "previousLeavesTaken":   leaves_so_far,
                "ageYears":              age_years,
                "tenureMonths":          tenure_months,
                "attendanceReliability": round(attendance_reliability, 1),
                "status":                status,
            })

            if status == "Approved":
                running[emp] = leaves_so_far + 1

    clean = pd.DataFrame(all_rows)
    clean.to_csv(CLEAN_OUT_CSV, index=False)
    print(f"\nCLEAN+AUGMENTED: wrote {len(clean)} rows -> {CLEAN_OUT_CSV} "
          f"({df['ID'].nunique()} real employees x {n_bootstrap} bootstrap replays)")
    print(clean["status"].value_counts())
    print(f"Approval rate: {(clean['status']=='Approved').mean()*100:.1f}%")
    return clean


if __name__ == "__main__":
    df = build_raw()
    build_clean(df)
