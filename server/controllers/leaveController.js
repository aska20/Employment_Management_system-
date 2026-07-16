import Leave from '../models/Leave.js'
import Employee from '../models/Employee.js'
import LeaveBalance from '../models/LeaveBalance.js'
import Salary from '../models/Salary.js'
import { createNotification } from './notificationController.js'

// ── Leave Policy ─────────────────────────────────────────
const POLICY = {
    'Annual Leave': {
        balanceKey:       'annualLeave',
        maxPerRequest:    5,        // max 5 days at once
        minNoticeDays:    7,        // must apply 7 days before
        minGapDays:       14,       // 14 days between requests
        maxPerMonth:      null,     // no monthly cap
    },
    'Sick Leave': {
        balanceKey:       'sickLeave',
        maxPerRequest:    null,     // no limit (illness)
        minNoticeDays:    0,        // no notice needed
        minGapDays:       0,        // no gap
        maxPerMonth:      null,     // no monthly limit
        flagAfter:        3,        // flag admin if 3+ in 30 days
    },
    'Casual Leave': {
        balanceKey:       'casualLeave',
        maxPerRequest:    3,        // max 3 days per request
        minNoticeDays:    1,        // 1 day notice
        minGapDays:       7,        // 7 days between requests
        maxPerMonth:      3,        // max 3 casual days per month
    },
}

// ── Helpers ──────────────────────────────────────────────

const getDuration = (start, end) => {
    const s = new Date(start), e = new Date(end)
    return Math.ceil((e - s) / 86400000) + 1
}

const getOrCreateBalance = async (employeeId, year) => {
    let balance = await LeaveBalance.findOne({ employeeId, year })
    if (!balance) {
        balance = await LeaveBalance.create({ employeeId, year })
    }
    return balance
}

// ── Validate leave request ───────────────────────────────
const validateLeaveRequest = async (employee, leaveType, startDate, endDate, excludeLeaveId = null) => {
    const errors = []
    const warnings = []
    const policy  = POLICY[leaveType]
    const start   = new Date(startDate)
    const end     = new Date(endDate)
    const today   = new Date(); today.setHours(0,0,0,0)
    const duration = getDuration(start, end)

    // 1. End after start
    if (end < start) {
        errors.push('End date must be after start date.')
    }

    // 2. Start not in past
    if (start < today) {
        errors.push('Leave cannot start in the past.')
    }

    // 3. Notice period
    if (policy.minNoticeDays > 0) {
        const noticeDays = Math.ceil((start - today) / 86400000)
        if (noticeDays < policy.minNoticeDays) {
            errors.push(`${leaveType} requires at least ${policy.minNoticeDays} day(s) advance notice. Please apply by ${new Date(start - policy.minNoticeDays * 86400000).toLocaleDateString()}.`)
        }
    }

    // 4. Max per request
    if (policy.maxPerRequest && duration > policy.maxPerRequest) {
        errors.push(`${leaveType} allows maximum ${policy.maxPerRequest} days per request. You requested ${duration} days.`)
    }

    // 5. Gap between requests of same type
    if (policy.minGapDays > 0) {
        const query = {
            employeeId: employee._id,
            leaveType,
            status: { $ne: 'Rejected' }
        }
        if (excludeLeaveId) query._id = { $ne: excludeLeaveId }

        const recentLeave = await Leave.findOne(query).sort({ endDate: -1 })
        if (recentLeave) {
            const lastEnd    = new Date(recentLeave.endDate)
            const gapDays    = Math.ceil((start - lastEnd) / 86400000)
            if (gapDays < policy.minGapDays) {
                const nextAllowed = new Date(lastEnd)
                nextAllowed.setDate(nextAllowed.getDate() + policy.minGapDays)
                errors.push(`You must wait ${policy.minGapDays} days between ${leaveType} requests. You can apply again from ${nextAllowed.toLocaleDateString()}.`)
            }
        }
    }

    // 6. Monthly cap (Casual Leave)
    if (policy.maxPerMonth) {
        const monthStart = new Date(start.getFullYear(), start.getMonth(), 1)
        const monthEnd   = new Date(start.getFullYear(), start.getMonth() + 1, 0)
        const query = {
            employeeId: employee._id,
            leaveType,
            status: { $ne: 'Rejected' },
            startDate: { $gte: monthStart, $lte: monthEnd }
        }
        if (excludeLeaveId) query._id = { $ne: excludeLeaveId }

        const monthLeaves = await Leave.find(query)
        const usedThisMonth = monthLeaves.reduce((sum, l) => sum + getDuration(l.startDate, l.endDate), 0)

        if (usedThisMonth + duration > policy.maxPerMonth) {
            errors.push(`${leaveType} monthly limit is ${policy.maxPerMonth} days. You have used ${usedThisMonth} days this month. You can request ${Math.max(0, policy.maxPerMonth - usedThisMonth)} more day(s).`)
        }
    }

    // 7. Sick leave frequency warning
    if (leaveType === 'Sick Leave' && policy.flagAfter) {
        const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        const recentSick = await Leave.countDocuments({
            employeeId: employee._id,
            leaveType: 'Sick Leave',
            status: { $ne: 'Rejected' },
            appliedAt: { $gte: thirtyDaysAgo }
        })
        if (recentSick >= policy.flagAfter) {
            warnings.push(`This employee has taken ${recentSick} sick leaves in the last 30 days. Admin will be notified.`)
        }
    }

    return { errors, warnings }
}

