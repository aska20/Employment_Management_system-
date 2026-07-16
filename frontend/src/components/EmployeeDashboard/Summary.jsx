import React, { useState, useEffect } from 'react'
import { FaUserCheck, FaCalendarAlt, FaMoneyBillWave, FaUserCircle, FaClock, FaCheckCircle, FaTimesCircle, FaExclamationCircle, FaArrowRight, FaBell } from 'react-icons/fa'
import { useAuth } from '../../context/authContext'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { API_BASE, apiUrl, fileUrl } from '../../utils/apiConfig'

const Summary = () => {
    const { user } = useAuth()
    const [stats, setStats]           = useState({ present: 0, leaves: 0, pending: 0 })
    const [todayRecord, setTodayRecord] = useState(null)
    const [recentAttendance, setRecentAttendance] = useState([])
    const [loading, setLoading]       = useState(true)
    const today = new Date().toLocaleDateString('en-NP', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

    useEffect(() => {
        const fetchAll = async () => {
            try {
                const month = new Date().getMonth() + 1
                const year  = new Date().getFullYear()
                const n = new Date(); const todayStr = `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`
                const [attRes, leaveRes] = await Promise.all([
                    axios.get(`${API_BASE}/api/attendance/employee/${user._id}?month=${month}&year=${year}`, {
                        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                    }),
                    axios.get(`${API_BASE}/api/leave/${user._id}/employee`, {
                        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                    })
                ])
                const att    = attRes.data.success ? attRes.data.attendance : []
                const leaves = leaveRes.data.success ? leaveRes.data.leaves : []
                const todayRec = att.find(a => a.date === todayStr) || null
                setTodayRecord(todayRec)
                setRecentAttendance(att.slice(-5).reverse())
                setStats({
                    present: att.filter(a => ['Present','Late'].includes(a.status)).length,
                    leaves:  leaves.filter(l => l.status === 'Approved').length,
                    pending: leaves.filter(l => l.status === 'Pending').length,
                })
            } catch {}
            setLoading(false)
        }
        fetchAll()
    }, [])

    const statusStyle = (s) => {
        const m = {
            Present:    { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
            Late:       { bg: 'bg-amber-100',   text: 'text-amber-700',   dot: 'bg-amber-500'   },
            'Half Day': { bg: 'bg-orange-100',  text: 'text-orange-700',  dot: 'bg-orange-500'  },
            Absent:     { bg: 'bg-red-100',      text: 'text-red-700',     dot: 'bg-red-500'     },
        }
        return m[s] || { bg: 'bg-stone-100', text: 'text-stone-500', dot: 'bg-stone-400' }
    }

    return (
        <div className="p-6 bg-gradient-to-br from-stone-100 to-stone-50 min-h-full">

            {/* ── Welcome Banner ── */}
            <div className="bg-gradient-to-r from-teal-900 via-teal-800 to-teal-600 rounded-3xl p-7 mb-7 shadow-xl relative overflow-hidden">
                <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/5 rounded-full"></div>
                <div className="absolute -bottom-8 left-16 w-32 h-32 bg-white/5 rounded-full"></div>
                <div className="absolute top-4 right-24 w-16 h-16 bg-teal-500/20 rounded-full"></div>
                <div className="relative flex items-center justify-between gap-4">
                    <div className="flex-1">
                        <p className="text-teal-300 text-sm font-medium mb-1">Welcome back</p>
                        <h2 className="text-white text-3xl font-extrabold tracking-tight">{user.name}</h2>
                        <p className="text-teal-300/80 text-sm mt-1.5 flex items-center gap-1.5">
                            <FaClock className="text-xs" /> {today}
                        </p>
                    </div>
                    <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20 flex-shrink-0 shadow-inner">
                        <FaUserCircle className="text-white text-4xl" />
                    </div>
                </div>

                {/* Stats strip */}
                {!loading && (
                    <div className="relative flex gap-3 mt-6 flex-wrap">
                        {[
                            { label: 'Days Present',   val: stats.present, color: 'bg-emerald-500/25 border-emerald-400/30' },
                            { label: 'Leaves Taken',   val: stats.leaves,  color: 'bg-blue-500/25 border-blue-400/30' },
                            { label: 'Pending Leaves', val: stats.pending, color: 'bg-amber-500/25 border-amber-400/30' },
                        ].map(s => (
                            <div key={s.label} className={`${s.color} border rounded-2xl px-5 py-2.5 text-center min-w-[90px]`}>
                                <p className="text-white font-extrabold text-xl leading-none">{s.val}</p>
                                <p className="text-teal-200 text-xs mt-1 leading-none">{s.label}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Main Grid ── */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">

                {/* LEFT col (3/5): Today Status + Recent */}
                <div className="lg:col-span-3 space-y-5">

                    {/* Today's Attendance Status Card */}
                    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
                        <div className="bg-gradient-to-r from-teal-700 to-teal-600 px-5 py-3.5 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <FaUserCheck className="text-teal-200" />
                                <h3 className="font-bold text-white text-sm">Today's Attendance</h3>
                            </div>
                            <span className="text-teal-300 text-xs">{new Date().toLocaleDateString('en-NP', { month: 'short', day: 'numeric' })}</span>
                        </div>
                        <div className="p-5">
                            {loading ? (
                                <div className="flex justify-center py-6">
                                    <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-teal-600"></div>
                                </div>
                            ) : todayRecord ? (
                                <div>
                                    {/* Status badge */}
                                    <div className="flex items-center gap-3 mb-5">
                                        <div className={`w-3 h-3 rounded-full ${statusStyle(todayRecord.status).dot}`}></div>
                                        <span className={`text-sm font-bold px-3 py-1 rounded-full ${statusStyle(todayRecord.status).bg} ${statusStyle(todayRecord.status).text}`}>
                                            {todayRecord.status}
                                        </span>
                                        {todayRecord.lateMinutes > 0 && (
                                            <span className="text-xs text-amber-600 font-semibold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                                                Late by {Math.floor(todayRecord.lateMinutes/60) > 0 ? `${Math.floor(todayRecord.lateMinutes/60)}h ` : ''}{todayRecord.lateMinutes % 60}m
                                            </span>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3.5">
                                            <p className="text-emerald-600 text-xs font-semibold uppercase tracking-wide mb-0.5">Check In</p>
                                            <p className="text-emerald-800 font-bold text-xl">{todayRecord.checkIn || '—'}</p>
                                        </div>
                                        <div className="bg-amber-50 border border-amber-100 rounded-xl p-3.5">
                                            <p className="text-amber-600 text-xs font-semibold uppercase tracking-wide mb-0.5">Check Out</p>
                                            <p className="text-amber-800 font-bold text-xl">{todayRecord.checkOut || 'Pending'}</p>
                                        </div>
                                    </div>
                                    {todayRecord.earlyExitReason && (
                                        <div className="mt-3 bg-orange-50 border border-orange-100 rounded-xl p-3 text-xs text-orange-700">
                                            <span className="font-semibold">Early Exit Reason:</span> {todayRecord.earlyExitReason}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center py-5">
                                    <div className="w-14 h-14 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <FaTimesCircle className="text-stone-400 text-2xl" />
                                    </div>
                                    <p className="text-stone-600 font-semibold text-sm">Not marked yet today</p>
                                  
                                </div>
                            )}
                        </div>
                        <div className="px-5 py-3 bg-stone-50 border-t border-stone-100 flex items-center justify-between">
                            
                            <Link to="/employee-dashboard/attendance" className="text-xs text-teal-600 hover:text-teal-800 font-semibold flex items-center gap-1 transition">
                                View History <FaArrowRight className="text-[10px]" />
                            </Link>
                        </div>
                    </div>

                    {/* Recent Attendance Mini Table */}
                    {recentAttendance.length > 0 && (
                        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
                            <div className="px-5 py-3.5 border-b border-stone-100 flex items-center justify-between">
                                <h3 className="font-bold text-stone-700 text-sm flex items-center gap-2">
                                    <FaCalendarAlt className="text-teal-500" /> Recent Records
                                </h3>
                                <Link to="/employee-dashboard/attendance" className="text-xs text-teal-600 hover:text-teal-700 font-semibold transition">View All →</Link>
                            </div>
                            <div className="divide-y divide-stone-50">
                                {recentAttendance.map((a, i) => {
                                    const st = statusStyle(a.status)
                                    return (
                                        <div key={i} className="flex items-center justify-between px-5 py-3 hover:bg-stone-50 transition">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${st.dot}`}></div>
                                                <span className="text-stone-700 text-sm font-medium">{a.date}</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-stone-400 text-xs">{a.checkIn || '—'} → {a.checkOut || '—'}</span>
                                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${st.bg} ${st.text}`}>{a.status}</span>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* RIGHT col (2/5): Quick Links + Schedule */}
                <div className="lg:col-span-2 space-y-4">
                    <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest">Quick Access</h3>

                    {[
                        {
                            to: '/employee-dashboard/attendance',
                            icon: <FaUserCheck className="text-teal-600 text-lg" />,
                            iconBg: 'bg-teal-100 group-hover:bg-teal-200',
                            title: 'Attendance History',
                            desc: 'View full attendance & late records',
                            arrow: 'group-hover:text-teal-500',
                            border: 'hover:border-teal-200'
                        },
                        {
                            to: `/employee-dashboard/leaves/${user._id}`,
                            icon: <FaCalendarAlt className="text-emerald-600 text-lg" />,
                            iconBg: 'bg-emerald-100 group-hover:bg-emerald-200',
                            title: 'My Leaves',
                            desc: 'Apply for leave and track status',
                            arrow: 'group-hover:text-emerald-500',
                            border: 'hover:border-emerald-200'
                        },
                        {
                            to: `/employee-dashboard/salary/${user._id}`,
                            icon: <FaMoneyBillWave className="text-amber-600 text-lg" />,
                            iconBg: 'bg-amber-100 group-hover:bg-amber-200',
                            title: 'My Salary',
                            desc: 'View monthly salary & payslips',
                            arrow: 'group-hover:text-amber-500',
                            border: 'hover:border-amber-200'
                        },
                        {
                            to: `/employee-dashboard/profile/${user._id}`,
                            icon: <FaUserCircle className="text-purple-600 text-lg" />,
                            iconBg: 'bg-purple-100 group-hover:bg-purple-200',
                            title: 'My Profile',
                            desc: 'View and update your details',
                            arrow: 'group-hover:text-purple-500',
                            border: 'hover:border-purple-200'
                        },
                    ].map(l => (
                        <Link key={l.to} to={l.to}
                            className={`flex items-center gap-4 bg-white border border-stone-200 ${l.border} rounded-2xl p-4 transition hover:shadow-md group`}>
                            <div className={`w-12 h-12 ${l.iconBg} rounded-xl flex items-center justify-center transition flex-shrink-0`}>
                                {l.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-stone-800 text-sm">{l.title}</p>
                                <p className="text-stone-400 text-xs truncate">{l.desc}</p>
                            </div>
                            <FaArrowRight className={`text-stone-300 ${l.arrow} transition text-sm flex-shrink-0`} />
                        </Link>
                    ))}

                    {/* Work Schedule */}
                    <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-sm">
                        <div className="flex items-center gap-2 mb-3">
                            <FaClock className="text-teal-500" />
                            <p className="font-bold text-stone-700 text-sm">Work Schedule</p>
                        </div>
                        <div className="space-y-2">
                            {[
                                { label: 'Office Opens',   value: '9:00 AM',  dot: 'bg-emerald-400', val: 'text-emerald-600' },
                                { label: 'Late After',     value: '9:00 AM',  dot: 'bg-amber-400',   val: 'text-amber-600'  },
                                { label: 'Half Day After', value: '10:00 AM', dot: 'bg-orange-400',  val: 'text-orange-600' },
                                { label: 'Office Closes',  value: '5:00 PM',  dot: 'bg-teal-400',    val: 'text-teal-600'   },
                                { label: 'Min Work Hours', value: '8 Hours',  dot: 'bg-stone-300',   val: 'text-stone-600'  },
                            ].map(s => (
                                <div key={s.label} className="flex items-center justify-between py-1">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${s.dot}`}></div>
                                        <span className="text-stone-500 text-xs">{s.label}</span>
                                    </div>
                                    <span className={`text-xs font-bold ${s.val}`}>{s.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Summary
