import Employee from '../models/Employee.js';
import Department from '../models/Department.js';
import Leave from '../models/Leave.js';
import Salary from '../models/Salary.js';

const getSummary = async (req, res) => {
    try {
        const totalEmployees    = await Employee.countDocuments();
        const totalDepartments  = await Department.countDocuments();

// Sum ALL salary records across all employees (matches breakdown page)
const salaryAgg = await Salary.aggregate([
    { $group: { _id: '$employeeId', totalNet: { $sum: '$netSalary' } } },
    { $group: { _id: null, totalSalary: { $sum: '$totalNet' } } }
])
const empSalaryAgg = await Employee.aggregate([
    { $group: { _id: null, totalSalary: { $sum: '$salary' } } }
])

const totalSalary = salaryAgg[0]?.totalSalary || empSalaryAgg[0]?.totalSalary || 0

        const employeeAppliedForLeave = await Leave.distinct('employeeId')
        const leaveStatus = await Leave.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ])
        const leaveSummary = {
            appliedFor: employeeAppliedForLeave.length,
            approved:   leaveStatus.find(i => i._id === 'Approved')?.count || 0,
            rejected:   leaveStatus.find(i => i._id === 'Rejected')?.count || 0,
            pending:    leaveStatus.find(i => i._id === 'Pending')?.count  || 0,
        }

        return res.status(200).json({ success: true, totalEmployees, totalDepartments, totalSalary, leaveSummary })
    } catch (error) {
        return res.status(500).json({ success: false, error: 'Error fetching dashboard summary' })
    }
}

// New: Get per-employee salary breakdown for the salary detail page
const getSalaryBreakdown = async (req, res) => {
    try {
        const all = await Salary.find()
            .populate({
                path: 'employeeId',
                select: 'employeeId userId department salary',
                populate: [
                    { path: 'userId', select: 'name profileImage email' },
                    { path: 'department', select: 'dep_name' }
                ]
            })
            .sort({ payDate: -1 })

        // Group by employee, sum all their salary records
        const map = {}
        for (const s of all) {
            const empId = s.employeeId?._id?.toString()
            if (!empId) continue
if (!map[empId]) {
    map[empId] = {
        _id: s._id,
        employeeId: s.employeeId,
        basicSalary: s.basicSalary || 0,  // latest basic (first record since sorted by date desc)
        allowances: 0,
        deductions: 0,
        netSalary: 0,
        payDate: s.payDate,
        count: 0
    }
}
map[empId].allowances += s.allowances || 0
map[empId].deductions += s.deductions || 0
map[empId].netSalary  += s.netSalary  || 0
map[empId].count      += 1
        }

        const salaries = Object.values(map)
        return res.status(200).json({ success: true, salaries })
    } catch (error) {
        return res.status(500).json({ success: false, error: 'Error fetching salary breakdown' })
    }
}

const getAllSalaries = async (req, res) => {
    try {
        const salaries = await Salary.find()
            .populate({
                path: 'employeeId',
                select: 'employeeId userId department',
                populate: [
                    { path: 'userId', select: 'name profileImage' },
                    { path: 'department', select: 'dep_name' }
                ]
            })
            .sort({ payDate: -1 })
        return res.status(200).json({ success: true, salaries })
    } catch (error) {
        return res.status(500).json({ success: false, error: 'Error fetching all salaries' })
    }
}

export { getSummary, getSalaryBreakdown, getAllSalaries }
