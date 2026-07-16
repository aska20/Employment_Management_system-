"""
Face Recognition Service — port 5001

SECURITY MODEL:
  - All sensitive endpoints require X-Service-Key header
  - Only the office laptop/admin can mark attendance
  - Employee-panel calls are BLOCKED (we removed them from frontend too)
  - Face recognition determines who checks in/out — logged-in account is ignored
  - Duplicate face registration across employees is blocked

Install:
  pip install flask flask-cors face_recognition opencv-python numpy pymongo Pillow python-dotenv

Run:
  python app.py
"""

import os
import requests as http_requests
from functools import wraps
from flask import Flask, request, jsonify
from flask_cors import CORS
import face_recognition
import numpy as np
import cv2
import base64
from pymongo import MongoClient
from datetime import datetime
from zoneinfo import ZoneInfo

# ── Config ────────────────────────────────────────────────
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

TIMEZONE = ZoneInfo(os.environ.get('TIMEZONE', 'Asia/Kathmandu'))

app = Flask(__name__)

# CORS — only allow your frontend origin
ALLOWED_ORIGIN = os.environ.get("FRONTEND_URL", "http://localhost:5173")
CORS(app, origins=[ALLOWED_ORIGIN, "http://localhost:5174", "http://localhost:3000"])

MONGO_URI    = os.environ.get("MONGO_URI",      "mongodb://localhost:27017")
DB_NAME      = os.environ.get("DB_NAME",         "ems")
TOLERANCE    = float(os.environ.get("TOLERANCE", "0.45"))    # lower = stricter
SERVICE_KEY  = os.environ.get("FACE_SERVICE_KEY", "ems-face-secret-2024")  # shared secret

REQUIRED_HOURS = 8 * 60   # 8 hours minimum work

client = MongoClient(MONGO_URI)
db     = client[DB_NAME]

# ── Auth Decorator ────────────────────────────────────────

