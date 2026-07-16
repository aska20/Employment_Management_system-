import React, { useState, useEffect } from 'react'
import ConfirmModal from '../ConfirmModal'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../../context/authContext'
import { API_BASE, apiUrl, fileUrl } from '../../utils/apiConfig'
import {
    FaUser, FaEnvelope, FaBriefcase, FaBuilding, FaCalendarAlt,
    FaVenusMars, FaHeart, FaMoneyBillWave, FaEdit, FaTrash,
    FaArrowLeft, FaIdBadge, FaCalendarCheck, FaFileAlt, FaUserTie
} from 'react-icons/fa'

const InfoRow = ({ icon, label, value, valueCls='' }) => (
    <div className="flex items-start gap-3 py-3 border-b border-stone-100 last:border-0">
        <div className="w-8 h-8 bg-teal-50 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
            {React.cloneElement(icon, { className: 'text-teal-600 text-sm' })}
        </div>
        <div>
            <p className="text-xs text-stone-400 font-medium uppercase tracking-wide">{label}</p>
            <p className={`text-stone-800 font-semibold text-sm mt-0.5 ${valueCls}`}>{value || '—'}</p>
        </div>
    </div>
)

const StatCard = ({ label, value, color, icon }) => (
    <div className={`rounded-xl p-4 border ${color} flex items-center gap-3`}>
        <div className="text-2xl">{icon}</div>
        <div>
            <p className="text-2xl font-bold text-stone-800">{value ?? '—'}</p>
            <p className="text-xs text-stone-500 font-medium mt-0.5">{label}</p>
        </div>
    </div>
)

const View = () => {
    const { id }       = useParams()
    const navigate     = useNavigate()
    const { user }     = useAuth()
    const [employee, setEmployee]   = useState(null)
    const [leaves, setLeaves]       = useState([])
    const [attendance, setAttendance] = useState([])
    const [loading, setLoading]     = useState(true)
const [deleting, setDeleting]   = useState(false)
const [activeTab, setActiveTab] = useState('profile')
const [showConfirm, setShowConfirm] = useState(false)

    useEffect(() => {
        const fetchAll = async () => {
            try {
                const r = await axios.get(`${API_BASE}/api/employee/${id}`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                })
                if (r.data.success) {
                    const emp = r.data.employee
                    setEmployee(emp)
                    // Fetch leaves
                    try {
                        const lr = await axios.get(`${API_BASE}/api/leave/employee/${emp._id}`, {
                            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                        })
                        if (lr.data.success) setLeaves(lr.data.leaves)
                    } catch {}
                    // Fetch recent attendance
                    try {
                        const ar = await axios.get(`${API_BASE}/api/attendance/employee/${emp.userId._id}`, {
                            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                        })
                        if (ar.data.success) setAttendance(ar.data.attendance.slice(0, 10))
                    } catch {}
                }
            } catch (error) {
                console.error(error)
            }
            setLoading(false)
        }
        fetchAll()
    }, [id])