// ── Calculate paid/unpaid split ──────────────────────────
const calculatePaidUnpaid = async (employeeId, leaveType, duration, year) => {
    const balance     = await getOrCreateBalance(employeeId, year)
    const policy      = POLICY[leaveType]
    const balanceData = balance[policy.balanceKey]
    const remaining   = balanceData.remaining

    const paidDays   = Math.min(duration, remaining)
    const unpaidDays = Math.max(0, duration - remaining)

    // Get employee salary for deduction calculation
    let salaryDeduction = 0
    if (unpaidDays > 0) {
        const emp    = await Employee.findById(employeeId)
        const salary = await Salary.findOne({ employeeId }).sort({ payDate: -1 })
        const monthlySalary = salary?.basicSalary || emp?.salary || 0
        const dailyRate     = monthlySalary / 26  // 26 working days per month
        salaryDeduction     = Math.round(dailyRate * unpaidDays)
    }

    return { paidDays, unpaidDays, isPaid: unpaidDays === 0, salaryDeduction }
}

// ── Controllers ──────────────────────────────────────────

const addLeave = async (req, res) => {
    try {
        const { userId, leaveType, startDate, endDate, reason } = req.body
        const employee = await Employee.findOne({ userId }).populate('userId')
        if (!employee) return res.status(404).json({ success: false, error: 'Employee not found' })

        // Validate
        const { errors, warnings } = await validateLeaveRequest(employee, leaveType, startDate, endDate)
        if (errors.length > 0) {
            return res.status(400).json({ success: false, error: errors[0], errors, warnings })
        }

        const start    = new Date(startDate)
        const duration = getDuration(startDate, endDate)
        const year     = start.getFullYear()

        // Calculate paid/unpaid
        const { paidDays, unpaidDays, isPaid, salaryDeduction } = await calculatePaidUnpaid(
            employee._id, leaveType, duration, year
        )

        // Save leave
        const newLeave = new Leave({
            employeeId: employee._id,
            leaveType, startDate, endDate, reason,
            isPaid, paidDays, unpaidDays, salaryDeduction
        })
        await newLeave.save()

        const empName   = employee.userId?.name
        const empUserId = employee.userId?._id
        const fromDate  = new Date(startDate).toLocaleDateString()
        const toDate    = new Date(endDate).toLocaleDateString()
        const paidLabel = unpaidDays > 0
            ? `(${paidDays} paid + ${unpaidDays} unpaid${salaryDeduction > 0 ? `, Rs.${salaryDeduction.toLocaleString()} deduction` : ''})`
            : '(fully paid)'

        // Admin notification
        await createNotification(
            'leave_applied',
            `${empName} applied for ${leaveType} from ${fromDate} to ${toDate} - ${duration} days ${paidLabel}`,
            `/admin-dashboard/leaves/${newLeave._id}`,
            'admin'
        )

        // Flag sick leave abuse
        if (warnings.length > 0) {
            await createNotification(
                'leave_applied',
                `Sick leave alert: ${empName} has frequent sick leaves. Review may be needed.`,
                `/admin-dashboard/leaves`,
                'admin'
            )
        }

        // Employee confirmation
        await createNotification(
            'leave_applied',
            `Your ${leaveType} request from ${fromDate} to ${toDate} has been submitted. ${paidLabel}`,
            `/employee-dashboard/leaves/${userId}`,
            'employee',
            empUserId
        )

        return res.status(200).json({ success: true, warnings, paidDays, unpaidDays, salaryDeduction })
    } catch (error) {
        console.error(error)
        return res.status(500).json({ success: false, error: 'Failed to submit leave request' })
    }
}

