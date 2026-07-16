import React, { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../../context/authContext'
import { FaPlus, FaCalendarAlt, FaMoneyBillWave } from 'react-icons/fa'
import { API_BASE } from '../../utils/apiConfig'

const List = () => {
    const [leaves, setLeaves]   = useState(null)
    const [balance, setBalance] = useState(null)
    const { id }   = useParams()
    const { user } = useAuth()

    useEffect(() => {
        // Fetch leaves
        axios.get(`${API_BASE}/api/leave/${id}/${user.role}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }).then(r => { if (r.data.success) setLeaves(r.data.leaves) }).catch(console.error)

        // Fetch balance (employee only)
        if (user.role === 'employee') {
            axios.get(`${API_BASE}/api/leave/balance/${user._id}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            }).then(r => { if (r.data.success) setBalance(r.data.balance) }).catch(() => {})
        }
    }, [])

    if (!leaves) return (
        <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
        </div>
    )

    const badge = (s) => {
        const m = {
            Approved: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
            Rejected: 'bg-red-100 text-red-700 border border-red-200',
            Pending:  'bg-amber-100 text-amber-700 border border-amber-200'
        }
        return <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${m[s] || 'bg-stone-100 text-stone-600'}`}>{s}</span>
    }

    const paidBadge = (isPaid, unpaidDays) => {
        if (isPaid === undefined) return null
        if (isPaid) return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200">Paid</span>
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-600 border border-red-200">{unpaidDays}d Unpaid</span>
    }

    const getDuration = (start, end) => Math.ceil((new Date(end) - new Date(start)) / 86400000) + 1

    return (
        <div className="p-6 bg-stone-50 min-h-full">

            <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                <div>
                    <h2 className="text-2xl font-bold text-stone-800">Leave History</h2>
                    <p className="text-stone-400 text-sm">{leaves.length} total request{leaves.length !== 1 ? 's' : ''}</p>
                </div>
                {user.role === 'employee' && (
                    <Link to="/employee-dashboard/add-leave"
                        className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition">
                        <FaPlus /> Apply for Leave
                    </Link>
                )}
            </div>

            {/* Balance summary — employee only */}
            {balance && user.role === 'employee' && (
                <div className="grid grid-cols-3 gap-3 mb-5">
                    {[
                        { key: 'annualLeave',  label: 'Annual Leave'  },
                        { key: 'sickLeave',    label: 'Sick Leave'    },
                        { key: 'casualLeave',  label: 'Casual Leave'  },
                    ].map(b => {
                        const bal = balance[b.key]
                        const pct = Math.round(bal.remaining / bal.total * 100)
                        return (
                            <div key={b.key} className="bg-white rounded-2xl border border-stone-200 p-4">
                                <p className="text-xs font-semibold text-stone-400 mb-1">{b.label}</p>
                                <p className="text-2xl font-bold text-stone-800">
                                    {bal.remaining}
                                    <span className="text-xs font-normal text-stone-300">/{bal.total}</span>
                                </p>
                                <div className="bg-stone-100 rounded-full h-1.5 mt-2">
                                    <div className={`h-1.5 rounded-full ${pct > 60 ? 'bg-emerald-500' : pct > 30 ? 'bg-amber-400' : 'bg-red-400'}`}
                                        style={{ width: pct + '%' }} />
                                </div>
                                <p className="text-xs text-stone-400 mt-1">{bal.used} used · {bal.remaining} remaining</p>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Unpaid summary if any */}
            {balance && balance.unpaidDays > 0 && (
                <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3">
                    <FaMoneyBillWave className="text-red-400 text-lg flex-shrink-0" />
                    <div>
                        <p className="text-sm font-bold text-red-700">Unpaid Leave This Year</p>
                        <p className="text-xs text-red-600">{balance.unpaidDays} unpaid day{balance.unpaidDays !== 1 ? 's' : ''} taken - these are deducted from your monthly salary when approved</p>
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
                {leaves.length === 0 ? (
                    <div className="text-center py-16 text-stone-400">
                        <FaCalendarAlt className="text-4xl mx-auto mb-3 opacity-20" />
                        <p className="font-medium">No leave records found</p>
                        {user.role === 'employee' && (
                            <p className="text-sm mt-1"></p>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs uppercase bg-stone-50 border-b border-stone-100 text-stone-500 font-semibold">
                                <tr>
                                    <th className="px-5 py-3.5">#</th>
                                    <th className="px-5 py-3.5">Leave Type</th>
                                    <th className="px-5 py-3.5">From</th>
                                    <th className="px-5 py-3.5">To</th>
                                    <th className="px-5 py-3.5">Days</th>
                                    <th className="px-5 py-3.5">Paid/Unpaid</th>
                                    <th className="px-5 py-3.5">Deduction</th>
                                    <th className="px-5 py-3.5">Status</th>
                                    <th className="px-5 py-3.5">Applied</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-50">
                                {leaves.map((l, i) => {
                                    const days = getDuration(l.startDate, l.endDate)
                                    return (
                                        <tr key={l._id} className="hover:bg-stone-50 transition">
                                            <td className="px-5 py-3.5 text-stone-400 text-xs">{i + 1}</td>
                                            <td className="px-5 py-3.5 font-semibold text-teal-700 text-xs">{l.leaveType}</td>
                                            <td className="px-5 py-3.5 text-stone-600 text-xs">
                                                {new Date(l.startDate).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}
                                            </td>
                                            <td className="px-5 py-3.5 text-stone-600 text-xs">
                                                {new Date(l.endDate).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}
                                            </td>
                                            <td className="px-5 py-3.5 font-bold text-stone-700">{days}</td>
                                            <td className="px-5 py-3.5">{paidBadge(l.isPaid, l.unpaidDays)}</td>
                                            <td className="px-5 py-3.5 text-xs">
                                                {l.salaryDeduction > 0
                                                    ? <span className="text-red-600 font-semibold">-Rs. {l.salaryDeduction?.toLocaleString()}</span>
                                                    : <span className="text-stone-300">—</span>
                                                }
                                            </td>
                                            <td className="px-5 py-3.5">{badge(l.status)}</td>
                                            <td className="px-5 py-3.5 text-stone-400 text-xs">
                                                {new Date(l.appliedAt).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}
export default List
