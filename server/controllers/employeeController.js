import Employee from "../models/Employee.js"
import User from "../models/User.js"
import bcrypt from 'bcrypt'
import multer from 'multer'
import path from 'path'
import Department from "../models/Department.js"
import { sendWelcomeEmail } from '../utils/emailService.js'

const storage = multer.diskStorage({
    destination: (req, file, cb) => { cb(null, 'public/uploads') },
    filename:    (req, file, cb) => { cb(null, Date.now() + path.extname(file.originalname)) }
})
const upload = multer({ storage })

const addEmployee = async (req, res) => {
    try {
        const { name, email, employeeId, dob, gender, maritalStatus, designation, department, salary, password, role } = req.body;
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ success: false, error: 'User already registered' });

        const hashPassword = await bcrypt.hash(password, 10);
        const newUser = new User({
            name, email,
            password:           hashPassword,
            role,
            profileImage:       req.file ? req.file.filename : "",
            isFirstLogin:       true,
            mustChangePassword: true,
        });
        const savedUser = await newUser.save();
        const newEmployee = new Employee({ userId: savedUser._id, employeeId, dob, gender, maritalStatus, designation, department, salary });
        await newEmployee.save();

        // Send welcome email with temp password (best-effort — don't fail if email fails)
        let emailSent = false;
        let emailError = null;
        try {
            await sendWelcomeEmail({ toEmail: email, toName: name, tempPassword: password });
            emailSent = true;
        } catch (err) {
            emailError = err.message;
        }

        return res.status(200).json({
            success: true,
            message: emailSent
                ? 'Employee created and welcome email sent successfully.'
                : 'Employee created. Welcome email could not be sent - check email settings in Admin Settings.',
            emailSent,
            emailError,
        });
    } catch (error) {
        return res.status(500).json({ success: false, error: 'Server Error in adding employee' });
    }
}

const getEmployees = async (req, res) => {
    try {
        const employees = await Employee.find().populate('userId', { password: 0 }).populate('department');
        return res.status(200).json({ success: true, employees });
    } catch (error) {
        return res.status(500).json({ success: false, error: "Get Employee Server Error" });
    }
}

const getEmployee = async (req, res) => {
    const { id } = req.params;
    try {
        let employee = await Employee.findById(id).populate('userId', { password: 0 }).populate('department');
        if (!employee) {
            employee = await Employee.findOne({ userId: id }).populate('userId', { password: 0 }).populate('department');
        }
        return res.status(200).json({ success: true, employee });
    } catch (error) {
        return res.status(500).json({ success: false, error: "Get Employee Server Error" });
    }
}

const updateEmployee = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, maritalStatus, designation, department, salary } = req.body;
        const employee = await Employee.findById(id);
        if (!employee) return res.status(404).json({ success: false, error: "Employee Not Found" });
        await User.findByIdAndUpdate(employee.userId, { name });
        await Employee.findByIdAndUpdate(id, { maritalStatus, designation, salary, department });
        return res.status(200).json({ success: true, message: "Employee Updated" });
    } catch (error) {
        return res.status(500).json({ success: false, error: "Update Employee Server Error" });
    }
}

const deleteEmployee = async (req, res) => {
    try {
        const { id } = req.params;
        const employee = await Employee.findById(id);
        if (!employee) return res.status(404).json({ success: false, error: 'Employee not found' });
        await User.findByIdAndDelete(employee.userId);
        await Employee.findByIdAndDelete(id);
        return res.status(200).json({ success: true, message: 'Employee deleted successfully' });
    } catch (error) {
        return res.status(500).json({ success: false, error: 'Delete employee server error' });
    }
}

const fetchEmployeesByDepId = async (req, res) => {
    const { id } = req.params;
    try {
        const employees = await Employee.find({ department: id });
        return res.status(200).json({ success: true, employees });
    } catch (error) {
        return res.status(500).json({ success: false, error: "Get EmployeebyDepId Server Error" });
    }
}

export { addEmployee, upload, getEmployees, getEmployee, updateEmployee, fetchEmployeesByDepId, deleteEmployee };
