import mongoose from 'mongoose'
const { Schema } = mongoose

const leaveSchema = new Schema({
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    leaveType: {
        type: String,
        enum: ['Sick Leave', 'Casual Leave', 'Annual Leave'],
        required: true
    },
    startDate:  { type: Date, required: true },
    endDate:    { type: Date, required: true },
    reason:     { type: String, required: true },
    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected'],
        default: 'Pending'
    },

    // Paid/Unpaid tracking
    isPaid:          { type: Boolean, default: true },
    paidDays:        { type: Number,  default: 0 },   // days covered by balance
    unpaidDays:      { type: Number,  default: 0 },   // days beyond balance
    salaryDeduction: { type: Number,  default: 0 },   // Rs. deducted for unpaid days

    appliedAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
})

const Leave = mongoose.model('Leave', leaveSchema)
export default Leave