const getLeave = async (req, res) => {
    try {
        const { id, role } = req.params
        let leaves
        if (role === 'admin') {
            leaves = await Leave.find({ employeeId: id })
        } else {
            const employee = await Employee.findOne({ userId: id })
            leaves = await Leave.find({ employeeId: employee._id })
        }
        return res.status(200).json({ success: true, leaves })
    } catch (error) {
        return res.status(500).json({ success: false, error: 'Failed to get leaves' })
    }
}

const getLeaves = async (req, res) => {
    try {
        const leaves = await Leave.find().populate({
            path: 'employeeId',
            populate: [
                { path: 'department', select: 'dep_name' },
                { path: 'userId', select: 'name' }
            ]
        }).sort({ appliedAt: -1 })
        return res.status(200).json({ success: true, leaves })
    } catch (error) {
        return res.status(500).json({ success: false, error: 'Failed to get all leaves' })
    }
}

const getLeaveDetail = async (req, res) => {
    try {
        const { id } = req.params
        const leave = await Leave.findById(id).populate({
            path: 'employeeId',
            populate: [
                { path: 'department', select: 'dep_name' },
                { path: 'userId', select: 'name profileImage' }
            ]
        })
        return res.status(200).json({ success: true, leave })
    } catch (error) {
        return res.status(500).json({ success: false, error: 'Failed to get leave detail' })
    }
}

const updateLeave = async (req, res) => {
    try {
        const { id } = req.params
        const { status } = req.body

        const leave = await Leave.findById(id).populate({
            path: 'employeeId',
            populate: { path: 'userId', select: 'name _id' }
        })
        if (!leave) return res.status(404).json({ success: false, error: 'Leave not found' })

        const oldStatus = leave.status

        // Update status
        leave.status    = status
        leave.updatedAt = new Date()
        await leave.save()

        // If approved — deduct from leave balance
        if (status === 'Approved' && oldStatus !== 'Approved') {
            const year    = new Date(leave.startDate).getFullYear()
            const policy  = POLICY[leave.leaveType]
            const balance = await getOrCreateBalance(leave.employeeId._id, year)

            const balanceField = policy.balanceKey
            const deductPaid   = Math.min(leave.paidDays, balance[balanceField].remaining)

            balance[balanceField].used      += deductPaid
            balance[balanceField].remaining  = Math.max(0, balance[balanceField].remaining - deductPaid)
            balance.unpaidDays              += leave.unpaidDays
            balance.updatedAt               = new Date()
            await balance.save()
        }

        // If previously approved but now rejected — restore balance
        if (status === 'Rejected' && oldStatus === 'Approved') {
            const year    = new Date(leave.startDate).getFullYear()
            const policy  = POLICY[leave.leaveType]
            const balance = await getOrCreateBalance(leave.employeeId._id, year)

            const balanceField = policy.balanceKey
            balance[balanceField].used      = Math.max(0, balance[balanceField].used - leave.paidDays)
            balance[balanceField].remaining  = balance[balanceField].total - balance[balanceField].used
            balance.unpaidDays              = Math.max(0, balance.unpaidDays - leave.unpaidDays)
            balance.updatedAt               = new Date()
            await balance.save()
        }

        // Notify employee
        const empUserId = leave.employeeId?.userId?._id
        if (empUserId) {
            const msg = status === 'Approved'
                ? `Your ${leave.leaveType} request has been approved.${leave.unpaidDays > 0 ? ` Note: ${leave.unpaidDays} day(s) are unpaid. Salary deduction: Rs.${leave.salaryDeduction?.toLocaleString()}.` : ''}`
                : `Your ${leave.leaveType} request has been rejected.`

            await createNotification(
                status === 'Approved' ? 'leave_approved' : 'leave_rejected',
                msg,
                `/employee-dashboard/leaves/${empUserId}`,
                'employee',
                empUserId
            )
        }

        return res.status(200).json({ success: true })
    } catch (error) {
        console.error(error)
        return res.status(500).json({ success: false, error: 'Failed to update leave' })
    }
}

