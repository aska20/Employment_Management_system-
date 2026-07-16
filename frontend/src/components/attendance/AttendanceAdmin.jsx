import React, { useState, useEffect } from 'react'
import axios from 'axios'
import {
    FaSearch, FaCalendarDay, FaCheckCircle, FaClock,
    FaTimesCircle, FaCalendarCheck, FaRunning, FaBell,
    FaUserClock, FaHourglassHalf
} from 'react-icons/fa'
import { API_BASE } from '../../utils/apiConfig'

const AttendanceAdmin = () => {
    const n = new Date()
    const todayStr = `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`

    const [date, setDate]       = useState(todayStr)
    const [month, setMonth]     = useState(new Date().getMonth() + 1)
    const [year, setYear]       = useState(new Date().getFullYear())
    const [view, setView]       = useState('daily')
    const [attendance, setAttendance]   = useState([])
    const [loading, setLoading]         = useState(false)
    const [absentMsg, setAbsentMsg]     = useState('')
    const [earlyRequests, setEarlyRequests] = useState([])
    const [actionLoading, setActionLoading] = useState(null)

    useEffect(() => { fetchAttendance(); fetchEarlyExitRequests() }, [])

    // Auto-refresh early exit requests every 20 seconds
    useEffect(() => {
        const interval = setInterval(fetchEarlyExitRequests, 20000)
        return () => clearInterval(interval)
    }, [])

    const fetchAttendance = async () => {
        setLoading(true)
        try {
            const url = view === 'daily'
                ? `${API_BASE}/api/attendance/daily/${date}`
                : `${API_BASE}/api/attendance/monthly/${year}/${month}`
            const r = await axios.get(url, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            })
            if (r.data.success) setAttendance(r.data.attendance)
        } catch (e) { console.error(e) }
        setLoading(false)
    }

    const fetchEarlyExitRequests = async () => {
        try {
            const r = await axios.get(`${API_BASE}/api/notifications`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            })
            if (r.data.success) {
                const pending = r.data.notifications.filter(
                    n => n.type === 'early_exit_request' && n.actionStatus === 'pending'
                )
                setEarlyRequests(pending)
            }
        } catch {}
    }

    const handleEarlyExitAction = async (notifId, attendanceId, action) => {
        setActionLoading(notifId + action)
        try {
            await axios.post(
                `${API_BASE}/api/attendance/early-exit-action`,
                { notificationId: notifId, attendanceId, action },
                { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
            )
            // Refresh both
            await fetchEarlyExitRequests()
            await fetchAttendance()
        } catch (e) { console.error(e) }
        setActionLoading(null)
    }

    const runAbsentCheck = async () => {
        try {
            const r = await axios.post(`${API_BASE}/api/attendance/run-absent-check`, {}, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            })
            setAbsentMsg(r.data.message)
            fetchAttendance()
            setTimeout(() => setAbsentMsg(''), 4000)
        } catch { setAbsentMsg('Error running absent check') }
    }

    const badge = (s) => {
        const map = {
            Present:    'bg-emerald-100 text-emerald-700 border border-emerald-200',
            Absent:     'bg-red-100 text-red-700 border border-red-200',
            Late:       'bg-amber-100 text-amber-700 border border-amber-200',
            'Half Day': 'bg-orange-100 text-orange-700 border border-orange-200',
            Holiday:    'bg-blue-100 text-blue-700 border border-blue-200',
            Weekend:    'bg-stone-100 text-stone-500 border border-stone-200',
        }
        return <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${map[s] || 'bg-stone-100 text-stone-600'}`}>{s}</span>
    }

    const formatMins = (mins) => {
        if (!mins || mins <= 0) return '-'
        const h = Math.floor(mins / 60), m = mins % 60
        return h > 0 ? `${h}h ${m}m` : `${m}m`
    }

    const counts = { Present: 0, Absent: 0, Late: 0, 'Half Day': 0 }
    attendance.forEach(a => { if (counts[a.status] !== undefined) counts[a.status]++ })

    return (
        <div className="p-6 bg-stone-50 min-h-full">

            {/* Header */}
            <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                <div>
                    <h2 className="text-2xl font-bold text-stone-800">Attendance Management</h2>
                   
                </div>
                <button onClick={runAbsentCheck}
                    className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition">
                    <FaTimesCircle /> Mark Today's Absents
                </button>
            </div>

            {absentMsg && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl font-medium">
                    {absentMsg}
                </div>
            )}

            {/* ── EARLY EXIT REQUESTS PANEL ── */}
            {earlyRequests.length > 0 && (
                <div className="mb-6 bg-white rounded-2xl border border-amber-300 shadow-sm overflow-hidden">
                    {/* Header */}
                    <div className="bg-amber-500 px-5 py-3.5 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                            <FaBell className="text-white" />
                            <h3 className="font-bold text-white">Early Exit Requests - Pending Your Decision</h3>
                        </div>
                        <span className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full">
                            {earlyRequests.length} pending
                        </span>
                    </div>

                    {/* Requests */}
                    <div className="divide-y divide-amber-50">
                        {earlyRequests.map(req => {
                            const isLoading = actionLoading === req._id + 'approve' || actionLoading === req._id + 'reject'
                            return (
                                <div key={req._id} className="p-5 bg-amber-50/40">
                                    <div className="flex items-start gap-4 flex-wrap">
                                        {/* Icon */}
                                        <div className="w-11 h-11 bg-amber-100 border border-amber-200 rounded-xl flex items-center justify-center flex-shrink-0">
                                            <FaRunning className="text-amber-600 text-lg" />
                                        </div>

                                        {/* Details */}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-stone-800 font-semibold text-sm leading-relaxed">
                                                {req.message}
                                            </p>
                                            <div className="flex items-center gap-3 mt-2 flex-wrap">
                                                <span className="flex items-center gap-1.5 text-xs text-stone-500">
                                                    <FaClock className="text-amber-400" />
                                                    {new Date(req.createdAt).toLocaleTimeString('en-US', {
                                                        hour: '2-digit', minute: '2-digit', hour12: true
                                                    })}
                                                </span>
                                                <span className="flex items-center gap-1.5 text-xs text-stone-500">
                                                    <FaHourglassHalf className="text-red-400" />
                                                    Waiting for approval
                                                </span>
                                                <span className="text-xs text-amber-600 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
                                                    Employee cannot leave until approved
                                                </span>
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex gap-2 flex-shrink-0">
                                            <button
                                                onClick={() => handleEarlyExitAction(req._id, req.attendanceId, 'approve')}
                                                disabled={isLoading}
                                                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition shadow-sm">
                                                <FaCheckCircle className="text-xs" />
                                                {actionLoading === req._id + 'approve' ? 'Approving...' : 'Approve'}
                                            </button>
                                            <button
                                                onClick={() => handleEarlyExitAction(req._id, req.attendanceId, 'reject')}
                                                disabled={isLoading}
                                                className="flex items-center gap-1.5 px-4 py-2 bg-red-500 hover:bg-red-600 active:scale-95 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition shadow-sm">
                                                <FaTimesCircle className="text-xs" />
                                                {actionLoading === req._id + 'reject' ? 'Rejecting...' : 'Reject'}
                                            </button>
                                        </div>
                                    </div>


                                </div>
                            )
                        })}
                    </div>

                  
                </div>
            )}



            {/* View tabs */}
            <div className="flex gap-2 mb-5">
                {['daily','monthly'].map(v => (
                    <button key={v} onClick={() => setView(v)}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold capitalize transition ${
                            view === v ? 'bg-teal-600 text-white shadow-sm' : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
                        }`}>
                        {v} View
                    </button>
                ))}
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-stone-200 p-4 mb-5 flex flex-wrap gap-3 items-end">
                {view === 'daily' ? (
                    <div>
                        <label className="block text-xs font-semibold text-stone-500 mb-1">Date</label>
                        <input type="date" value={date} onChange={e => setDate(e.target.value)}
                            className="border border-stone-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-teal-400 focus:outline-none" />
                    </div>
                ) : (
                    <>
                        <div>
                            <label className="block text-xs font-semibold text-stone-500 mb-1">Month</label>
                            <select value={month} onChange={e => setMonth(e.target.value)}
                                className="border border-stone-300 rounded-xl px-3 py-2 text-sm">
                                {Array.from({length:12},(_,i) => (
                                    <option key={i+1} value={i+1}>{new Date(0,i).toLocaleString('default',{month:'long'})}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-stone-500 mb-1">Year</label>
                            <input type="number" value={year} onChange={e => setYear(e.target.value)}
                                className="border border-stone-300 rounded-xl px-3 py-2 text-sm w-24" />
                        </div>
                    </>
                )}
                <button onClick={fetchAttendance}
                    className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition">
                    <FaSearch /> Search
                </button>
            </div>

            {/* Stats */}
            {attendance.length > 0 && (
                <div className="grid grid-cols-4 gap-3 mb-5">
                    {Object.entries(counts).map(([k, v]) => {
                        const styles = {
                            Present:    'border-emerald-200 bg-emerald-50 text-emerald-700',
                            Absent:     'border-red-200 bg-red-50 text-red-700',
                            Late:       'border-amber-200 bg-amber-50 text-amber-700',
                            'Half Day': 'border-orange-200 bg-orange-50 text-orange-700',
                        }
                        return (
                            <div key={k} className={`rounded-xl border ${styles[k]} p-3 text-center`}>
                                <p className="text-2xl font-bold">{v}</p>
                                <p className="text-xs font-medium opacity-70 mt-0.5">{k}</p>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Table */}
            <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-sm">
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
                    </div>
                ) : attendance.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-stone-400">
                        <FaCalendarDay className="text-4xl mb-3 opacity-20" />
                        <p className="font-medium">No records found</p>

                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs uppercase bg-stone-50 border-b border-stone-100 text-stone-500 font-semibold tracking-wide">
                                <tr>
                                    <th className="px-5 py-3.5">#</th>
                                    <th className="px-5 py-3.5">Employee</th>
                                    <th className="px-5 py-3.5">Department</th>
                                    <th className="px-5 py-3.5">Date</th>
                                    <th className="px-5 py-3.5">Check In</th>
                                    <th className="px-5 py-3.5">Check Out</th>
                                    <th className="px-5 py-3.5">Status</th>
                                    <th className="px-5 py-3.5">Late By</th>
                                    <th className="px-5 py-3.5">Early Exit</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-50">
                                {attendance.map((a, i) => (
                                    <tr key={a._id} className="hover:bg-stone-50 transition">
                                        <td className="px-5 py-3.5 text-stone-400 text-xs">{i+1}</td>
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center gap-2.5">
                                                <img
                                                    src={`${API_BASE}/${a.employeeId?.userId?.profileImage}`}
                                                    className="w-7 h-7 rounded-lg object-cover border border-stone-200 flex-shrink-0"
                                                    onError={e => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(a.employeeId?.userId?.name||'E')}&background=0f766e&color=fff&size=28` }}
                                                />
                                                <span className="font-semibold text-stone-800">{a.employeeId?.userId?.name || 'N/A'}</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3.5 text-stone-500 text-xs">{a.employeeId?.department?.dep_name || 'N/A'}</td>
                                        <td className="px-5 py-3.5 text-stone-600 text-xs">{a.date}</td>
                                        <td className="px-5 py-3.5">
                                            <span className="text-emerald-600 font-semibold text-xs bg-emerald-50 px-2 py-0.5 rounded-lg">
                                                {a.checkIn || '-'}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            {a.checkOut ? (
                                                <span className="text-amber-700 font-semibold text-xs bg-amber-50 px-2 py-0.5 rounded-lg">
                                                    {a.checkOut}
                                                    {a.earlyExitStatus === 'pending'   && <span className="ml-1 text-amber-500">(pending)</span>}
                                                    {a.earlyExitStatus === 'approved'  && <span className="ml-1 text-emerald-500">(approved)</span>}
                                                    {a.earlyExitStatus === 'rejected'  && <span className="ml-1 text-red-500">(rejected)</span>}
                                                </span>
                                            ) : (
                                                <span className="text-stone-400 text-xs">-</span>
                                            )}
                                        </td>
                                        <td className="px-5 py-3.5">{badge(a.status)}</td>
                                        <td className="px-5 py-3.5 text-xs">
                                            {a.lateMinutes > 0
                                                ? <span className="text-amber-600 font-semibold">{formatMins(a.lateMinutes)}</span>
                                                : <span className="text-stone-300">-</span>
                                            }
                                        </td>
                                        <td className="px-5 py-3.5 text-xs">
                                            {a.earlyExitReason ? (
                                                <div>
                                                    <span className={`inline-block px-2 py-0.5 rounded-full font-semibold text-xs mb-1 ${
                                                        a.earlyExitStatus === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                                                        a.earlyExitStatus === 'rejected' ? 'bg-red-100 text-red-700' :
                                                        'bg-amber-100 text-amber-700'
                                                    }`}>
                                                        {a.earlyExitStatus === 'approved' ? 'Approved' :
                                                         a.earlyExitStatus === 'rejected' ? 'Rejected' : 'Pending'}
                                                    </span>
                                                    <p className="text-stone-400 truncate max-w-xs" title={a.earlyExitReason}>
                                                        {a.earlyExitReason}
                                                    </p>
                                                </div>
                                            ) : (
                                                <span className="text-stone-300">-</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className="px-5 py-3 bg-stone-50 border-t border-stone-100">
                            <p className="text-xs text-stone-400">{attendance.length} record{attendance.length !== 1 ? 's' : ''}</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
export default AttendanceAdmin
