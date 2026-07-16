import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuth } from '../../context/authContext'
import { FaCalendarCheck, FaFilter, FaClock, FaCheckCircle, FaTimesCircle, FaChartBar, FaInfoCircle } from 'react-icons/fa'
import { API_BASE, apiUrl, fileUrl } from '../../utils/apiConfig'

const AttendanceEmployee = () => {
    const { user }  = useAuth()
    const [attendance, setAttendance] = useState([])
    const [loading, setLoading]       = useState(true)
    const [month, setMonth] = useState(new Date().getMonth() + 1)
    const [year, setYear]   = useState(new Date().getFullYear())

    useEffect(() => { fetchAttendance() }, [])

    const fetchAttendance = async () => {
        setLoading(true)
        try {
            const r = await axios.get(
                `${API_BASE}/api/attendance/employee/${user._id}?month=${month}&year=${year}`,
                { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
            )
            if (r.data.success) setAttendance(r.data.attendance)
        } catch (e) { console.error(e) }
        setLoading(false)
    }

    // ── Stats ──────────────────────────────────────────────
    const present         = attendance.filter(a => a.status === 'Present').length
    const late            = attendance.filter(a => a.status === 'Late').length
    const halfDay         = attendance.filter(a => a.status === 'Half Day').length
    const absent          = attendance.filter(a => a.status === 'Absent').length
    const totalAttended   = present + late   // both are "came to work" days
    const totalDays       = attendance.filter(a => !['Holiday','Weekend'].includes(a.status)).length

    // Total late minutes — sum ALL lateMinutes values (Present can also have 0, Late has > 0)
    const totalLateMinutes = attendance.reduce((sum, a) => {
        const mins = Number(a.lateMinutes) || 0
        return sum + mins
    }, 0)

    const formatLate = (mins) => {
        if (!mins || mins <= 0) return '0m'
        const h = Math.floor(mins / 60)
        const m = mins % 60
        if (h > 0 && m > 0) return `${h}h ${m}m`
        if (h > 0) return `${h}h`
        return `${m}m`
    }

    const attendanceRate = totalDays >= 5
        ? Math.round((totalAttended / totalDays) * 100)
        : null  // not enough data

    const badge = (s) => {
        const map = {
            Present:    'bg-emerald-100 text-emerald-700 border border-emerald-200',
            Absent:     'bg-red-100 text-red-700 border border-red-200',
            Late:       'bg-amber-100 text-amber-700 border border-amber-200',
            'Half Day': 'bg-orange-100 text-orange-700 border border-orange-200',
            Holiday:    'bg-blue-100 text-blue-700 border border-blue-200',
            Weekend:    'bg-stone-100 text-stone-500 border border-stone-200',
        }
        return <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${map[s] || 'bg-stone-100'}`}>{s}</span>
    }

    return (
        <div className="p-6 bg-gradient-to-br from-stone-100 to-stone-50 min-h-full">

            {/* Header */}
            <div className="mb-7 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-teal-600 rounded-xl flex items-center justify-center shadow-md">
                        <FaCalendarCheck className="text-white text-lg" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-extrabold text-stone-800 tracking-tight">My Attendance</h2>
                        <p className="text-stone-400 text-sm">Your monthly attendance record</p>
                    </div>
                </div>
                {/* Attendance rate */}
                <div className="flex items-center gap-2 bg-white border border-stone-200 rounded-2xl px-4 py-2.5 shadow-sm">
                    <FaChartBar className="text-teal-500" />
                    <div>
                        <p className="text-xs text-stone-400 leading-none">Attendance Rate</p>
                        {attendanceRate !== null ? (
                            <p className={`font-extrabold text-lg leading-none mt-0.5 ${
                                attendanceRate >= 80 ? 'text-emerald-600' :
                                attendanceRate >= 60 ? 'text-amber-600' : 'text-red-600'
                            }`}>{attendanceRate}%</p>
                        ) : (
                            <p className="text-stone-400 text-xs mt-0.5">Need 5+ days</p>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Summary Cards ── */}
            {/* Row 1: Main stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">

                {/* Total Attended (Present + Late combined) */}
                <div className="border border-teal-200 bg-teal-50 rounded-2xl p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                        <div className="w-2 h-2 rounded-full bg-teal-500"></div>
                        <span className="text-teal-400 text-xs font-semibold">of {totalDays} days</span>
                    </div>
                    <p className="text-3xl font-extrabold text-teal-700 leading-none">{totalAttended}</p>
                    <p className="text-xs text-stone-500 mt-1.5 font-semibold">Total Attended</p>
                    {late > 0 && (
                        <p className="text-xs text-amber-600 mt-1 font-medium">
                            {present} on-time + {late} late
                        </p>
                    )}
                </div>

                {/* Present (on-time only) */}
                <div className="border border-emerald-200 bg-emerald-50 rounded-2xl p-4 shadow-sm">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 mb-2"></div>
                    <p className="text-3xl font-extrabold text-emerald-600 leading-none">{present}</p>
                    <p className="text-xs text-stone-500 mt-1.5 font-semibold">On Time</p>
                    <p className="text-xs text-stone-400 mt-0.5">Before 9:00 AM</p>
                </div>

                {/* Late */}
                <div className="border border-amber-200 bg-amber-50 rounded-2xl p-4 shadow-sm">
                    <div className="w-2 h-2 rounded-full bg-amber-400 mb-2"></div>
                    <p className="text-3xl font-extrabold text-amber-600 leading-none">{late}</p>
                    <p className="text-xs text-stone-500 mt-1.5 font-semibold">Late Arrivals</p>
                    <p className="text-xs text-stone-400 mt-0.5">9:01 - 10:00 AM</p>
                </div>

                {/* Absent */}
                <div className="border border-red-200 bg-red-50 rounded-2xl p-4 shadow-sm">
                    <div className="w-2 h-2 rounded-full bg-red-400 mb-2"></div>
                    <p className="text-3xl font-extrabold text-red-500 leading-none">{absent}</p>
                    <p className="text-xs text-stone-500 mt-1.5 font-semibold">Absent</p>
                    <p className="text-xs text-stone-400 mt-0.5">No check-in</p>
                </div>
            </div>

            {/* Row 2: Secondary stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">

                {/* Half Day */}
                <div className="border border-orange-200 bg-orange-50 rounded-2xl p-4 shadow-sm">
                    <div className="w-2 h-2 rounded-full bg-orange-400 mb-2"></div>
                    <p className="text-2xl font-extrabold text-orange-500 leading-none">{halfDay}</p>
                    <p className="text-xs text-stone-500 mt-1.5 font-semibold">Half Day</p>
                    <p className="text-xs text-stone-400 mt-0.5">After 10:00 AM</p>
                </div>

                {/* Total Late Time */}
                <div className="border border-amber-200 bg-white rounded-2xl p-4 shadow-sm">
                    <div className="flex items-center gap-1.5 mb-2">
                        <div className="w-2 h-2 rounded-full bg-amber-300"></div>
                        <FaClock className="text-amber-400 text-xs" />
                    </div>
                    <p className="text-2xl font-extrabold text-stone-700 leading-none">
                        {totalLateMinutes > 0 ? formatLate(totalLateMinutes) : '0m'}
                    </p>
                    <p className="text-xs text-stone-500 mt-1.5 font-semibold">Total Late Time</p>
                    <p className="text-xs text-stone-400 mt-0.5">Cumulative this month</p>
                </div>

                {/* Working Days */}
                <div className="border border-stone-200 bg-white rounded-2xl p-4 shadow-sm">
                    <div className="w-2 h-2 rounded-full bg-stone-300 mb-2"></div>
                    <p className="text-2xl font-extrabold text-stone-600 leading-none">{totalDays}</p>
                    <p className="text-xs text-stone-500 mt-1.5 font-semibold">Working Days</p>
                    <p className="text-xs text-stone-400 mt-0.5">Excl. weekends & holidays</p>
                </div>
            </div>



            {/* Filter */}
            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-4 mb-5 flex gap-3 items-end flex-wrap">
                <div>
                    <label className="text-xs font-bold text-stone-400 block mb-1.5 uppercase tracking-wide">Month</label>
                    <select value={month} onChange={e => setMonth(e.target.value)}
                        className="border border-stone-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-stone-50">
                        {Array.from({length:12},(_,i) => (
                            <option key={i+1} value={i+1}>{new Date(0,i).toLocaleString('default',{month:'long'})}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="text-xs font-bold text-stone-400 block mb-1.5 uppercase tracking-wide">Year</label>
                    <input type="number" value={year} onChange={e => setYear(e.target.value)}
                        className="border border-stone-300 rounded-xl px-3 py-2 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-stone-50" />
                </div>
                <button onClick={fetchAttendance}
                    className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-5 py-2 rounded-xl text-sm font-bold transition shadow-sm">
                    <FaFilter /> Apply Filter
                </button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
                {loading ? (
                    <div className="flex items-center justify-center py-14">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
                    </div>
                ) : attendance.length === 0 ? (
                    <div className="text-center py-14 text-stone-400">
                        <FaCalendarCheck className="text-4xl mx-auto mb-3 opacity-20" />
                        <p className="font-semibold">No records for this period</p>
  
                    </div>
                ) : (
                    <>
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs uppercase bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold tracking-wide">
                                <tr>
                                    <th className="px-5 py-3.5">#</th>
                                    <th className="px-5 py-3.5">Date</th>
                                    <th className="px-5 py-3.5">Check In</th>
                                    <th className="px-5 py-3.5">Check Out</th>
                                    <th className="px-5 py-3.5">Status</th>
                                    <th className="px-5 py-3.5">Late By</th>
                                    <th className="px-5 py-3.5">Hours Worked</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-50">
                                {attendance.map((a, i) => {
                                    const workedMins = Number(a.workedMinutes) || 0
                                    const wh = Math.floor(workedMins / 60)
                                    const wm = workedMins % 60
                                    const workedStr = workedMins > 0
                                        ? (wh > 0 ? `${wh}h ${wm}m` : `${wm}m`)
                                        : '-'
                                    const lateM = Number(a.lateMinutes) || 0

                                    return (
                                        <tr key={a._id} className="hover:bg-teal-50/30 transition">
                                            <td className="px-5 py-3.5 text-stone-400 font-medium text-xs">{i+1}</td>
                                            <td className="px-5 py-3.5 font-bold text-stone-800">{a.date}</td>
                                            <td className="px-5 py-3.5">
                                                {a.checkIn
                                                    ? <span className="text-emerald-700 font-semibold bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 rounded-lg text-xs">{a.checkIn}</span>
                                                    : <span className="text-stone-300 text-xs">-</span>
                                                }
                                            </td>
                                            <td className="px-5 py-3.5">
                                                {a.checkOut
                                                    ? <span className="text-amber-700 font-semibold bg-amber-50 border border-amber-100 px-2.5 py-0.5 rounded-lg text-xs">{a.checkOut}</span>
                                                    : <span className="text-stone-300 text-xs">-</span>
                                                }
                                            </td>
                                            <td className="px-5 py-3.5">{badge(a.status)}</td>
                                            <td className="px-5 py-3.5">
                                                {lateM > 0
                                                    ? <span className="text-amber-600 font-bold text-xs bg-amber-50 border border-amber-100 px-2.5 py-0.5 rounded-lg">{formatLate(lateM)}</span>
                                                    : <span className="text-stone-300 text-xs">-</span>
                                                }
                                            </td>
                                            <td className="px-5 py-3.5">
                                                {workedMins > 0
                                                    ? <span className={`font-semibold text-xs px-2.5 py-0.5 rounded-lg border ${
                                                        workedMins >= 480
                                                            ? 'text-teal-700 bg-teal-50 border-teal-100'
                                                            : 'text-orange-600 bg-orange-50 border-orange-100'
                                                    }`}>{workedStr}</span>
                                                    : <span className="text-stone-300 text-xs">-</span>
                                                }
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                        <div className="px-5 py-3 bg-stone-50 border-t border-stone-100 flex items-center justify-between flex-wrap gap-2">
                            <p className="text-xs text-stone-400">{attendance.length} record{attendance.length !== 1 ? 's' : ''} found</p>
                            <div className="flex items-center gap-1.5 text-xs text-stone-400">
                                <FaInfoCircle className="text-teal-400" />
                                Green hours = 8h+ completed · Orange = less than 8h
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
export default AttendanceEmployee
