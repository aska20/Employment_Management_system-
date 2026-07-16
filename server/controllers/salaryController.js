import Salary from "../models/Salary.js";
import Employee from "../models/Employee.js";
import { createNotification } from "./notificationController.js";

const addSalary = async (req, res) => {
    try {
        const { employeeId, basicSalary, allowances, deductions, payDate } = req.body;
        const basic  = parseInt(basicSalary)  || 0;
        const allow  = parseInt(allowances)   || 0;
        const deduct = parseInt(deductions)   || 0;

        if (deduct > basic + allow) {
            return res.status(400).json({ success: false, error: 'Deductions cannot exceed Basic Salary + Allowances.' });
        }

        const totalSalary = basic + allow - deduct;
        const newSalary = new Salary({ employeeId, basicSalary: basic, allowances: allow, deductions: deduct, netSalary: totalSalary, payDate });
        await newSalary.save();

        // Find employee to get userId for notification
        const employee = await Employee.findById(employeeId).populate('userId', 'name');
        if (employee?.userId) {
            const payDateStr = payDate ? new Date(payDate).toLocaleDateString('en-NP') : 'today';
            await createNotification(
                'salary_paid',
                `Your salary of Rs. ${totalSalary.toLocaleString()} has been credited for ${payDateStr}.`,
                '/employee-dashboard/salary',
                'employee',
                employee.userId._id
            );
        }

        return res.status(200).json({ success: true });
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