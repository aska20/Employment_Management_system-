import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { API_BASE } from '../../utils/apiConfig'
import { FaMoneyBillWave, FaArrowLeft, FaTimes, FaHistory } from 'react-icons/fa'
import { useNavigate } from 'react-router-dom'

const SalaryBreakdown = () => {
    const [salaries, setSalaries]       = useState([])
    const [allRecords, setAllRecords]   = useState([])
    const [loading, setLoading]         = useState(true)
    const [historyEmp, setHistoryEmp]   = useState(null)
    const navigate = useNavigate()

    useEffect(() => {
        // Fetch grouped (for table)
        axios.get(`${API_BASE}/api/dashboard/salary-breakdown`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }).then(r => { if (r.data.success) setSalaries(r.data.salaries) })
        .catch(() => {}).finally(() => setLoading(false))

        // Fetch all raw records (for history modal)
        axios.get(`${API_BASE}/api/dashboard/salary-all`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }).then(r => { if (r.data.success) setAllRecords(r.data.salaries) })
        .catch(() => {})
    }, [])

    const total = salaries.reduce((sum, s) => sum + (s.netSalary || 0), 0)

    const getHistory = (empId) => allRecords.filter(r => r.employeeId?._id?.toString() === empId?.toString())

    return (
        <div className="p-6 bg-gradient-to-br from-stone-100 to-stone-50 min-h-full">
            <div className="mb-6 flex items-center gap-4">
                <button onClick={() => navigate('/admin-dashboard')}
                    className="flex items-center gap-2 text-stone-500 hover:text-teal-600 text-sm font-semibold transition">
                    <FaArrowLeft /> Back to Dashboard
                </button>
            </div>

            <div className="bg-gradient-to-r from-amber-500 to-amber-600 rounded-2xl p-6 mb-6 shadow-md">
                <p className="text-amber-100 text-sm font-semibold mb-1">Total Monthly Payroll</p>
                <p className="text-white text-4xl font-extrabold">Rs. {total.toLocaleString()}</p>
                <p className="text-amber-200 text-xs mt-1">{salaries.length} employees</p>
            </div>

            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-teal-700 to-teal-600 px-6 py-4">
                    <h3 className="font-bold text-white flex items-center gap-2">
                        <FaMoneyBillWave /> Salary Breakdown by Employee
                    </h3>
                </div>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
                    </div>
                ) : salaries.length === 0 ? (
                    <div className="text-center py-12 text-stone-400">
                        <FaMoneyBillWave className="text-4xl mx-auto mb-3 opacity-20" />
                        <p className="font-semibold">No salary records yet</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-stone-50 border-b border-stone-200 text-xs uppercase text-stone-500 font-semibold tracking-wide">
                                <tr>
                                    <th className="px-5 py-3.5">#</th>
                                    <th className="px-5 py-3.5">Employee</th>
                                    <th className="px-5 py-3.5">Department</th>
                                    <th className="px-5 py-3.5">Basic Salary</th>
                                    <th className="px-5 py-3.5">Allowances</th>
                                    <th className="px-5 py-3.5">Deductions</th>
                                    <th className="px-5 py-3.5">Net Paid</th>
                                    <th className="px-5 py-3.5">Last Pay Date</th>
                                    <th className="px-5 py-3.5">History</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-50">
                                {salaries.map((s, i) => (
                                    <tr key={s._id} className="hover:bg-teal-50/30 transition">
                                        <td className="px-5 py-3.5 text-stone-400 text-xs">{i + 1}</td>
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center gap-3">
                                                <img
                                                    src={`${API_BASE}/${s.employeeId?.userId?.profileImage}`}
                                                    className="w-8 h-8 rounded-lg object-cover border border-stone-200"
                                                    onError={e => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(s.employeeId?.userId?.name || 'E')}&background=0f766e&color=fff&size=32` }}
                                                />
                                                <span className="font-semibold text-stone-800">{s.employeeId?.userId?.name || '—'}</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3.5 text-stone-500">{s.employeeId?.department?.dep_name || '—'}</td>
                                        <td className="px-5 py-3.5 font-semibold text-stone-700">Rs. {(s.basicSalary || 0).toLocaleString()}</td>
                                        <td className="px-5 py-3.5 text-emerald-600 font-semibold">+Rs. {(s.allowances || 0).toLocaleString()}</td>
                                        <td className="px-5 py-3.5 text-red-500 font-semibold">-Rs. {(s.deductions || 0).toLocaleString()}</td>
                                        <td className="px-5 py-3.5">
                                            <div>
                                                <span className="font-extrabold text-teal-700 bg-teal-50 border border-teal-100 px-3 py-1 rounded-lg">
                                                    Rs. {(s.netSalary || 0).toLocaleString()}
                                                </span>
                                                <p className="text-xs text-stone-400 mt-1">{s.count} payment{s.count !== 1 ? 's' : ''}</p>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3.5 text-stone-400 text-xs">
                                            {s.payDate ? new Date(s.payDate).toLocaleDateString('en-NP') : '—'}
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <button
                                                onClick={() => setHistoryEmp(s)}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-xs font-semibold border border-amber-100 transition">
                                                <FaHistory /> View
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-stone-50 border-t-2 border-stone-200">
                                <tr>
                                    <td colSpan="6" className="px-5 py-3.5 font-bold text-stone-700 text-right">Total Monthly Payroll</td>
                                    <td className="px-5 py-3.5">
                                        <span className="font-extrabold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-lg">
                                            Rs. {total.toLocaleString()}
                                        </span>
                                    </td>
                                    <td colSpan="2"></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
            </div>

            {/* History Modal */}
            {historyEmp && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setHistoryEmp(null)} />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden">
                        {/* Modal Header */}
                        <div className="bg-gradient-to-r from-teal-700 to-teal-600 px-6 py-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <img
                                    src={`${API_BASE}/${historyEmp.employeeId?.userId?.profileImage}`}
                                    className="w-9 h-9 rounded-xl object-cover border-2 border-white/30"
                                    onError={e => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(historyEmp.employeeId?.userId?.name || 'E')}&background=0f766e&color=fff&size=36` }}
                                />
                                <div>
                                    <p className="text-white font-bold text-sm">{historyEmp.employeeId?.userId?.name}</p>
                                    <p className="text-teal-200 text-xs">{historyEmp.employeeId?.department?.dep_name} · {historyEmp.count} payment{historyEmp.count !== 1 ? 's' : ''}</p>
                                </div>
                            </div>
                            <button onClick={() => setHistoryEmp(null)} className="text-white/70 hover:text-white transition">
                                <FaTimes />
                            </button>
                        </div>

                        {/* Modal Table */}
                        <div className="overflow-auto max-h-96">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-stone-50 border-b text-xs uppercase text-stone-500 font-semibold sticky top-0">
                                    <tr>
                                        <th className="px-5 py-3">#</th>
                                        <th className="px-5 py-3">Basic</th>
                                        <th className="px-5 py-3">Allowances</th>
                                        <th className="px-5 py-3">Deductions</th>
                                        <th className="px-5 py-3">Net Salary</th>
                                        <th className="px-5 py-3">Pay Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-100">
                                    {getHistory(historyEmp.employeeId?._id).map((r, i) => (
                                        <tr key={r._id} className="hover:bg-stone-50">
                                            <td className="px-5 py-3 text-stone-400">{i + 1}</td>
                                            <td className="px-5 py-3 font-semibold text-stone-700">Rs. {(r.basicSalary || 0).toLocaleString()}</td>
                                            <td className="px-5 py-3 text-emerald-600">+Rs. {(r.allowances || 0).toLocaleString()}</td>
                                            <td className="px-5 py-3 text-red-500">-Rs. {(r.deductions || 0).toLocaleString()}</td>
                                            <td className="px-5 py-3">
                                                <span className="font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-lg border border-teal-100">
                                                    Rs. {(r.netSalary || 0).toLocaleString()}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3 text-stone-400 text-xs">
                                                {r.payDate ? new Date(r.payDate).toLocaleDateString('en-NP') : '—'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-stone-50 border-t-2 border-stone-200">
                                    <tr>
                                        <td colSpan="4" className="px-5 py-3 font-bold text-stone-700 text-right">Total Paid</td>
                                        <td className="px-5 py-3">
                                            <span className="font-extrabold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                                                Rs. {(historyEmp.netSalary || 0).toLocaleString()}
                                            </span>
                                        </td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
export default SalaryBreakdown