const getLeavesByEmployee = async (req, res) => {
    try {
        const { empId } = req.params
        const leaves = await Leave.find({ employeeId: empId }).sort({ appliedAt: -1 })
        return res.status(200).json({ success: true, leaves })
    } catch (error) {
        return res.status(500).json({ success: false, error: 'Failed to get employee leaves' })
    }
}

// Get leave balance for an employee
const getLeaveBalance = async (req, res) => {
    try {
        const { userId } = req.params
        const employee   = await Employee.findOne({ userId })
        if (!employee) return res.status(404).json({ success: false, error: 'Employee not found' })

        const year    = new Date().getFullYear()
        const balance = await getOrCreateBalance(employee._id, year)

        return res.status(200).json({ success: true, balance, policy: POLICY })
    } catch (error) {
        return res.status(500).json({ success: false, error: 'Failed to get leave balance' })
    }
}

// Validate leave without submitting (for real-time feedback)
const checkLeaveValidation = async (req, res) => {
    try {
        const { userId, leaveType, startDate, endDate } = req.body
        const employee = await Employee.findOne({ userId })
        if (!employee) return res.status(404).json({ success: false, error: 'Employee not found' })

        const { errors, warnings } = await validateLeaveRequest(employee, leaveType, startDate, endDate)

        const start    = startDate && endDate ? new Date(startDate) : new Date()
        const duration = startDate && endDate ? getDuration(startDate, endDate) : 0
        const year     = start.getFullYear()

        let paidInfo = null
        if (duration > 0 && leaveType) {
            const { paidDays, unpaidDays, salaryDeduction } = await calculatePaidUnpaid(
                employee._id, leaveType, duration, year
            )
            paidInfo = { paidDays, unpaidDays, salaryDeduction, duration }
        }

        return res.status(200).json({ success: true, valid: errors.length === 0, errors, warnings, paidInfo })
    } catch (error) {
        return res.status(500).json({ success: false, error: 'Validation error' })
    }
}

// Get all balances (admin)
const getAllBalances = async (req, res) => {
    try {
        const year     = new Date().getFullYear()
        const balances = await LeaveBalance.find({ year }).populate({
            path: 'employeeId',
            populate: [
                { path: 'userId', select: 'name profileImage' },
                { path: 'department', select: 'dep_name' }
            ]
        })
        return res.status(200).json({ success: true, balances })
    } catch (error) {
        return res.status(500).json({ success: false, error: 'Failed to get balances' })
    }
}

export {
    addLeave, getLeave, getLeaves, getLeaveDetail,
    updateLeave, getLeavesByEmployee,
    getLeaveBalance, checkLeaveValidation, getAllBalances
}
