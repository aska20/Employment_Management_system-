import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import axios from 'axios'
import { ML_SERVICE_URL } from '../../utils/serviceConfig'
import { API_BASE } from '../../utils/apiConfig'
import {
    FaCheckCircle, FaTimesCircle, FaExclamationTriangle,
    FaUserTie, FaCalendarAlt, FaChartBar, FaClock,
    FaInfoCircle, FaDatabase, FaUser, FaShieldAlt,
    FaArrowUp, FaArrowDown, FaMinus
} from 'react-icons/fa'

const Detail = () => {
    const { id }   = useParams()
    const navigate = useNavigate()
    const [leave, setLeave]           = useState(null)
    const [prediction, setPrediction] = useState(null)
    const [predicting, setPredicting] = useState(false)
    const [history, setHistory]       = useState([])
    const [consistency, setConsistency] = useState(null)
    const [loading, setLoading]       = useState(true)

    useEffect(() => {
        const fetchLeave = async () => {
            try {
                const r = await axios.get(`${API_BASE}/api/leave/detail/${id}`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                })
                if (r.data.success) {
                    setLeave(r.data.leave)
                    await fetchHistory(r.data.leave)
                }
            } catch (err) { console.error(err) }
            setLoading(false)
        }
        fetchLeave()
    }, [id])

    const fetchHistory = async (leaveData) => {
        try {
            const r = await axios.get(`${API_BASE}/api/leave/employee/${leaveData.employeeId._id}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            })
            if (r.data.success) {
                const all = r.data.leaves.filter(l => l._id !== leaveData._id)
                setHistory(all)
                analyzeConsistency(all, leaveData)
            }
        } catch {}
    }

    const analyzeConsistency = (historyLeaves, currentLeave) => {
        const decided  = historyLeaves.filter(l => ['Approved','Rejected'].includes(l.status))
        const approved = decided.filter(l => l.status === 'Approved').length
        const rejected = decided.filter(l => l.status === 'Rejected').length
        const pending  = historyLeaves.filter(l => l.status === 'Pending').length
        const rate     = decided.length > 0 ? Math.round(approved / decided.length * 100) : null
        const avgDuration = decided.length > 0
            ? Math.round(decided.reduce((sum, l) =>
                sum + (Math.ceil((new Date(l.endDate) - new Date(l.startDate)) / 86400000) + 1), 0) / decided.length)
            : 0
        const currDuration = Math.ceil((new Date(currentLeave.endDate) - new Date(currentLeave.startDate)) / 86400000) + 1
        setConsistency({ approved, rejected, pending, total: decided.length, rate, avgDuration, currDuration })
    }

    const getPrediction = async () => {
        if (!leave) return
        setPredicting(true)
        setPrediction(null)
        try {
            const start    = new Date(leave.startDate)
            const end      = new Date(leave.endDate)
            const duration = Math.max(1, Math.ceil((end - start) / 86400000) + 1)
            const emp      = leave.employeeId

            const payload = {
                leaveTypeName:       leave.leaveType,
                leaveDuration:       duration,
                month:               start.getMonth() + 1,
                dayOfWeek:           start.getDay(),
                employeeId:          emp.employeeId || '',
                previousLeavesTaken: consistency?.total || 0,
            }

            const res = await axios.post(`${ML_SERVICE_URL}/predict-leave`, payload)
            setPrediction(res.data)
        } catch {
            setPrediction({ error: 'Could not connect to prediction service on port 5002.' })
        }
        setPredicting(false)
    }

    const changeStatus = async (leaveId, status) => {
        if (!window.confirm(`Are you sure you want to ${status.toLowerCase()} this leave?`)) return
        try {
            const r = await axios.put(`${API_BASE}/api/leave/${leaveId}`, { status }, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            })
            if (r.data.success) {
                // Update local state immediately so UI reflects change
                setLeave(prev => ({ ...prev, status }))
                // Refresh history to show updated status
                const updated = { ...leave, status }
                await fetchHistory(updated)
            }
        } catch (err) { alert(err.response?.data?.error || 'Failed to update') }
    }

    const statusBadge = (s) => {
        const map = {
            Approved: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
            Rejected: 'bg-red-100 text-red-700 border border-red-200',
            Pending:  'bg-amber-100 text-amber-700 border border-amber-200',
        }
        return <span className={`px-3 py-1 rounded-full text-xs font-bold ${map[s] || 'bg-stone-100 text-stone-600'}`}>{s}</span>
    }

    const duration = leave ? Math.ceil((new Date(leave.endDate) - new Date(leave.startDate)) / 86400000) + 1 : 0

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
        </div>
    )
    if (!leave) return <div className="p-6 text-stone-500">Leave not found.</div>

    const comp = prediction?.components

    return (
        <div className="p-6 bg-stone-50 min-h-full">
            <div className="max-w-5xl mx-auto">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-stone-800">Leave Request</h2>
                        <p className="text-stone-400 text-sm mt-0.5">Review the request and employee history</p>
                    </div>
                    {statusBadge(leave.status)}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                    {/* Left column */}
                    <div className="lg:col-span-2 space-y-5">

                        {/* Employee */}
                        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
                            <div className="bg-teal-700 px-5 py-3 flex items-center gap-2">
                                <FaUserTie className="text-teal-200 text-sm" />
                                <h3 className="font-semibold text-white text-sm">Employee</h3>
                            </div>
                            <div className="p-5 flex gap-5 items-start">
                                <img
                                    src={`${API_BASE}/${leave.employeeId.userId.profileImage}`}
                                    className="w-16 h-16 rounded-xl object-cover border border-stone-200 flex-shrink-0"
                                    onError={e => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(leave.employeeId.userId.name)}&background=0f766e&color=fff&size=64` }}
                                />
                                <div className="grid grid-cols-2 gap-x-8 gap-y-3 flex-1">
                                    {[
                                        ['Name',        leave.employeeId.userId.name],
                                        ['Employee ID', leave.employeeId.employeeId],
                                        ['Department',  leave.employeeId.department?.dep_name],
                                        ['Designation', leave.employeeId.designation || '-'],
                                    ].map(([label, value]) => (
                                        <div key={label}>
                                            <p className="text-xs text-stone-400 font-medium">{label}</p>
                                            <p className="text-sm font-semibold text-stone-700">{value}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Leave Details */}
                        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
                            <div className="bg-teal-700 px-5 py-3 flex items-center gap-2">
                                <FaCalendarAlt className="text-teal-200 text-sm" />
                                <h3 className="font-semibold text-white text-sm">Leave Details</h3>
                            </div>
                            <div className="p-5 grid grid-cols-2 gap-x-8 gap-y-4">
                                <div>
                                    <p className="text-xs text-stone-400 font-medium">Leave Type</p>
                                    <p className="text-sm font-bold text-teal-700 mt-0.5">{leave.leaveType}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-stone-400 font-medium">Duration</p>
                                    <p className="text-sm font-bold text-stone-700 mt-0.5">{duration} day{duration > 1 ? 's' : ''}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-stone-400 font-medium">From</p>
                                    <p className="text-sm font-semibold text-stone-700 mt-0.5">
                                        {new Date(leave.startDate).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-stone-400 font-medium">To</p>
                                    <p className="text-sm font-semibold text-stone-700 mt-0.5">
                                        {new Date(leave.endDate).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}
                                    </p>
                                </div>
                                <div className="col-span-2">
                                    <p className="text-xs text-stone-400 font-medium">Reason</p>
                                    <p className="text-sm text-stone-700 mt-1 bg-stone-50 border border-stone-200 rounded-lg p-3 leading-relaxed">
                                        {leave.reason || 'No reason provided'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-stone-400 font-medium">Applied On</p>
                                    <p className="text-sm font-semibold text-stone-700 mt-0.5">
                                        {new Date(leave.appliedAt || leave.createdAt).toLocaleDateString()}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-stone-400 font-medium">Status</p>
                                    <div className="mt-0.5">{statusBadge(leave.status)}</div>
                                </div>
                            </div>
                        </div>

                        {/* History Table */}
                        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
                            <div className="bg-stone-700 px-5 py-3 flex items-center gap-2">
                                <FaClock className="text-stone-300 text-sm" />
                                <h3 className="font-semibold text-white text-sm">
                                    Leave History ({history.length} previous requests)
                                </h3>
                            </div>
                            <div className="p-5">
                                {history.length === 0 ? (
                                    <p className="text-stone-400 text-sm text-center py-4">No previous leave records.</p>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-left">
                                            <thead className="text-xs uppercase bg-stone-50 border-b text-stone-400 font-semibold">
                                                <tr>
                                                    <th className="px-3 py-2">Type</th>
                                                    <th className="px-3 py-2">From</th>
                                                    <th className="px-3 py-2">Days</th>
                                                    <th className="px-3 py-2">Reason</th>
                                                    <th className="px-3 py-2">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-stone-50">
                                                {history.slice(0, 10).map(h => {
                                                    const d = Math.ceil((new Date(h.endDate) - new Date(h.startDate)) / 86400000) + 1
                                                    return (
                                                        <tr key={h._id} className="hover:bg-stone-50 transition">
                                                            <td className="px-3 py-2.5 text-xs font-semibold text-teal-700">{h.leaveType}</td>
                                                            <td className="px-3 py-2.5 text-xs text-stone-500">{new Date(h.startDate).toLocaleDateString()}</td>
                                                            <td className="px-3 py-2.5 text-xs font-semibold">{d}</td>
                                                            <td className="px-3 py-2.5 text-xs text-stone-400 max-w-xs truncate">{h.reason || '-'}</td>
                                                            <td className="px-3 py-2.5">{statusBadge(h.status)}</td>
                                                        </tr>
                                                    )
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right column */}
                    <div className="space-y-5">

                        {/* Consistency summary */}
                        {consistency && (
                            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
                                <div className="bg-stone-700 px-5 py-3 flex items-center gap-2">
                                    <FaChartBar className="text-stone-300 text-sm" />
                                    <h3 className="font-semibold text-white text-sm">History Summary</h3>
                                </div>
                                <div className="p-5">
                                    <div className="grid grid-cols-3 gap-2 mb-4">
                                        {[
                                            { label: 'Approved', val: consistency.approved, cls: 'bg-emerald-50 text-emerald-600' },
                                            { label: 'Rejected', val: consistency.rejected, cls: 'bg-red-50 text-red-500' },
                                            { label: 'Pending',  val: consistency.pending,  cls: 'bg-amber-50 text-amber-500' },
                                        ].map(s => (
                                            <div key={s.label} className={`text-center ${s.cls} rounded-xl p-2.5`}>
                                                <p className="text-xl font-bold">{s.val}</p>
                                                <p className="text-xs text-stone-400 mt-0.5">{s.label}</p>
                                            </div>
                                        ))}
                                    </div>
                                    {consistency.rate !== null && (
                                        <div className="mb-3">
                                            <div className="flex justify-between text-xs mb-1.5">
                                                <span className="text-stone-500 font-medium">Approval Rate</span>
                                                <span className={`font-bold ${consistency.rate >= 70 ? 'text-emerald-600' : consistency.rate >= 40 ? 'text-amber-600' : 'text-red-500'}`}>
                                                    {consistency.rate}%
                                                </span>
                                            </div>
                                            <div className="bg-stone-100 rounded-full h-1.5">
                                                <div className={`h-1.5 rounded-full ${consistency.rate >= 70 ? 'bg-emerald-500' : consistency.rate >= 40 ? 'bg-amber-400' : 'bg-red-400'}`}
                                                    style={{ width: consistency.rate + '%' }} />
                                            </div>
                                        </div>
                                    )}
                                    {consistency.total > 0 && (
                                        <div className="flex gap-2 text-xs">
                                            <div className="flex-1 bg-stone-50 border border-stone-200 rounded-lg p-2.5 text-center">
                                                <p className="font-bold text-stone-700">{consistency.avgDuration}d</p>
                                                <p className="text-stone-400 mt-0.5">Avg duration</p>
                                            </div>
                                            <div className="flex-1 bg-stone-50 border border-stone-200 rounded-lg p-2.5 text-center">
                                                <p className={`font-bold ${consistency.currDuration > consistency.avgDuration * 1.5 ? 'text-red-500' : 'text-teal-600'}`}>
                                                    {consistency.currDuration}d
                                                </p>
                                                <p className="text-stone-400 mt-0.5">This request</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Prediction panel */}
                        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
                            <div className="bg-teal-700 px-5 py-3 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <FaChartBar className="text-teal-200 text-sm" />
                                    <h3 className="font-semibold text-white text-sm">Approval Assessment</h3>
                                </div>
                                {prediction && !prediction.error && (
                                    <span className="text-xs text-teal-200 bg-teal-800/50 px-2 py-0.5 rounded-full">
                                        {prediction.overall_confidence}% model confidence
                                    </span>
                                )}
                            </div>
                            <div className="p-5">

                                {!prediction && !predicting && (
                                    <div>

                                        <button onClick={getPrediction}
                                            className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2.5 rounded-xl text-sm transition">
                                            Run Assessment
                                        </button>
                                    </div>
                                )}

                                {predicting && (
                                    <div className="flex flex-col items-center py-6 gap-3">
                                        <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-teal-600"></div>
                                        <p className="text-stone-400 text-sm">Analysing...</p>
                                    </div>
                                )}

                                {prediction?.error && (
                                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                                        {prediction.error}
                                    </div>
                                )}

                                {prediction && !prediction.error && comp && (
                                    <div className="space-y-4">

                                        {/* Score */}
                                        <div>
                                            <div className="flex justify-between items-end mb-1.5">
                                                <span className="text-xs text-stone-400 font-medium uppercase tracking-wide">Final Score</span>
                                                <span className={`text-2xl font-extrabold ${
                                                    prediction.score >= 70 ? 'text-emerald-600' :
                                                    prediction.score >= 50 ? 'text-amber-600' : 'text-red-500'
                                                }`}>{prediction.score}<span className="text-sm font-normal text-stone-300">/100</span></span>
                                            </div>
                                            <div className="bg-stone-100 rounded-full h-2">
                                                <div className={`h-2 rounded-full ${
                                                    prediction.score >= 70 ? 'bg-emerald-500' :
                                                    prediction.score >= 50 ? 'bg-amber-400' : 'bg-red-400'
                                                }`} style={{ width: prediction.score + '%' }} />
                                            </div>
                                        </div>

                                        {/* Verdict */}
                                        <div className={`rounded-xl p-3 border text-center ${
                                            prediction.verdict_class === 'approve' ? 'bg-emerald-50 border-emerald-200' :
                                            prediction.verdict_class === 'neutral' ? 'bg-amber-50 border-amber-200' :
                                            'bg-red-50 border-red-200'
                                        }`}>
                                            <p className={`font-bold text-sm ${
                                                prediction.verdict_class === 'approve' ? 'text-emerald-800' :
                                                prediction.verdict_class === 'neutral' ? 'text-amber-800' : 'text-red-700'
                                            }`}>{prediction.verdict}</p>
                                        </div>

                                        {/* 3 Components breakdown */}
                                        <div>
                                            <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">
                                                How the score is calculated
                                            </p>
                                            <div className="space-y-2">

                                                {/* RF */}
                                                <div className="border border-stone-200 rounded-xl p-3 bg-stone-50">
                                                    <div className="flex items-center justify-between mb-1.5">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                                                <FaDatabase className="text-blue-500 text-xs" />
                                                            </div>
                                                            <div>
                                                                <p className="text-xs font-semibold text-stone-700">Random Forest</p>
                                                                <p className="text-xs text-stone-400">1500 HR records - weight 30%</p>
                                                            </div>
                                                        </div>
                                                        <span className="text-sm font-bold text-blue-600">{comp.random_forest.probability}%</span>
                                                    </div>
                                                    <div className="bg-stone-200 rounded-full h-1 mb-2">
                                                        <div className="h-1 rounded-full bg-blue-400" style={{ width: comp.random_forest.probability + '%' }} />
                                                    </div>
                                                    {comp.random_forest.top_factors && (
                                                        <div className="text-xs text-stone-400 space-y-0.5">
                                                            <p className="font-medium text-stone-500">Top factors the RF considers:</p>
                                                            {comp.random_forest.top_factors.map((f, i) => (
                                                                <p key={i} className="flex justify-between">
                                                                    <span>{f.factor}</span>
                                                                    <span className="font-semibold">{f.importance}</span>
                                                                </p>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Bayesian */}
                                                <div className="border border-stone-200 rounded-xl p-3 bg-stone-50">
                                                    <div className="flex items-center justify-between mb-1.5">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-6 h-6 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                                                <FaUser className="text-teal-600 text-xs" />
                                                            </div>
                                                            <div>
                                                                <p className="text-xs font-semibold text-stone-700">Employee History (Bayesian)</p>
                                                                <p className="text-xs text-stone-400">{comp.bayesian.history_total} decisions - weight 50%</p>
                                                            </div>
                                                        </div>
                                                        <span className="text-sm font-bold text-teal-600">{comp.bayesian.probability}%</span>
                                                    </div>
                                                    <div className="bg-stone-200 rounded-full h-1 mb-2">
                                                        <div className="h-1 rounded-full bg-teal-500" style={{ width: comp.bayesian.probability + '%' }} />
                                                    </div>
                                                    <div className="text-xs text-stone-400 space-y-0.5">
                                                        <p className="flex justify-between">
                                                            <span>Overall approval rate</span>
                                                            <span className="font-semibold">{comp.bayesian.overall_rate}%</span>
                                                        </p>
                                                        <p className="flex justify-between">
                                                            <span>{leave.leaveType} approval rate</span>
                                                            <span className="font-semibold">{comp.bayesian.type_rate}%</span>
                                                        </p>
                                                        <p className="flex justify-between">
                                                            <span>History: approved / rejected</span>
                                                            <span className="font-semibold">{comp.bayesian.history_approved} / {comp.bayesian.history_rejected}</span>
                                                        </p>
                                                        <p className="text-stone-400 italic mt-1">{comp.bayesian.explanation}</p>
                                                    </div>
                                                </div>

                                                {/* Rules */}
                                                <div className="border border-stone-200 rounded-xl p-3 bg-stone-50">
                                                    <div className="flex items-center justify-between mb-1.5">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-6 h-6 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                                                <FaShieldAlt className="text-amber-600 text-xs" />
                                                            </div>
                                                            <div>
                                                                <p className="text-xs font-semibold text-stone-700">Duration Rules</p>
                                                                <p className="text-xs text-stone-400">Leave type limits - weight 20%</p>
                                                            </div>
                                                        </div>
                                                        <span className={`text-sm font-bold ${comp.rules.hard_blocked ? 'text-red-500' : 'text-amber-600'}`}>
                                                            {comp.rules.probability}%
                                                        </span>
                                                    </div>
                                                    <div className="bg-stone-200 rounded-full h-1 mb-2">
                                                        <div className={`h-1 rounded-full ${comp.rules.hard_blocked ? 'bg-red-400' : 'bg-amber-400'}`}
                                                            style={{ width: comp.rules.probability + '%' }} />
                                                    </div>
                                                    <p className="text-xs text-stone-400">{comp.rules.reason}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Relationship between RF and employee history */}
                                        {prediction.relationship && (
                                            <div className={`rounded-xl p-3 border text-xs ${
                                                prediction.relationship.alignment === 'above'   ? 'bg-emerald-50 border-emerald-200' :
                                                prediction.relationship.alignment === 'below'   ? 'bg-amber-50 border-amber-200' :
                                                prediction.relationship.alignment === 'aligned' ? 'bg-blue-50 border-blue-200' :
                                                'bg-stone-50 border-stone-200'
                                            }`}>
                                                <p className="font-semibold text-stone-700 mb-1">
                                                    History vs General Patterns
                                                </p>
                                                <p className={`font-medium mb-1 ${
                                                    prediction.relationship.alignment === 'above' ? 'text-emerald-700' :
                                                    prediction.relationship.alignment === 'below' ? 'text-amber-700' : 'text-blue-700'
                                                }`}>{prediction.relationship.message}</p>
                                                <p className="text-stone-500 leading-relaxed">{prediction.relationship.detail}</p>
                                            </div>
                                        )}

                                        {/* Patterns */}
                                        {prediction.patterns && prediction.patterns.length > 0 && (
                                            <div className="space-y-1.5">
                                                <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide">Observations</p>
                                                {prediction.patterns.map((p, i) => (
                                                    <div key={i} className={`flex items-start gap-2 p-2 rounded-lg text-xs ${
                                                        p.type === 'warning' ? 'bg-red-50 text-red-700 border border-red-100' :
                                                        p.type === 'good'    ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                                                        'bg-stone-50 text-stone-600 border border-stone-200'
                                                    }`}>
                                                        {p.type === 'warning' ? <FaExclamationTriangle className="flex-shrink-0 mt-0.5" />
                                                            : p.type === 'good' ? <FaCheckCircle className="flex-shrink-0 mt-0.5" />
                                                            : <FaInfoCircle className="flex-shrink-0 mt-0.5" />}
                                                        <span>{p.msg}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Why this score — plain language reasons */}
                                        <div className="bg-stone-50 border border-stone-200 rounded-xl p-3.5">
                                            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">Why this score</p>
                                            <ul className="space-y-1.5 text-xs text-stone-600">
                                                {/* RF contribution */}
                                                <li className="flex items-start gap-2">
                                                    <span className="text-blue-400 mt-0.5 flex-shrink-0">-</span>
                                                    <span>
                                                        General HR data suggests <b>{comp.random_forest.probability}%</b> approval rate for this leave type and duration (based on 1500 records, weight 30%)
                                                    </span>
                                                </li>
                                                {/* Bayesian contribution */}
                                                <li className="flex items-start gap-2">
                                                    <span className="text-teal-500 mt-0.5 flex-shrink-0">-</span>
                                                    <span>
                                                        {comp.bayesian.history_total === 0
                                                            ? 'No personal history - using industry average of 65% as starting point (weight 50%)'
                                                            : <>This employee's personal history shows <b>{comp.bayesian.overall_rate}%</b> overall approval rate across {comp.bayesian.history_total} decisions, and <b>{comp.bayesian.type_rate}%</b> for {leave.leaveType} specifically (weight 50%)</>
                                                        }
                                                    </span>
                                                </li>
                                                {/* Rules contribution */}
                                                <li className="flex items-start gap-2">
                                                    <span className={`mt-0.5 flex-shrink-0 ${comp.rules.hard_blocked ? 'text-red-400' : 'text-amber-400'}`}>-</span>
                                                    <span>{comp.rules.reason} (weight 20%)</span>
                                                </li>
                                                {/* Final */}
                                                <li className="flex items-start gap-2 pt-1 border-t border-stone-200 mt-1">
                                                    <span className="text-stone-400 mt-0.5 flex-shrink-0">-</span>
                                                    <span>
                                                        Final: <b>{comp.random_forest.probability}% × 30%</b> + <b>{comp.bayesian.probability}% × 50%</b> + <b>{comp.rules.probability}% × 20%</b> = <b className="text-stone-700">{prediction.score}/100</b>
                                                    </span>
                                                </li>
                                            </ul>
                                        </div>

                                        <p className="text-xs text-stone-400 text-center">
                                            Assessment is advisory. Final decision is yours.
                                        </p>

                                        <button onClick={getPrediction}
                                            className="w-full text-xs text-stone-400 hover:text-teal-600 font-medium py-1.5 transition border border-stone-200 rounded-lg hover:border-teal-200">
                                            Re-run Assessment
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Actions */}
                        {leave.status === 'Pending' ? (
                            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-5">
                                <h3 className="font-semibold text-stone-700 text-sm mb-4">Decision</h3>
                                <div className="space-y-3">
                                    <button onClick={() => changeStatus(leave._id, 'Approved')}
                                        className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition">
                                        <FaCheckCircle className="text-sm" /> Approve Leave
                                    </button>
                                    <button onClick={() => changeStatus(leave._id, 'Rejected')}
                                        className="w-full flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl transition">
                                        <FaTimesCircle className="text-sm" /> Reject Leave
                                    </button>
                                </div>
                                <p className="text-xs text-stone-400 text-center mt-3">This action cannot be undone</p>
                            </div>
                        ) : (
                            <div className={`rounded-2xl border p-5 text-center ${leave.status === 'Approved' ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                                {leave.status === 'Approved'
                                    ? <FaCheckCircle className="text-emerald-500 text-3xl mx-auto mb-2" />
                                    : <FaTimesCircle className="text-red-500 text-3xl mx-auto mb-2" />}
                                <p className={`font-bold ${leave.status === 'Approved' ? 'text-emerald-700' : 'text-red-700'}`}>
                                    Leave {leave.status}
                                </p>
                                <p className="text-xs text-stone-400 mt-1">Decision already made</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Detail
