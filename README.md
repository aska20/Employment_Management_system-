# EMS — Employee Management System
## Teal Theme | Face Attendance | AI Leave Prediction

### All Fixes in This Version:
1. Face not detected → shows clear message
2. Face not matched → shows clear message with guidance  
3. Already checked in → blocks with message showing original check-in time
4. Already checked out → blocks with message showing original check-out time
5. Check-out doesn't change check-in time (immutable once set)
6. Same face cannot register for 2 different accounts
7. Salary cannot go negative (blocked frontend + backend)
8. DOB must be in the past (at least 18 years old)
9. Full teal/earthy UI across all pages

### Run All Services:
  Terminal 1: cd server          → npm install && npm start        (port 5000)
  Terminal 2: cd frontend        → npm install && npm run dev      (port 5173)
  Terminal 3: cd python_services/face_service → pip install -r requirements.txt && python app.py  (port 5001)
  Terminal 4: cd python_services/ml_service   → pip install -r requirements.txt && python app.py  (port 5002)
  Terminal 0: mongod (MongoDB must be running)

### Face Service Messages:
  "No face detected"         → look at camera in good lighting
  "Multiple faces detected"  → only one person in frame
  "Face not matched"         → not registered or poor lighting
  "Already checked in"       → shows original check-in time, blocked
  "Already checked out"      → shows original check-out time, blocked
  "Not checked in today"     → must check in before checkout
  "Face already on another account" → duplicate face rejected
