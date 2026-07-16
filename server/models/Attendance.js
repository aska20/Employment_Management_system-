import mongoose from "mongoose";
const { Schema } = mongoose;

const attendanceSchema = new Schema({
    employeeId:       { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    date:             { type: String, required: true },
    checkIn:          { type: String, default: '' },
    checkOut:         { type: String, default: '' },
    checkInMinutes:   { type: Number, default: 0 },
    checkOutMinutes:  { type: Number, default: 0 },
    workedMinutes:    { type: Number, default: 0 },
    lateMinutes:      { type: Number, default: 0 },
    earlyExitReason:  { type: String, default: '' },
    earlyExitStatus:  { type: String, enum: ['none','pending','approved','rejected'], default: 'none' },
    pendingCheckOut:  { type: String, default: '' },   // stored until admin approves
    pendingWorkedMins: { type: Number, default: 0 },
    status: {
        type: String,
        enum: ['Present', 'Absent', 'Late', 'Half Day', 'Holiday', 'Weekend'],
        default: 'Present'
    },
    markedBy: {
        type: String,
        enum: ['office_face_recognition', 'manual', 'system'],
        default: 'office_face_recognition'
    },
    createdAt: { type: Date, default: Date.now }
});

attendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });
const Attendance = mongoose.model('Attendance', attendanceSchema);
export default Attendance;
