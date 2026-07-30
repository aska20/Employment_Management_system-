import Salary from "../models/Salary.js";
import Employee from "../models/Employee.js";
import Leave from "../models/Leave.js";
import { createNotification } from "./notificationController.js";

const addSalary = async (req, res) => {
    try {
        const { employeeId, basicSalary, allowances, deductions, payDate } = req.body;
        const basic  = parseInt(basicSalary)  || 0;
        const allow  = parseInt(allowances)   || 0;
        let   deduct = parseInt(deductions)   || 0;

        // Auto-fold in unpaid-leave deductions for this employee that
        // haven't been applied to a salary record yet (e.g. an Annual
        // Leave request that went over the monthly/yearly balance and
        // was approved as partly unpaid). This is what was missing
        // before — unpaidDays/salaryDeduction were being calculated and
        // stored on the Leave doc, but never actually pulled into
        // payroll.
        const pay = payDate ? new Date(payDate) : new Date()
        const periodStart = new Date(pay.getFullYear(), pay.getMonth(), 1)
        const periodEnd   = new Date(pay.getFullYear(), pay.getMonth() + 1, 0)

        const unpaidLeaves = await Leave.find({
            employeeId,
            status: 'Approved',
            unpaidDays: { $gt: 0 },
            deductionApplied: false,
            startDate: { $gte: periodStart, $lte: periodEnd },
        })
        const leaveDeduction = unpaidLeaves.reduce((sum, l) => sum + (l.salaryDeduction || 0), 0)
        deduct += leaveDeduction

        if (deduct > basic + allow) {
            return res.status(400).json({ success: false, error: 'Deductions (including unpaid leave) cannot exceed Basic Salary + Allowances.' });
        }

        const totalSalary = basic + allow - deduct;
        const newSalary = new Salary({ employeeId, basicSalary: basic, allowances: allow, deductions: deduct, netSalary: totalSalary, payDate });
        await newSalary.save();

        if (unpaidLeaves.length) {
            await Leave.updateMany(
                { _id: { $in: unpaidLeaves.map(l => l._id) } },
                { $set: { deductionApplied: true } }
            )
        }

        // Find employee to get userId for notification
        const employee = await Employee.findById(employeeId).populate('userId', 'name');
        if (employee?.userId) {
            const payDateStr = payDate ? new Date(payDate).toLocaleDateString('en-NP') : 'today';
            const deductionNote = leaveDeduction > 0
                ? ` (includes Rs. ${leaveDeduction.toLocaleString()} unpaid-leave deduction)`
                : '';
            await createNotification(
                'salary_paid',
                `Your salary of Rs. ${totalSalary.toLocaleString()} has been credited for ${payDateStr}${deductionNote}.`,
                '/employee-dashboard/salary',
                'employee',
                employee.userId._id
            );
        }

        return res.status(200).json({ success: true, leaveDeduction });
    } catch (error) {
        return res.status(500).json({ success: false, error: 'salary add server error' });
    }
}

const getSalary = async (req, res) => {
    try {
        const { id, role } = req.params;
        let salary;
        if (role === 'admin') {
            salary = await Salary.find({ employeeId: id }).populate('employeeId', 'employeeId');
        } else {
            const employee = await Employee.findOne({ userId: id });
            salary = await Salary.find({ employeeId: employee._id }).populate('employeeId', 'employeeId');
        }
        return res.status(200).json({ success: true, salary });
    } catch (error) {
        return res.status(500).json({ success: false, error: 'salary get server error' });
    }
}

export { addSalary, getSalary };