import Attendance from '../models/Attendance.js'
import Employee from '../models/Employee.js'
import User from '../models/User.js'
import Notification from '../models/Notification.js'
import { createNotification } from './notificationController.js'

const markAttendance = async (req, res) => {
    try {
        const { employeeId, date, checkIn, checkInMinutes, status, lateMinutes, markedBy } = req.body
        const existing = await Attendance.findOne({ employeeId, date })
        if (existing) return res.status(400).json({ success: false, error: 'Attendance already marked' })
        const att = new Attendance({ employeeId, date, checkIn, checkInMinutes, status, lateMinutes, markedBy: markedBy || 'office_face_recognition' })
        await att.save()
        return res.status(200).json({ success: true, message: 'Attendance marked' })
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message })
    }
}

const markCheckout = async (req, res) => {
    try {
        const { employeeId, date, checkOut, checkOutMinutes, workedMinutes, earlyExitReason } = req.body
        const att = await Attendance.findOne({ employeeId, date })
        if (!att) return res.status(404).json({ success: false, error: 'No check-in found for today' })

        const isEarlyExit = workedMinutes < 480 && earlyExitReason
        await Attendance.findByIdAndUpdate(att._id, {
            checkOut,
            checkOutMinutes,
            workedMinutes,
            earlyExitReason: earlyExitReason || '',
            earlyExitStatus: isEarlyExit ? 'pending' : 'none',
        })

        // If early exit, notify admin
        if (isEarlyExit) {
            const employee   = await Employee.findById(employeeId).populate('userId', 'name')
            const empName    = employee?.userId?.name || 'An employee'
            const hours      = Math.floor(workedMinutes / 60)
            const mins       = workedMinutes % 60

            // Create actionable notification for admin
            await Notification.create({
                type:         'early_exit_request',
                message:      `${empName} wants to leave early worked ${hours}h ${mins}m of 8h required. Reason: "${earlyExitReason}"`,
                link:         `/admin-dashboard/attendance`,
                forRole:      'admin',
                attendanceId: att._id,
                actionable:   true,
                actionStatus: 'pending',
            })
        }

        return res.status(200).json({ success: true, message: 'Checkout recorded' })
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message })
    }
}

// Admin approves or rejects early exit request
const handleEarlyExitRequest = async (req, res) => {
    try {
        const { attendanceId, notificationId, action } = req.body  // action: 'approve' | 'reject'
        if (!['approve', 'reject'].includes(action))
            return res.status(400).json({ success: false, error: 'Action must be approve or reject' })

        const att = await Attendance.findById(attendanceId).populate({ path: 'employeeId', populate: { path: 'userId', select: 'name _id' } })
        if (!att) return res.status(404).json({ success: false, error: 'Attendance record not found' })

        const status = action === 'approve' ? 'approved' : 'rejected'

        // If approved — write the actual checkout time that was pending
        const updateData = { earlyExitStatus: status }
        if (action === 'approve') {
            const attRecord = await Attendance.findById(attendanceId)
            if (attRecord?.pendingCheckOut) {
                updateData.checkOut        = attRecord.pendingCheckOut
                // workedMinutes is already stored correctly as pendingWorkedMins
                // (it's checkOut_mins - checkIn_mins, calculated at time of request)
                updateData.workedMinutes   = attRecord.pendingWorkedMins
                updateData.checkOutMinutes = (attRecord.checkInMinutes || 0) + attRecord.pendingWorkedMins
            }
        }
        await Attendance.findByIdAndUpdate(attendanceId, updateData)

        // Update the notification
        await Notification.findByIdAndUpdate(notificationId, { actionStatus: status, isRead: true })

        // Notify employee of decision
        const empUserId  = att.employeeId?.userId?._id
        const empName    = att.employeeId?.userId?.name || 'Employee'
        // Use pendingWorkedMins for early exit (actual worked time when request was made)
        const actualWorked = att.pendingWorkedMins || att.workedMinutes || 0
        const hours      = Math.floor(actualWorked / 60)
        const mins       = actualWorked % 60

        if (empUserId) {
            await Notification.create({
                type:      action === 'approve' ? 'early_exit_approved' : 'early_exit_rejected',
                message:   action === 'approve'
                    ? `Your early exit request for ${att.date} was approved. You worked ${hours}h ${mins}m out of 8 hours required.`
                    : `Your early exit request for ${att.date} was rejected. Please remain at work until completing 8 hours.`,
                forRole:   'employee',
                forUserId: empUserId,
            })
        }

        return res.status(200).json({ success: true, message: `Early exit request ${status}` })
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message })
    }
}

const runDailyAbsentCheck = async (req, res) => {
    try {
        const today     = new Date()
        const dateStr   = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`
        const employees = await Employee.find().populate('userId', 'name')
        let count = 0
        for (const emp of employees) {
            const existing = await Attendance.findOne({ employeeId: emp._id, date: dateStr })
            if (!existing) {
                await Attendance.create({ employeeId: emp._id, date: dateStr, status: 'Absent', markedBy: 'system' })
                await createNotification('attendance_absent', `${emp.userId?.name} was absent on ${dateStr}`, '/admin-dashboard/attendance')
                count++
            }
        }
        return res.status(200).json({ success: true, message: `Marked ${count} employees absent` })
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message })
    }
}

const getEmployeeAttendance = async (req, res) => {
    try {
        const { userId } = req.params
        const { month, year } = req.query
        const employee = await Employee.findOne({ userId })
        if (!employee) return res.status(404).json({ success: false, error: 'Employee not found' })
        const query = { employeeId: employee._id }
        if (month && year) query.date = { $regex: `^${year}-${String(month).padStart(2,'0')}` }
        const attendance = await Attendance.find(query).sort({ date: -1 })
        return res.status(200).json({ success: true, attendance })
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message })
    }
}

const getDailyAttendance = async (req, res) => {
    try {
        const { date } = req.params
        const attendance = await Attendance.find({ date }).populate({
            path: 'employeeId',
            populate: [{ path: 'userId', select: 'name profileImage' }, { path: 'department', select: 'dep_name' }]
        })
        return res.status(200).json({ success: true, attendance })
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message })
    }
}

const getMonthlyAttendance = async (req, res) => {
    try {
        const { month, year } = req.params
        const attendance = await Attendance.find({
            date: { $regex: `^${year}-${String(month).padStart(2,'0')}` }
        }).populate({
            path: 'employeeId',
            populate: [{ path: 'userId', select: 'name profileImage' }, { path: 'department', select: 'dep_name' }]
        }).sort({ date: -1 })
        return res.status(200).json({ success: true, attendance })
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message })
    }
}


// Called by face service when employee requests early exit
// Creates admin notification with approve/reject action
const notifyEarlyExit = async (req, res) => {
    try {
        const { attendanceId, employeeId, employeeName, workedMinutes, reason } = req.body
        const hours = Math.floor(workedMinutes / 60)
        const mins  = workedMinutes % 60

        await Notification.create({
            type:         'early_exit_request',
            message:      `${employeeName} wants to leave early - worked ${hours}h ${mins}m of 8h required. Reason: "${reason}"`,
            link:         '/admin-dashboard/attendance',
            forRole:      'admin',
            attendanceId: attendanceId,
            actionable:   true,
            actionStatus: 'pending',
        })

        return res.status(200).json({ success: true })
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message })
    }
}

export { markAttendance, markCheckout, handleEarlyExitRequest, notifyEarlyExit, runDailyAbsentCheck, getEmployeeAttendance, getDailyAttendance, getMonthlyAttendance }