const handleDelete = async () => {
    setShowConfirm(false)
    setDeleting(true)
        try {
            const r = await axios.delete(`${API_BASE}/api/employee/${id}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            })
            if (r.data.success) navigate('/admin-dashboard/employees')
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to delete employee')
        }
        setDeleting(false)
    }

    if (loading) return (
        <div className="flex items-center justify-center h-64 bg-stone-50">
            <div className="text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600 mx-auto mb-3"></div>
                <p className="text-stone-400 text-sm">Loading employee profile...</p>
            </div>
        </div>
    )

    if (!employee) return (
        <div className="flex items-center justify-center h-64 bg-stone-50">
            <p className="text-stone-400">Employee not found</p>
        </div>
    )

    const approvedLeaves = leaves.filter(l => l.status === 'Approved').length
    const pendingLeaves  = leaves.filter(l => l.status === 'Pending').length
    const presentDays    = attendance.filter(a => a.status === 'Present' || a.status === 'Late').length
    const age = employee.dob ? Math.floor((new Date() - new Date(employee.dob)) / (365.25 * 86400000)) : null

    const tabs = [
        { key: 'profile',    label: 'Profile' },
        { key: 'leaves',     label: `Leaves (${leaves.length})` },
        { key: 'attendance', label: 'Attendance' },
    ]

    return (
        <div className="min-h-full bg-stone-100">
            {/* Hero Banner */}
            <div className="bg-gradient-to-r from-teal-800 via-teal-700 to-teal-600 px-6 pt-6 pb-20">
                <button onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-teal-200 hover:text-white text-sm mb-6 transition">
                    <FaArrowLeft /> Back
                </button>
                <div className="flex flex-col md:flex-row items-start md:items-center gap-5">
                    <div className="relative">
                        <img
                            src={`${API_BASE}/${employee.userId?.profileImage}`}
                            alt={employee.userId?.name}
                            className="w-24 h-24 rounded-2xl object-cover border-4 border-white/30 shadow-xl"
                            onError={e => { e.target.src = `https://ui-avatars.com/api/?name=${employee.userId?.name}&size=96&background=0f766e&color=fff` }}
                        />
                    </div>
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold text-white">{employee.userId?.name}</h1>
                        <p className="text-teal-200 text-sm mt-0.5">{employee.designation} - {employee.department?.dep_name}</p>
                        <div className="flex flex-wrap gap-2 mt-3">
                            <span className="bg-white/20 text-white text-xs px-3 py-1 rounded-full font-medium">
                                ID: {employee.employeeId}
                            </span>
                            <span className={`text-xs px-3 py-1 rounded-full font-semibold ${employee.userId?.role === 'admin' ? 'bg-amber-400 text-amber-900' : 'bg-teal-400/30 text-white'}`}>
                                {employee.userId?.role}
                            </span>
                            {age && (
                                <span className="bg-white/20 text-white text-xs px-3 py-1 rounded-full font-medium">
                                    Age: {age}
                                </span>
                            )}
                        </div>
                    </div>
                    {/* Action Buttons — only for admin */}
                    {user?.role === 'admin' && (
                        <div className="flex gap-2 mt-2 md:mt-0">
                            <button
                                onClick={() => navigate(`/admin-dashboard/employees/edit/${id}`)}
                                className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white font-semibold px-4 py-2 rounded-xl text-sm transition border border-white/20">
                                <FaEdit /> Edit
                            </button>
                            <button
                                onClick={() => setShowConfirm(true)}
                                disabled={deleting}
                                className="flex items-center gap-2 bg-red-500/80 hover:bg-red-600 disabled:opacity-50 text-white font-semibold px-4 py-2 rounded-xl text-sm transition">
                                <FaTrash /> {deleting ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Stats Row — overlapping banner */}
            <div className="px-6 -mt-10">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <StatCard label="Monthly Salary"  value={`Rs.${employee.salary?.toLocaleString()}`} color="border-teal-100 bg-white"   icon="" />
                    <StatCard label="Approved Leaves" value={approvedLeaves}   color="border-emerald-100 bg-white" icon="" />
                    <StatCard label="Pending Leaves"  value={pendingLeaves}    color="border-amber-100 bg-white"    />
                    <StatCard label="Days Present"    value={`${presentDays}/10`} color="border-blue-100 bg-white"  icon="" />
                </div>
            </div>

            {/* Tabs */}
            <div className="px-6 mt-5">
                <div className="flex gap-1 bg-white rounded-xl p-1 border border-stone-200 shadow-sm w-fit">
                    {tabs.map(t => (
                        <button key={t.key} onClick={() => setActiveTab(t.key)}
                            className={`px-5 py-2 rounded-lg text-sm font-semibold transition ${activeTab === t.key ? 'bg-teal-600 text-white shadow-sm' : 'text-stone-600 hover:bg-stone-100'}`}>
                            {t.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="px-6 pb-8 mt-5">
                {/* ── Profile Tab ── */}
                {activeTab === 'profile' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                        {/* Personal Info */}
                        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
                            <div className="bg-teal-600 px-5 py-3 flex items-center gap-2">
                                <FaUser className="text-teal-100 text-sm" />
                                <h3 className="font-semibold text-white text-sm">Personal Information</h3>
                            </div>
                            <div className="px-5">
                                <InfoRow icon={<FaUser />}        label="Full Name"       value={employee.userId?.name} valueCls="capitalize" />
                                <InfoRow icon={<FaCalendarAlt />} label="Date of Birth"   value={employee.dob ? new Date(employee.dob).toLocaleDateString('en-NP', { day:'numeric', month:'long', year:'numeric' }) : '—'} />
                                <InfoRow icon={<FaVenusMars />}   label="Gender"          value={employee.gender} valueCls="capitalize" />
                                <InfoRow icon={<FaHeart />}       label="Marital Status"  value={employee.maritalStatus} valueCls="capitalize" />
                                <InfoRow icon={<FaIdBadge />}     label="Employee ID"     value={employee.employeeId} />
                            </div>
                        </div>

                        {/* Professional Info */}
                        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
                            <div className="bg-teal-600 px-5 py-3 flex items-center gap-2">
                                <FaBriefcase className="text-teal-100 text-sm" />
                                <h3 className="font-semibold text-white text-sm">Professional Information</h3>
                            </div>
                            <div className="px-5">
                                <InfoRow icon={<FaBriefcase />}     label="Designation"   value={employee.designation} valueCls="capitalize" />
                                <InfoRow icon={<FaBuilding />}      label="Department"    value={employee.department?.dep_name} valueCls="capitalize" />
                                <InfoRow icon={<FaUserTie />}       label="Role"          value={employee.userId?.role} valueCls="capitalize" />
                                <InfoRow icon={<FaMoneyBillWave />} label="Monthly Salary" value={`Rs. ${employee.salary?.toLocaleString()}`} />
                                <InfoRow icon={<FaEnvelope />}      label="Email"         value={employee.userId?.email} valueCls="lowercase" />
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="space-y-3">
                            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-5">
                                <h3 className="font-semibold text-stone-700 text-sm mb-4 flex items-center gap-2">
                                    <FaUserTie className="text-teal-600" /> Quick Actions
                                </h3>
                                <div className="space-y-2">
                                    <button onClick={() => navigate(`/admin-dashboard/employees/edit/${id}`)}
                                        className="w-full flex items-center gap-3 px-4 py-3 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-xl text-sm font-semibold transition border border-teal-100">
                                        <FaEdit /> Edit Employee Info
                                    </button>
                                    <button onClick={() => navigate(`/admin-dashboard/employees/salary/${id}`)}
                                        className="w-full flex items-center gap-3 px-4 py-3 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-xl text-sm font-semibold transition border border-amber-100">
                                        <FaMoneyBillWave /> View Salary Records
                                    </button>
                                    <button onClick={() => setActiveTab('leaves')}
                                        className="w-full flex items-center gap-3 px-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-sm font-semibold transition border border-blue-100">
                                        <FaCalendarCheck /> View Leave History
                                    </button>
                                    <button onClick={() => setActiveTab('attendance')}
                                        className="w-full flex items-center gap-3 px-4 py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-sm font-semibold transition border border-emerald-100">
                                        <FaFileAlt /> View Attendance
                                    </button>
                                    {user?.role === 'admin' && (
<button onClick={() => setShowConfirm(true)} disabled={deleting}
                                            className="w-full flex items-center gap-3 px-4 py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-sm font-semibold transition border border-red-100 disabled:opacity-50">
                                            <FaTrash /> {deleting ? 'Deleting...' : 'Delete Employee'}
                                        </button>
                                    )}
                                </div>
                            </div>

                        </div>
                    </div>
                )}

                {/* ── Leaves Tab ── */}
                {activeTab === 'leaves' && (
                    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
                        <div className="bg-teal-600 px-5 py-3 flex items-center justify-between">
                            <h3 className="font-semibold text-white text-sm flex items-center gap-2">
                                <FaCalendarCheck /> Leave History ({leaves.length})
                            </h3>
                            <div className="flex gap-3 text-xs text-teal-100">
                                <span> Approved: {approvedLeaves}</span>
                                <span>⏳ Pending: {pendingLeaves}</span>
                                <span> Rejected: {leaves.filter(l => l.status === 'Rejected').length}</span>
                            </div>
                        </div>
                        {leaves.length === 0 ? (
                            <div className="text-center py-12 text-stone-400">
                                <FaCalendarAlt className="text-4xl mx-auto mb-3 opacity-20" />
                                <p className="font-medium">No leave records found</p>
                            </div>
                        ) : (
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs uppercase bg-stone-50 border-b text-stone-500">
                                    <tr>
                                        <th className="px-5 py-3">#</th>
                                        <th className="px-5 py-3">Leave Type</th>
                                        <th className="px-5 py-3">From</th>
                                        <th className="px-5 py-3">To</th>
                                        <th className="px-5 py-3">Days</th>
                                        <th className="px-5 py-3">Reason</th>
                                        <th className="px-5 py-3">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-50">
                                    {leaves.map((l, i) => {
                                        const days = Math.ceil((new Date(l.endDate) - new Date(l.startDate)) / 86400000) + 1
                                        const badge = { Approved: 'bg-emerald-100 text-emerald-700', Rejected: 'bg-red-100 text-red-700', Pending: 'bg-amber-100 text-amber-700' }
                                        return (
                                            <tr key={l._id} className="hover:bg-stone-50 transition">
                                                <td className="px-5 py-3 text-stone-400">{i+1}</td>
                                                <td className="px-5 py-3">
                                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${l.leaveType === 'Sick Leave' ? 'bg-red-100 text-red-700' : l.leaveType === 'Casual Leave' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                                        {l.leaveType}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3 text-stone-600">{new Date(l.startDate).toLocaleDateString()}</td>
                                                <td className="px-5 py-3 text-stone-600">{new Date(l.endDate).toLocaleDateString()}</td>
                                                <td className="px-5 py-3 font-medium">{days}</td>
                                                <td className="px-5 py-3 text-stone-500 max-w-xs truncate">{l.reason || '—'}</td>
                                                <td className="px-5 py-3">
                                                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${badge[l.status] || 'bg-stone-100 text-stone-600'}`}>{l.status}</span>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}

                {/* ── Attendance Tab ── */}
                {activeTab === 'attendance' && (
                    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
                        <div className="bg-teal-600 px-5 py-3 flex items-center gap-2">
                            <FaCalendarCheck className="text-teal-100 text-sm" />
                            <h3 className="font-semibold text-white text-sm">Recent Attendance (Last 10 records)</h3>
                        </div>
                        {attendance.length === 0 ? (
                            <div className="text-center py-12 text-stone-400">
                                <FaCalendarAlt className="text-4xl mx-auto mb-3 opacity-20" />
                                <p className="font-medium">No attendance records found</p>
                            </div>
                        ) : (
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs uppercase bg-stone-50 border-b text-stone-500">
                                    <tr>
                                        <th className="px-5 py-3">#</th>
                                        <th className="px-5 py-3">Date</th>
                                        <th className="px-5 py-3">Check In</th>
                                        <th className="px-5 py-3">Check Out</th>
                                        <th className="px-5 py-3">Status</th>
                                        <th className="px-5 py-3">Late By</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-50">
                                    {attendance.map((a, i) => {
                                        const badge = { Present: 'bg-emerald-100 text-emerald-700', Absent: 'bg-red-100 text-red-700', Late: 'bg-amber-100 text-amber-700', 'Half Day': 'bg-orange-100 text-orange-700' }
                                        return (
                                            <tr key={a._id} className="hover:bg-stone-50 transition">
                                                <td className="px-5 py-3 text-stone-400">{i+1}</td>
                                                <td className="px-5 py-3 font-medium text-stone-700">{a.date}</td>
                                                <td className="px-5 py-3 text-emerald-600 font-medium">{a.checkIn || '—'}</td>
                                                <td className="px-5 py-3 text-amber-600 font-medium">{a.checkOut || '—'}</td>
                                                <td className="px-5 py-3"><span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${badge[a.status] || 'bg-stone-100 text-stone-600'}`}>{a.status}</span></td>
                                                <td className="px-5 py-3 text-xs text-amber-600 font-medium">
                                                    {a.lateMinutes > 0 ? `${a.lateMinutes >= 60 ? Math.floor(a.lateMinutes/60)+'h ' : ''}${a.lateMinutes%60}m` : '—'}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}
            </div>
  
<ConfirmModal
                isOpen={showConfirm}
                title={`Delete ${employee?.userId?.name}?`}
                message="This will permanently remove the employee and their login account. This action cannot be undone."
                onConfirm={handleDelete}
                onCancel={() => setShowConfirm(false)}
            />
                  </div>
        )
}

export default View
