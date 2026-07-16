import mongoose from "mongoose";
const { Schema } = mongoose;

const notificationSchema = new Schema({
    type: {
        type: String,
        enum: [
            'leave_applied', 'leave_approved', 'leave_rejected',
            'holiday_declared', 'attendance_absent',
'early_exit_request', 'early_exit_approved', 'early_exit_rejected', 'salary_paid'
        ],
        required: true
    },
    message:    { type: String, required: true },
    link:       { type: String, default: '' },
    isRead:     { type: Boolean, default: false },
    forRole:    { type: String, enum: ['admin', 'employee', 'all'], default: 'admin' },
    forUserId:  { type: Schema.Types.ObjectId, ref: 'User', default: null },
    // For early exit requests — stores attendance ID so admin can approve/reject
    attendanceId: { type: Schema.Types.ObjectId, ref: 'Attendance', default: null },
    actionable:   { type: Boolean, default: false },   // true = admin can act on this
    actionStatus: { type: String, enum: ['pending', 'approved', 'rejected', 'na'], default: 'na' },
    createdAt:    { type: Date, default: Date.now }
});

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
