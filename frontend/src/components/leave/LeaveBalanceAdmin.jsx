import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { API_BASE } from '../../utils/apiConfig'
import { FaCalendarAlt, FaMoneyBillWave, FaUserAlt } from 'react-icons/fa'

const LeaveBalanceAdmin = () => {
    const [balances, setBalances] = useState([])
    const [loading, setLoading]   = useState(true)

    useEffect(() => {
        axios.get(`${API_BASE}/api/leave/all-balances`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }).then(r => {
            if (r.data.success) setBalances(r.data.balances)
        }).catch(() => {}).finally(() => setLoading(false))
    }, [])

    const year = new Date().getFullYear()

    return (
        <div className="p-6 bg-stone-50 min-h-full">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-stone-800">Leave Balances</h2>

            </div>

            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-teal-700 to-teal-600 px-6 py-4">
                    <h3 className="font-bold text-white flex items-center gap-2">
                        <FaCalendarAlt /> All Employee Leave Balances {year}
                    </h3>
                </div>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
                    </div>
                ) : balances.length === 0 ? (
                    <div className="text-center py-12 text-stone-400">
                        <FaCalendarAlt className="text-4xl mx-auto mb-3 opacity-20" />
                        <p>No leave balance records.</p>
   
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-stone-50 border-b border-stone-200 text-xs uppercase text-stone-500 font-semibold tracking-wide">
                                <tr>
                                    <th className="px-5 py-3.5">Employee</th>
                                    <th className="px-5 py-3.5">Department</th>
                                    <th className="px-5 py-3.5 text-center">Annual Leave</th>
                                    <th className="px-5 py-3.5 text-center">Sick Leave</th>
                                    <th className="px-5 py-3.5 text-center">Casual Leave</th>
                                    <th className="px-5 py-3.5 text-center">Unpaid Days</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-50">
                                {balances.map(b => (
                                    <tr key={b._id} className="hover:bg-stone-50 transition">
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center gap-3">
                                                <img
                                                    src={`${API_BASE}/${b.employeeId?.userId?.profileImage}`}
                                                    className="w-8 h-8 rounded-lg object-cover border border-stone-200"
                                                    onError={e => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(b.employeeId?.userId?.name||'E')}&background=0f766e&color=fff&size=32` }}
                                                />
                                                <span className="font-semibold text-stone-800">{b.employeeId?.userId?.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3.5 text-stone-500 text-xs">{b.employeeId?.department?.dep_name || '—'}</td>

                                        {/* Annual Leave */}
                                        {[
                                            { data: b.annualLeave,  color: 'teal'  },
                                            { data: b.sickLeave,    color: 'blue'  },
                                            { data: b.casualLeave,  color: 'amber' },
                                        ].map((lt, i) => {
                                            const pct = Math.round(lt.data.remaining / lt.data.total * 100)
                                            return (
                                                <td key={i} className="px-5 py-3.5 text-center">
                                                    <div className="inline-flex flex-col items-center gap-1">
                                                        <span className={`text-sm font-bold ${
                                                            pct > 60 ? 'text-emerald-600' :
                                                            pct > 30 ? 'text-amber-600' : 'text-red-500'
                                                        }`}>{lt.data.remaining}/{lt.data.total}</span>
                                                        <div className="w-16 bg-stone-100 rounded-full h-1">
                                                            <div className={`h-1 rounded-full ${
                                                                pct > 60 ? 'bg-emerald-500' :
                                                                pct > 30 ? 'bg-amber-400' : 'bg-red-400'
                                                            }`} style={{ width: pct + '%' }} />
                                                        </div>
                                                        <span className="text-xs text-stone-400">{lt.data.used} used</span>
                                                    </div>
                                                </td>
                                            )
                                        })}

                                        <td className="px-5 py-3.5 text-center">
                                            {b.unpaidDays > 0 ? (
                                                <span className="text-red-600 font-bold text-sm bg-red-50 border border-red-200 px-2.5 py-1 rounded-lg">
                                                    {b.unpaidDays} days
                                                </span>
                                            ) : (
                                                <span className="text-stone-300 text-xs">—</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}
export default LeaveBalanceAdmin
