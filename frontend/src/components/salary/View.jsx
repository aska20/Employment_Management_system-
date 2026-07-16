import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../../context/authContext'
import { FaMoneyBillWave } from 'react-icons/fa'
import { API_BASE, apiUrl, fileUrl } from '../../utils/apiConfig'

const View = () => {
    const [salaries, setSalaries] = useState(null)
    const { id }   = useParams()
    const { user } = useAuth()

    useEffect(() => {
        axios.get(`${API_BASE}/api/salary/${id}/${user.role}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }).then(r => { if (r.data.success) setSalaries(r.data.salary) })
          .catch(console.error)
    }, [])

    if (!salaries) return (
        <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
        </div>
    )

    return (
        <div className="p-6 bg-stone-50 min-h-full">
            <div className="mb-6 flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center">
                    <FaMoneyBillWave className="text-white" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-stone-800">Salary Records</h2>
                    <p className="text-stone-500 text-sm">{salaries.length} payroll record{salaries.length !== 1 ? 's' : ''}</p>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
                {salaries.length === 0 ? (
                    <div className="text-center py-16 text-stone-400">
                        <FaMoneyBillWave className="text-4xl mx-auto mb-3 opacity-30" />
                        <p className="font-medium">No salary records found</p>
                    </div>
                ) : (
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs uppercase bg-stone-50 border-b border-stone-100 text-stone-500">
                            <tr>
                                <th className="px-5 py-3">#</th>
                                <th className="px-5 py-3">Employee ID</th>
                                <th className="px-5 py-3">Basic Salary</th>
                                <th className="px-5 py-3">Allowances</th>
                                <th className="px-5 py-3">Deductions</th>
                                <th className="px-5 py-3">Net Salary</th>
                                <th className="px-5 py-3">Pay Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-50">
                            {salaries.map((s, i) => (
                                <tr key={s._id} className="hover:bg-stone-50 transition">
                                    <td className="px-5 py-3 text-stone-400">{i + 1}</td>
                                    <td className="px-5 py-3 font-medium text-stone-700">{s.employeeId?.employeeId}</td>
                                    <td className="px-5 py-3 text-stone-600">Rs.{s.basicSalary?.toLocaleString()}</td>
                                    <td className="px-5 py-3 text-emerald-600">+Rs.{s.allowances?.toLocaleString()}</td>
                                    <td className="px-5 py-3 text-red-500">-Rs.{s.deductions?.toLocaleString()}</td>
                                    <td className="px-5 py-3">
                                        <span className="font-bold text-teal-700 text-base">Rs.{s.netSalary?.toLocaleString()}</span>
                                    </td>
                                    <td className="px-5 py-3 text-stone-500">{new Date(s.payDate).toLocaleDateString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    )
}
export default View
