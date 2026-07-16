import React, { useEffect, useState } from 'react'
import { FaBuilding, FaCheckCircle, FaFileAlt, FaHourglassHalf, FaMoneyBillWave, FaTimesCircle, FaUsers, FaUserCheck, FaArrowRight, FaChartLine, FaLeaf, FaExternalLinkAlt } from 'react-icons/fa'
import axios from 'axios'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/authContext'
import { API_BASE } from '../../utils/apiConfig'

const AdminSummary = () => {
    const { user } = useAuth()
    const [summary, setSummary] = useState(null)
    const [error, setError]     = useState(null)

    useEffect(() => {
        const fetchSummary = async () => {
            try {
                const r = await axios.get(`${API_BASE}/api/dashboard/summary`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                })
                if (r.data.success) setSummary(r.data)
                else setError('Failed to load dashboard data')
            } catch (err) {
                if (err.code === 'ERR_NETWORK') setError('Cannot connect to server. Make sure Node.js server is running on port 5000.')
                else if (err.response?.status === 401) setError('Session expired. Please logout and login again.')
                else setError(`Error: ${err.message}`)
            }
        }
        fetchSummary()
    }, [])

    if (error) return (
        <div className="p-6 bg-gradient-to-br from-stone-100 to-stone-50 min-h-full flex items-start justify-center pt-16">
            <div className="bg-white border border-red-200 rounded-2xl p-6 max-w-md w-full text-center shadow-sm">
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <FaTimesCircle className="text-red-500 text-xl" />
                </div>
                <h3 className="font-bold text-stone-800 mb-2">Dashboard Failed to Load</h3>
                <p className="text-sm text-red-600 mb-4">{error}</p>
                <button onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-lg transition">
                    Retry
                </button>
            </div>
        </div>
    )

    if (!summary) return (
        <div className="p-6 bg-gradient-to-br from-stone-100 to-stone-50 min-h-full flex flex-col items-center justify-center h-64 gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
            <p className="text-stone-400 text-sm">Loading dashboard...</p>
        </div>
    )

    return (
        <div className="p-6 bg-gradient-to-br from-stone-100 to-stone-50 min-h-full">

            {/* ── Welcome Banner ── */}
            <div className="bg-gradient-to-r from-teal-900 via-teal-800 to-teal-600 rounded-3xl p-7 mb-7 shadow-xl relative overflow-hidden">
                <div className="absolute -top-10 -right-10 w-52 h-52 bg-white/5 rounded-full"></div>
                <div className="absolute -bottom-8 left-24 w-36 h-36 bg-white/5 rounded-full"></div>
                <div className="absolute top-4 right-32 w-20 h-20 bg-teal-500/20 rounded-full"></div>
                <div className="relative flex items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <FaLeaf className="text-teal-300 text-sm" />
                            <p className="text-teal-300 text-sm font-medium">Admin Panel</p>
                        </div>
                        <h2 className="text-white text-3xl font-extrabold tracking-tight">Dashboard Overview</h2>
                        <p className="text-teal-300/80 text-sm mt-1.5">
                            {new Date().toLocaleDateString('en-NP', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                    </div>
                    <div className="hidden md:flex items-center gap-2 bg-white/10 border border-white/20 rounded-2xl px-5 py-3">
                        <FaChartLine className="text-teal-300" />
                        <div>
                            <p className="text-teal-200 text-xs">Total Workforce</p>
                            <p className="text-white font-extrabold text-2xl leading-none">{summary.totalEmployees}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Top Stats ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {/* Employees */}
                <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-5 flex items-center gap-4 hover:shadow-md transition group">
                    <div className="w-14 h-14 bg-teal-600 group-hover:bg-teal-700 rounded-2xl flex items-center justify-center text-white text-xl flex-shrink-0 shadow-md transition">
                        <FaUsers />
                    </div>
                    <div>
                        <p className="text-3xl font-extrabold text-stone-800">{summary.totalEmployees}</p>
                        <p className="text-stone-500 text-xs font-semibold uppercase tracking-wide mt-0.5">Total Employees</p>
                    </div>
                    <Link to="/admin-dashboard/employees" className="ml-auto text-stone-300 group-hover:text-teal-500 transition">
                        <FaArrowRight />
                    </Link>
                </div>

                {/* Departments */}
                <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-5 flex items-center gap-4 hover:shadow-md transition group">
                    <div className="w-14 h-14 bg-stone-700 group-hover:bg-stone-800 rounded-2xl flex items-center justify-center text-white text-xl flex-shrink-0 shadow-md transition">
                        <FaBuilding />
                    </div>
                    <div>
                        <p className="text-3xl font-extrabold text-stone-800">{summary.totalDepartments}</p>
                        <p className="text-stone-500 text-xs font-semibold uppercase tracking-wide mt-0.5">Total Departments</p>
                    </div>
                    <Link to="/admin-dashboard/departments" className="ml-auto text-stone-300 group-hover:text-teal-500 transition">
                        <FaArrowRight />
                    </Link>
                </div>

                {/* Monthly Salary — clickable */}
                <Link to="/admin-dashboard/salary-breakdown"
                    className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl shadow-md p-5 flex items-center gap-4 hover:shadow-lg hover:from-amber-600 hover:to-amber-700 transition group">
                    <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-white text-xl flex-shrink-0">
                        <FaMoneyBillWave />
                    </div>
                    <div className="flex-1">
                        <p className="text-2xl font-extrabold text-white">Rs. {(summary.totalSalary || 0).toLocaleString()}</p>
                        <p className="text-amber-100 text-xs font-semibold uppercase tracking-wide mt-0.5">Monthly Payroll</p>
                    </div>
                    <FaExternalLinkAlt className="text-amber-200 group-hover:text-white transition text-sm" />
                </Link>
            </div>

            {/* ── Leave Summary ── */}
            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden mb-6">
                <div className="bg-gradient-to-r from-teal-700 to-teal-600 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <FaFileAlt className="text-teal-200" />
                        <h3 className="font-bold text-white">Leave Summary</h3>
                    </div>
                    <Link to="/admin-dashboard/leaves"
                        className="text-teal-200 hover:text-white text-xs font-semibold flex items-center gap-1 transition">
                        View All <FaArrowRight className="text-[10px]" />
                    </Link>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-stone-100">
                    {[
                        { icon: <FaFileAlt />,       label: 'Applied',  value: summary.leaveSummary?.appliedFor, bg: 'bg-blue-50',    icon_bg: 'bg-blue-100',    icon_col: 'text-blue-600',    val_col: 'text-blue-700'    },
                        { icon: <FaCheckCircle />,   label: 'Approved', value: summary.leaveSummary?.approved,   bg: 'bg-emerald-50', icon_bg: 'bg-emerald-100', icon_col: 'text-emerald-600', val_col: 'text-emerald-700' },
                        { icon: <FaHourglassHalf />, label: 'Pending',  value: summary.leaveSummary?.pending,    bg: 'bg-amber-50',   icon_bg: 'bg-amber-100',   icon_col: 'text-amber-600',   val_col: 'text-amber-700'   },
                        { icon: <FaTimesCircle />,   label: 'Rejected', value: summary.leaveSummary?.rejected,   bg: 'bg-red-50',     icon_bg: 'bg-red-100',     icon_col: 'text-red-500',     val_col: 'text-red-600'     },
                    ].map(s => (
                        <div key={s.label} className={`${s.bg} p-5 text-center flex flex-col items-center gap-2`}>
                            <div className={`w-10 h-10 ${s.icon_bg} rounded-xl flex items-center justify-center ${s.icon_col} text-base`}>
                                {s.icon}
                            </div>
                            <p className={`text-3xl font-extrabold ${s.val_col}`}>{s.value ?? 0}</p>
                            <p className="text-stone-500 text-xs font-semibold uppercase tracking-wide">{s.label}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Quick Actions ── */}
            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-stone-700 to-stone-600 px-6 py-4">
                    <h3 className="font-bold text-white flex items-center gap-2">
                        <FaChartLine className="text-stone-300" /> Quick Actions
                    </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 divide-x divide-stone-100">
                    {[
                        {
                            to:      '/admin-dashboard/attendance',
                            icon:    <FaUserCheck className="text-teal-600 text-lg" />,
                            iconBg:  'bg-teal-100 group-hover:bg-teal-200',
                            title:   "Today's Attendance",
                            desc:    'View who is present today',
                            border:  'hover:border-teal-200',
                            arrow:   'group-hover:text-teal-500',
                        },
                        {
                            to:      '/admin-dashboard/attendance/register-face',
                            icon:    <FaUsers className="text-stone-600 text-lg" />,
                            iconBg:  'bg-stone-100 group-hover:bg-stone-200',
                            title:   'Register Face',
                            desc:    'Add face for attendance system',
                            border:  'hover:border-stone-300',
                            arrow:   'group-hover:text-stone-500',
                        },
                        {
                            to:      '/admin-dashboard/leaves',
                            icon:    <FaFileAlt className="text-amber-600 text-lg" />,
                            iconBg:  'bg-amber-100 group-hover:bg-amber-200',
                            title:   'Pending Leaves',
                            desc:    'Review and action leave requests',
                            border:  'hover:border-amber-200',
                            arrow:   'group-hover:text-amber-500',
                        },
                    ].map(a => (
                        <Link key={a.to} to={a.to}
                            className={`flex items-center gap-4 p-5 hover:bg-stone-50 transition group border-t border-stone-100 md:border-t-0`}>
                            <div className={`w-12 h-12 ${a.iconBg} rounded-xl flex items-center justify-center flex-shrink-0 transition`}>
                                {a.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-stone-800 text-sm">{a.title}</p>
                                <p className="text-stone-400 text-xs mt-0.5 truncate">{a.desc}</p>
                            </div>
                            <FaArrowRight className={`text-stone-300 ${a.arrow} transition text-sm flex-shrink-0`} />
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    )
}

export default AdminSummary
