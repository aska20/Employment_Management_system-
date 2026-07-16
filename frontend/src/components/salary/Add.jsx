import React, { useEffect, useState } from 'react'
import { fetchDepartments, getEmployees } from '../../utils/EmployeeHelper'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { API_BASE } from '../../utils/apiConfig'
import { FaInfoCircle, FaExclamationTriangle, FaCheckCircle, FaCalendarTimes } from 'react-icons/fa'

const Add = () => {
    const [salary, setSalary]     = useState({ employeeId:'', basicSalary:'', allowances:'', deductions:'', payDate:'' })
    const [departments, setDepartments] = useState(null)
    const [employees, setEmployees]     = useState([])
    const [error, setError]             = useState('')
    const [empSalary, setEmpSalary]     = useState(null)
    const [salaryWarning, setSalaryWarning] = useState('')
    const [unpaidInfo, setUnpaidInfo]   = useState(null)  // unpaid leave deduction
    const navigate = useNavigate()

    useEffect(() => { fetchDepartments().then(setDepartments) }, [])

    const handleDepartment = async (e) => {
        setEmployees(await getEmployees(e.target.value))
        setSalary(p => ({ ...p, employeeId: '', basicSalary: '', allowances: '', deductions: '' }))
        setEmpSalary(null); setSalaryWarning(''); setUnpaidInfo(null)
    }

    const handleEmployeeChange = async (e) => {
        const empId = e.target.value
        setSalary(p => ({ ...p, employeeId: empId }))
        setSalaryWarning(''); setUnpaidInfo(null)
        if (!empId) { setEmpSalary(null); return }

        try {
            const r = await axios.get(`${API_BASE}/api/employee/${empId}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            })
            if (r.data.success) {
                const sal = r.data.employee?.salary
                setEmpSalary(sal || null)
                if (sal) setSalary(p => ({ ...p, employeeId: empId, basicSalary: sal }))
            }

            // Fetch unpaid leave deductions for this month
            const payMonth = salary.payDate ? new Date(salary.payDate) : new Date()
            const year  = payMonth.getFullYear()
            const month = payMonth.getMonth() + 1
            const leaveRes = await axios.get(`${API_BASE}/api/leave/${empId}/admin`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            })
            if (leaveRes.data.success) {
                const approvedUnpaid = leaveRes.data.leaves.filter(l =>
                    l.status === 'Approved' &&
                    l.unpaidDays > 0 &&
                    new Date(l.startDate).getFullYear() === year &&
                    new Date(l.startDate).getMonth() + 1 === month
                )
                const totalUnpaidDays = approvedUnpaid.reduce((sum, l) => sum + l.unpaidDays, 0)
                const totalDeduction  = approvedUnpaid.reduce((sum, l) => sum + (l.salaryDeduction || 0), 0)
                if (totalDeduction > 0) {
                    setUnpaidInfo({ days: totalUnpaidDays, deduction: totalDeduction, leaves: approvedUnpaid })
                    setSalary(p => ({ ...p, deductions: totalDeduction }))
                }
            }
        } catch {}
    }

    const handleChange = (e) => {
        const { name, value } = e.target
        setError('')
        setSalary(p => ({ ...p, [name]: value }))
        if (name === 'basicSalary' && empSalary) {
            const diff = parseInt(value) - parseInt(empSalary)
            if (Math.abs(diff) > 0) setSalaryWarning(`Employee recorded salary is Rs. ${parseInt(empSalary).toLocaleString()}`)
            else setSalaryWarning('')
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        const basic  = parseInt(salary.basicSalary) || 0
        const allow  = parseInt(salary.allowances)  || 0
        const deduct = parseInt(salary.deductions)  || 0
        if (basic <= 0) { setError('Basic salary must be greater than 0.'); return }
        if (deduct > basic + allow) { setError('Deductions cannot exceed Basic Salary + Allowances.'); return }
        try {
            const r = await axios.post(`${API_BASE}/api/salary/add`, salary, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            })
            if (r.data.success) navigate('/admin-dashboard/employees')
        } catch (error) { setError(error.response?.data?.error || 'Failed to add salary') }
    }

    const basic  = parseInt(salary.basicSalary) || 0
    const allow  = parseInt(salary.allowances)  || 0
    const deduct = parseInt(salary.deductions)  || 0
    const net    = basic + allow - deduct

    const inputCls = 'mt-1 p-2.5 block w-full border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white'
    const labelCls = 'block text-sm font-semibold text-stone-700'

    return (
        <div className="p-6 bg-stone-50 min-h-full">
            <div className="max-w-2xl mx-auto">
                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-stone-800">Add Salary Record</h2>

                </div>

                {!departments ? (
                    <div className="flex justify-center py-10">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
                        {error && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl flex items-start gap-2">
                                <FaExclamationTriangle className="flex-shrink-0 mt-0.5" /> {error}
                            </div>
                        )}


                        <form onSubmit={handleSubmit}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label className={labelCls}>Department</label>
                                    <select name="department" onChange={handleDepartment} className={inputCls} required>
                                        <option value="">Select Department</option>
                                        {departments.map(dep => <option key={dep._id} value={dep._id}>{dep.dep_name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className={labelCls}>Employee</label>
                                    <select name="employeeId" value={salary.employeeId} onChange={handleEmployeeChange} className={inputCls} required>
                                        <option value="">Select Employee</option>
                                        {employees.map(emp => <option key={emp._id} value={emp._id}>{emp.employeeId}- {emp.userId?.name}</option>)}
                                    </select>
                                </div>

                                <div className="md:col-span-2">
                                    <label className={labelCls}>Basic Salary (Rs.)</label>
                                    <input type="number" name="basicSalary" value={salary.basicSalary}
                                        onChange={handleChange} placeholder="e.g. 50000" min="1" className={inputCls} required />
                                    {salaryWarning && (
                                        <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                                            <FaExclamationTriangle className="text-xs" /> {salaryWarning}
                                        </p>
                                    )}

                                </div>

                                <div>
                                    <label className={labelCls}>Allowances (Rs.)</label>
                                    <input type="number" name="allowances" value={salary.allowances}
                                        onChange={handleChange} placeholder="e.g. 5000" min="0" className={inputCls} required />
                      
                                </div>

                                <div>
                                    <label className={labelCls}>Deductions (Rs.)</label>
                                    <input type="number" name="deductions" value={salary.deductions}
                                        onChange={handleChange} placeholder="e.g. 2000" min="0" className={inputCls} required />
                                   
                                </div>

                                <div className="md:col-span-2">
                                    <label className={labelCls}>Pay Date</label>
                                    <input type="date" name="payDate" onChange={handleChange} className={inputCls} required />
                                </div>
                            </div>

                            {/* Unpaid leave auto-deduction info */}
                            {unpaidInfo && (
                                <div className="mt-5 p-4 bg-red-50 border border-red-200 rounded-xl">
                                    <p className="text-sm font-bold text-red-700 flex items-center gap-2 mb-2">
                                        <FaCalendarTimes /> Unpaid Leave Deduction (auto-filled)
                                    </p>
                                    <p className="text-xs text-red-600 mb-2">
                                        This employee has <b>{unpaidInfo.days} unpaid leave day(s)</b> approved this month.
                                        Deduction of <b>Rs. {unpaidInfo.deduction.toLocaleString()}</b> has been added automatically.
                                    </p>
                                    <div className="space-y-1">
                                        {unpaidInfo.leaves.map(l => (
                                            <div key={l._id} className="text-xs text-red-500 flex justify-between">
                                                <span>{l.leaveType} - {l.unpaidDays} unpaid day(s)</span>
                                                <span>-Rs. {(l.salaryDeduction||0).toLocaleString()}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Net Salary Preview */}
                            <div className={`mt-5 p-4 rounded-xl border ${net < 0 ? 'bg-red-50 border-red-200' : 'bg-teal-50 border-teal-200'}`}>
                                <p className="text-xs font-semibold text-stone-500 mb-3">Monthly Salary Breakdown</p>
                                <div className="grid grid-cols-3 gap-3 mb-3 text-sm text-center">
                                    <div>
                                        <p className="text-stone-400 text-xs">Basic</p>
                                        <p className="font-bold text-stone-700">Rs. {basic.toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <p className="text-stone-400 text-xs">+ Allowances</p>
                                        <p className="font-bold text-emerald-600">Rs. {allow.toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <p className="text-stone-400 text-xs">− Deductions</p>
                                        <p className="font-bold text-red-500">Rs. {deduct.toLocaleString()}</p>
                                    </div>
                                </div>
                                <div className="border-t border-teal-200 pt-3 text-center">
                                    <p className="text-xs text-stone-500 mb-0.5">Net Monthly Salary</p>
                                    <p className={`text-3xl font-extrabold ${net < 0 ? 'text-red-600' : 'text-teal-700'}`}>
                                        Rs. {net.toLocaleString()}
                                    </p>
                                </div>
                                {net < 0 && <p className="text-xs text-red-500 mt-2 text-center">Net salary is negative. Reduce deductions.</p>}
                            </div>

                            <button type="submit" disabled={net < 0 || !salary.employeeId}
                                className="w-full mt-5 bg-teal-600 hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-xl transition">
                                Add Salary Record
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    )
}
export default Add
