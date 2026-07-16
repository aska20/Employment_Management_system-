import mongoose from 'mongoose'
const { Schema } = mongoose

const leaveBalanceSchema = new Schema({
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    year:       { type: Number, required: true },

    annualLeave:  {
        total:     { type: Number, default: 14 },
        used:      { type: Number, default: 0  },
        remaining: { type: Number, default: 14 },
    },
    sickLeave: {
        total:     { type: Number, default: 8 },
        used:      { type: Number, default: 0 },
        remaining: { type: Number, default: 8 },
    },
    casualLeave: {
        total:     { type: Number, default: 6 },
        used:      { type: Number, default: 0 },
        remaining: { type: Number, default: 6 },
    },

    unpaidDays: { type: Number, default: 0 },  // total unpaid days taken this year
    createdAt:  { type: Date, default: Date.now },
    updatedAt:  { type: Date, default: Date.now },
})

leaveBalanceSchema.index({ employeeId: 1, year: 1 }, { unique: true })

const LeaveBalance = mongoose.model('LeaveBalance', leaveBalanceSchema)
export default LeaveBalance