def require_service_key(f):
    """
    Protects endpoints that mark attendance.
    The office attendance page sends X-Service-Key in headers.
    This blocks any random HTTP request to the face service.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        key = request.headers.get("X-Service-Key") or request.json.get("serviceKey", "") if request.is_json else ""
        if key != SERVICE_KEY:
            return jsonify({
                "success": False,
                "error": "Unauthorized. Valid service key required.",
                "hint": "Set FACE_SERVICE_KEY in .env and send it as X-Service-Key header."
            }), 401
        return f(*args, **kwargs)
    return decorated

# ── Helpers ───────────────────────────────────────────────

def decode_image(b64):
    if "," in b64:
        b64 = b64.split(",")[1]
    arr = np.frombuffer(base64.b64decode(b64), np.uint8)
    return cv2.imdecode(arr, cv2.IMREAD_COLOR)

def extract_encoding(frame):
    rgb   = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    small = cv2.resize(rgb, (0, 0), fx=0.5, fy=0.5)
    locs  = face_recognition.face_locations(small, model="hog")
    if len(locs) == 0:
        return None, "No face detected. Look directly at the camera in good lighting."
    if len(locs) > 1:
        return None, "Multiple faces detected. Only one person should be in frame."
    scale     = 2
    full_locs = [(t*scale, r*scale, b*scale, l*scale) for (t,r,b,l) in locs]
    encs      = face_recognition.face_encodings(rgb, full_locs, num_jitters=2)
    if not encs:
        return None, "Could not process face. Please try again with better lighting."
    return encs[0], None

def load_known_faces():
    docs = list(db.face_embeddings.find({}))
    return (
        [np.array(d["encoding"])          for d in docs],
        [d["employeeId"]                   for d in docs],
        [d.get("employeeName", "Unknown")  for d in docs],
    )

def match_face(encoding, known_encs, known_ids, known_names):
    if not known_encs:
        return None, None, None
    distances = face_recognition.face_distance(known_encs, encoding)
    best      = int(np.argmin(distances))
    if distances[best] <= TOLERANCE:
        return known_ids[best], known_names[best], float(distances[best])
    return None, None, float(distances[best])

def get_today():
    return datetime.now(TIMEZONE).strftime("%Y-%m-%d")

def get_time():
    return datetime.now(TIMEZONE).strftime("%I:%M %p")

def time_to_minutes(t):
    try:
        time_part, period = t.split(" ")
        h, m = map(int, time_part.split(":"))
        if period == "PM" and h != 12: h += 12
        if period == "AM" and h == 12: h  =  0
        return h * 60 + m
    except:
        return 0

# ── Routes ────────────────────────────────────────────────

@app.route("/health", methods=["GET"])
def health():
    """Public health check — no key needed."""
    count = db.face_embeddings.count_documents({})
    return jsonify({
        "status":            "running",
        "service":           "face_recognition",
        "registered_faces":  count,
        "tolerance":         TOLERANCE,
        "required_work_hrs": REQUIRED_HOURS // 60,
        "security":          "X-Service-Key required for attendance endpoints",
        "allowed_origin":    ALLOWED_ORIGIN,
    })


@app.route("/register", methods=["POST"])
@require_service_key
def register():
    """
    Register employee face. Admin-only action.
    Called from admin panel RegisterFace component.
    Requires X-Service-Key header.
    Blocks same face being registered to multiple employees.
    """
    data        = request.json
    employee_id = data.get("employeeId")
    images      = data.get("images", [])

    if not employee_id or not images:
        return jsonify({"success": False, "error": "employeeId and images required"}), 400

    employee = db.employees.find_one({"employeeId": employee_id})
    emp_name = ""
    if employee:
        user = db.users.find_one({"_id": employee.get("userId")})
        if user:
            emp_name = user.get("name", "")

    all_encs = []
    errors   = []
    for i, b64 in enumerate(images):
        try:
            frame    = decode_image(b64)
            enc, err = extract_encoding(frame)
            if enc is not None:
                all_encs.append(enc)
            elif err:
                errors.append(f"Photo {i+1}: {err}")
        except Exception as e:
            errors.append(f"Photo {i+1}: Processing error — {e}")

    if not all_encs:
        return jsonify({
            "success": False,
            "error":   "No clear face detected in any photo. " + "; ".join(errors)
        }), 400

    avg_enc = np.mean(all_encs, axis=0)

    # Block same face on multiple accounts
    others = list(db.face_embeddings.find({"employeeId": {"$ne": employee_id}}))
    for doc in others:
        dist = face_recognition.face_distance([np.array(doc["encoding"])], avg_enc)[0]
        if dist <= TOLERANCE:
            return jsonify({
                "success": False,
                "error":   (
                    f"This face is already registered to another employee "
                    f"({doc.get('employeeName', doc['employeeId'])}). "
                    "One face cannot be used for multiple accounts."
                )
            }), 409

    db.face_embeddings.update_one(
        {"employeeId": employee_id},
        {"$set": {
            "employeeId":   employee_id,
            "employeeName": emp_name,
            "encoding":     avg_enc.tolist(),
            "photoCount":   len(all_encs),
            "updatedAt":    datetime.now(TIMEZONE),
        }},
        upsert=True
    )

    return jsonify({
        "success": True,
        "message": f"Face registered for {emp_name or employee_id} using {len(all_encs)} photo(s).",
        "warnings": errors if errors else None,
    })


@app.route("/recognize", methods=["POST"])
@require_service_key
def recognize():
    """
    CHECK-IN via face recognition.
    Called ONLY from the office attendance page — not from employee panel.
    Requires X-Service-Key header.
    The face determines who checks in — logged-in account is ignored.
    """
    data = request.json
    b64  = data.get("image")
    if not b64:
        return jsonify({"success": False, "message": "No image provided"}), 400

    # Step 1: extract face encoding
    try:
        frame    = decode_image(b64)
        enc, err = extract_encoding(frame)
    except Exception as e:
        return jsonify({"success": False, "message": f"Image processing error: {e}"})

    if enc is None:
        return jsonify({"success": False, "message": err})

    # Step 2: match face
    known_encs, known_ids, known_names = load_known_faces()
    if not known_encs:
        return jsonify({
            "success": False,
            "message": "No faces registered in the system. Ask admin to register employee faces first."
        })

    emp_id, emp_name, dist = match_face(enc, known_encs, known_ids, known_names)

    if emp_id is None:
        return jsonify({
            "success": False,
            "message": (
                f"Face not recognized (distance: {dist:.2f}). "
                "Your face does not match any registered employee. "
                "Please ask admin to register or re-register your face."
            )
        })

    # Step 3: check existing record
    today    = get_today()
    employee = db.employees.find_one({"employeeId": emp_id})
    if not employee:
        return jsonify({"success": False, "message": f"Employee record not found for ID: {emp_id}"})

    existing = db.attendances.find_one({"employeeId": employee["_id"], "date": today})
    if existing:
        return jsonify({
            "success":       True,
            "alreadyMarked": True,
            "employeeId":    emp_id,
            "employeeName":  emp_name,
            "checkIn":       existing.get("checkIn", ""),
            "message":       f"Already checked in today at {existing.get('checkIn', '')}. Cannot check in twice.",
        })

    # Step 4: determine status
    now      = get_time()
    now_mins = time_to_minutes(now)

    checkin_on_time  = 9 * 60   # 9:00 AM
    checkin_late_max = 10 * 60  # 10:00 AM

    if now_mins <= checkin_on_time:
        status, late_mins = "Present", 0
    elif now_mins <= checkin_late_max:
        status, late_mins = "Late", now_mins - checkin_on_time
    else:
        status, late_mins = "Half Day", now_mins - checkin_on_time

    # Step 5: insert record
    db.attendances.insert_one({
        "employeeId":     employee["_id"],
        "date":           today,
        "checkIn":        now,
        "checkInMinutes": now_mins,
        "checkOut":       "",
        "workedMinutes":  0,
        "lateMinutes":    late_mins,
        "status":         status,
        "markedBy":       "office_face_recognition",
        "createdAt":      datetime.now(TIMEZONE),
    })

    return jsonify({
        "success":      True,
        "employeeId":   emp_id,
        "employeeName": emp_name,
        "checkIn":      now,
        "status":       status,
        "lateMinutes":  late_mins,
        "message":      f"Check-in recorded at {now}",
    })


@app.route("/checkout", methods=["POST"])
@require_service_key
def checkout():
    """
    CHECK-OUT via face recognition (or direct employeeId after reason submission).
    Called ONLY from the office attendance page — not from employee panel.
    Requires X-Service-Key header.
    Enforces 8-hour minimum and requests early-exit reason if not met.
    """
    data              = request.json
    b64               = data.get("image")
    direct_emp_id     = data.get("employeeId")      # used after reason submission
    early_exit_reason = data.get("earlyExitReason", "")

    today = get_today()

    # ── Path A: direct employeeId (after early exit reason was submitted) ──
    if direct_emp_id and not b64:
        employee = db.employees.find_one({"employeeId": direct_emp_id})
        if not employee:
            return jsonify({"success": False, "message": "Employee not found."})
        user     = db.users.find_one({"_id": employee.get("userId")}) or {}
        emp_id   = direct_emp_id
        emp_name = user.get("name", emp_id)

    # ── Path B: face recognition ──
    else:
        if not b64:
            return jsonify({"success": False, "message": "No image provided"}), 400

        try:
            frame    = decode_image(b64)
            enc, err = extract_encoding(frame)
        except Exception as e:
            return jsonify({"success": False, "message": f"Image error: {e}"})

        if enc is None:
            return jsonify({"success": False, "message": err})

        known_encs, known_ids, known_names = load_known_faces()
        if not known_encs:
            return jsonify({"success": False, "message": "No faces registered."})

        emp_id, emp_name, dist = match_face(enc, known_encs, known_ids, known_names)
        if emp_id is None:
            return jsonify({
                "success": False,
                "message": f"Face not recognized (distance: {dist:.2f}). Please ensure admin has registered your face."
            })

        employee = db.employees.find_one({"employeeId": emp_id})
        if not employee:
            return jsonify({"success": False, "message": "Employee record not found."})

    # ── Common checkout logic ──
    existing = db.attendances.find_one({"employeeId": employee["_id"], "date": today})
    if not existing:
        return jsonify({"success": False, "message": "You have not checked in today. Please check in first."})

    if existing.get("checkOut") and existing["checkOut"] != "":
        return jsonify({
            "success":           False,
            "alreadyCheckedOut": True,
            "employeeId":        emp_id,
            "employeeName":      emp_name,
            "checkOut":          existing.get("checkOut", ""),
            "message":           f"Already checked out at {existing['checkOut']}. Cannot check out twice.",
        })

    # Also block if early exit is pending admin approval
    if existing.get("earlyExitStatus") == "pending":
        return jsonify({
            "success":           False,
            "alreadyCheckedOut": True,
            "employeeId":        emp_id,
            "employeeName":      emp_name,
            "checkOut":          "pending approval",
            "message":           f"Early exit request already submitted and pending admin approval.",
        })

    now      = get_time()
    now_mins = time_to_minutes(now)
    worked   = now_mins - existing.get("checkInMinutes", 0)

    # Enforce 8-hour minimum
    if worked < REQUIRED_HOURS and not early_exit_reason:
        return jsonify({
            "success":               True,
            "needsEarlyExitReason":  True,
            "employeeId":            emp_id,
            "employeeName":          emp_name,
            "workedMinutes":         worked,
            "workedHours":           worked // 60,
            "workedMins":            worked  % 60,
            "requiredMinutes":       REQUIRED_HOURS,
            "message": (
                f"You have worked only {worked//60}h {worked%60}m. "
                "Minimum 8 hours required. Please provide a reason for early exit."
            ),
        })

    is_early = worked < REQUIRED_HOURS and early_exit_reason

    if is_early:
        # EARLY EXIT — do NOT write checkOut yet
        # Save the reason and set status to pending
        # Admin must approve before checkout is recorded
        db.attendances.update_one(
            {"_id": existing["_id"]},
            {"$set": {
                "earlyExitReason":  early_exit_reason,
                "earlyExitStatus":  "pending",
                "pendingCheckOut":  now,
                "pendingWorkedMins": worked,
            }}
        )
        # Notify admin via Node server
        try:
            node_url = os.environ.get("NODE_SERVER_URL", "http://localhost:5000")
            http_requests.post(
                f"{node_url}/api/attendance/notify-early-exit",
                json={
                    "attendanceId":  str(existing["_id"]),
                    "employeeId":    emp_id,
                    "employeeName":  emp_name,
                    "workedMinutes": worked,
                    "reason":        early_exit_reason,
                },
                timeout=5
            )
        except Exception as e:
            print(f"Warning: Could not notify admin: {e}")

        return jsonify({
            "success":      True,
            "earlyPending": True,
            "employeeId":   emp_id,
            "employeeName": emp_name,
            "workedHours":  worked // 60,
            "workedMins":   worked  % 60,
            "message":      f"Early exit request sent to admin for approval. You will be notified of the decision.",
        })

    # NORMAL CHECKOUT — write immediately
    db.attendances.update_one(
        {"_id": existing["_id"]},
        {"$set": {
            "checkOut":        now,
            "checkOutMinutes": now_mins,
            "workedMinutes":   worked,
            "earlyExitStatus": "none",
        }}
    )

    return jsonify({
        "success":       True,
        "employeeId":    emp_id,
        "employeeName":  emp_name,
        "checkOut":      now,
        "workedMinutes": worked,
        "workedHours":   worked // 60,
        "workedMins":    worked  % 60,
        "message":       f"Check-out recorded at {now}. Worked: {worked//60}h {worked%60}m",
    })


@app.route("/delete-face/<employee_id>", methods=["DELETE"])
@require_service_key
def delete_face(employee_id):
    """Delete a registered face. Admin-only."""
    result = db.face_embeddings.delete_one({"employeeId": employee_id})
    if result.deleted_count:
        return jsonify({"success": True, "message": f"Face deleted for {employee_id}"})
    return jsonify({"success": False, "message": "No face found for this employee"}), 404


@app.route("/list-faces", methods=["GET"])
@require_service_key
def list_faces():
    """List all registered faces (without encoding data). Admin-only."""
    docs = list(db.face_embeddings.find({}, {"encoding": 0}))
    for d in docs:
        d["_id"] = str(d["_id"])
    return jsonify({"success": True, "count": len(docs), "faces": docs})


if __name__ == "__main__":
    count = db.face_embeddings.count_documents({})
    print("=" * 58)
    print("  Face Recognition Service — port 5001")
    print(f"  Registered faces : {count}")
    print(f"  Tolerance        : {TOLERANCE} (lower = stricter)")
    print(f"  Allowed origin   : {ALLOWED_ORIGIN}")
    print(f"  Service key      : {'SET ' if SERVICE_KEY != 'ems-face-secret-2024' else 'DEFAULT ️  (change FACE_SERVICE_KEY in .env!)'}")
    print("  Security         : X-Service-Key required on all write endpoints")
    print("  Note             : Employees CANNOT mark their own attendance")
    print("=" * 58)
    app.run(host="0.0.0.0", port=5001, debug=False)
