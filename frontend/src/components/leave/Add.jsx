import React, { useState, useEffect } from 'react'
import { useAuth } from '../../context/authContext'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { API_BASE } from '../../utils/apiConfig'
import {
    FaCalendarAlt, FaCheckCircle, FaExclamationTriangle,
    FaInfoCircle, FaTimesCircle, FaMoneyBillWave
} from 'react-icons/fa'

const POLICY_LABELS = {
    'Annual Leave':  { notice: '7 days advance', gap: '14 days between requests', max: '5 days per request', color: 'teal' },
    'Sick Leave':    { notice: 'No notice needed', gap: 'No restriction', max: 'No limit', color: 'blue' },
    'Casual Leave':  { notice: '1 day advance', gap: '7 days between requests', max: '3 days per request, 3 per month', color: 'amber' },
}

const Add = () => {
    const { user }   = useAuth()
    const navigate   = useNavigate()
    const [form, setForm]             = useState({ userId: user._id, leaveType: '', startDate: '', endDate: '', reason: '' })
    const [balance, setBalance]       = useState(null)
    const [validation, setValidation] = useState(null)
    const [validating, setValidating] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [submitError, setSubmitError] = useState('')

    // Load leave balance on mount
    useEffect(() => {
        axios.get(`${API_BASE}/api/leave/balance/${user._id}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }).then(r => { if (r.data.success) setBalance(r.data.balance) }).catch(() => {})
    }, [])

    // Validate whenever key fields change
    useEffect(() => {
        if (form.leaveType && form.startDate && form.endDate) {
            const t = setTimeout(() => validateForm(), 600)
            return () => clearTimeout(t)
        } else {
            setValidation(null)
        }
    }, [form.leaveType, form.startDate, form.endDate])

    const validateForm = async () => {
        setValidating(true)
        try {
            const r = await axios.post(`${API_BASE}/api/leave/validate`, {
                userId:    user._id,
                leaveType: form.leaveType,
                startDate: form.startDate,
                endDate:   form.endDate,
            }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
            setValidation(r.data)
        } catch {}
        setValidating(false)
    }

    const isDateTaken = (dateStr) => takenDates.includes(dateStr)

    const handleDateChange = (e) => {
        const { name, value } = e.target
        setSubmitError('')
        if (value && isDateTaken(value)) {
            setSubmitError(`You already have a leave on ${new Date(value).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}. Choose a different date.`)
            return
        }
        setForm(p => ({ ...p, [name]: value }))
    }

    const handleChange = (e) => {
        setSubmitError('')
        setForm(p => ({ ...p, [e.target.name]: e.target.value }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (validation?.errors?.length > 0) return
        setSubmitting(true)
        setSubmitError('')
        try {
            const r = await axios.post(`${API_BASE}/api/leave/add`, form, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            })
            if (r.data.success) navigate(`/employee-dashboard/leaves/${user._id}`)
            else setSubmitError(r.data.error || 'Failed to submit')
        } catch (err) {
            setSubmitError(err.response?.data?.error || err.response?.data?.errors?.[0] || 'Failed to submit leave request')
        }
        setSubmitting(false)
    }

    const inputCls = 'mt-1 p-2.5 block w-full border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white'
    const labelCls = 'block text-sm font-semibold text-stone-700'

    const balanceKey = {
        'Annual Leave':  'annualLeave',
        'Sick Leave':    'sickLeave',
        'Casual Leave':  'casualLeave',
    }[form.leaveType]

    const currentBalance = balance && balanceKey ? balance[balanceKey] : null

    return (
        <div className="p-6 bg-stone-50 min-h-full">
            <div className="max-w-2xl mx-auto">
                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-stone-800">Apply for Leave</h2>
                    <p className="text-stone-400 text-sm">Submit your leave request for admin approval</p>
                </div>

                {/* Leave Balance Cards */}
                {balance && (
                    <div className="grid grid-cols-3 gap-3 mb-5">
                        {[
                            { key: 'annualLeave',  label: 'Annual Leave',  type: 'Annual Leave',  color: 'teal'  },
                            { key: 'sickLeave',    label: 'Sick Leave',    type: 'Sick Leave',    color: 'blue'  },
                            { key: 'casualLeave',  label: 'Casual Leave',  type: 'Casual Leave',  color: 'amber' },
                        ].map(b => {
                            const bal     = balance[b.key]
                            const isActive = form.leaveType === b.type
                            const pct     = Math.round(bal.remaining / bal.total * 100)
                            return (
                                <div key={b.key} onClick={() => setForm(p => ({ ...p, leaveType: b.type }))}
                                    className={`rounded-2xl border-2 p-3.5 cursor-pointer transition ${
                                        isActive ? 'border-teal-500 bg-teal-50 shadow-md' : 'border-stone-200 bg-white hover:border-stone-300'
                                    }`}>
                                    <p className="text-xs font-semibold text-stone-500 mb-1">{b.label}</p>
                                    <p className={`text-2xl font-extrabold ${bal.remaining === 0 ? 'text-red-500' : 'text-stone-800'}`}>
                                        {bal.remaining}
                                        <span className="text-xs font-normal text-stone-400">/{bal.total} days</span>
                                    </p>
                                    <div className="bg-stone-100 rounded-full h-1.5 mt-2">
                                        <div className={`h-1.5 rounded-full ${
                                            pct > 60 ? 'bg-emerald-500' : pct > 30 ? 'bg-amber-400' : 'bg-red-400'
                                        }`} style={{ width: pct + '%' }} />
                                    </div>
                                    <p className="text-xs text-stone-400 mt-1">{bal.used} used</p>
                                </div>
                            )
                        })}
                    </div>
                )}

                <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">

                    {/* Policy info for selected type */}
                    {form.leaveType && POLICY_LABELS[form.leaveType] && (
                        <div className="mb-5 p-3.5 bg-stone-50 border border-stone-200 rounded-xl">
                            <p className="text-xs font-semibold text-stone-500 mb-2 flex items-center gap-1.5">
                                <FaInfoCircle className="text-teal-500" /> {form.leaveType} Policy
                            </p>
                            <div className="grid grid-cols-3 gap-2 text-xs text-stone-600">
                                {[
                                    ['Notice', POLICY_LABELS[form.leaveType].notice],
                                    ['Gap', POLICY_LABELS[form.leaveType].gap],
                                    ['Max', POLICY_LABELS[form.leaveType].max],
                                ].map(([l, v]) => (
                                    <div key={l}>
                                        <p className="text-stone-400 font-medium">{l}</p>
                                        <p className="font-semibold text-stone-700">{v}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Leave Type */}
                        <div>
                            <label className={labelCls}>Leave Type</label>
                            <select name="leaveType" value={form.leaveType} onChange={handleChange} className={inputCls} required>
                                <option value="">Select Leave Type</option>
                                <option value="Sick Leave">Sick Leave</option>
                                <option value="Casual Leave">Casual Leave</option>
                                <option value="Annual Leave">Annual Leave</option>
                            </select>
                        </div>

                        {/* Dates */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelCls}>From Date</label>
                                <input type="date" name="startDate" value={form.startDate}
                                    onChange={handleChange} className={inputCls} required />
                            </div>
                            <div>
                                <label className={labelCls}>To Date</label>
                                <input type="date" name="endDate" value={form.endDate}
                                    onChange={handleChange} className={inputCls} required />
                            </div>
                        </div>

                        {/* Real-time validation result */}
                        {validating && (
                            <div className="flex items-center gap-2 text-xs text-stone-400 py-2">
                                <div className="animate-spin rounded-full h-3 w-3 border-b border-teal-500"></div>
                                Checking availability...
                            </div>
                        )}

                        {validation && !validating && (
                            <div className="space-y-2">
                                {/* Errors */}
                                {validation.errors?.map((err, i) => (
                                    <div key={i} className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                                        <FaTimesCircle className="flex-shrink-0 mt-0.5 text-red-500" />
                                        {err}
                                    </div>
                                ))}

                                {/* Warnings */}
                                {validation.warnings?.map((w, i) => (
                                    <div key={i} className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
                                        <FaExclamationTriangle className="flex-shrink-0 mt-0.5" />
                                        {w}
                                    </div>
                                ))}

                                {/* Paid/Unpaid preview */}
                                {validation.valid && validation.paidInfo && (
                                    <div className={`p-4 rounded-xl border ${
                                        validation.paidInfo.unpaidDays > 0
                                            ? 'bg-amber-50 border-amber-200'
                                            : 'bg-emerald-50 border-emerald-200'
                                    }`}>
                                        <p className="text-xs font-semibold text-stone-600 mb-2 flex items-center gap-1.5">
                                            <FaMoneyBillWave className={validation.paidInfo.unpaidDays > 0 ? 'text-amber-500' : 'text-emerald-500'} />
                                            Leave Breakdown -{validation.paidInfo.duration} days total
                                        </p>
                                        <div className="grid grid-cols-2 gap-3 text-xs">
                                            <div className="bg-emerald-100 rounded-lg p-2.5 text-center">
                                                <p className="text-xl font-bold text-emerald-700">{validation.paidInfo.paidDays}</p>
                                                <p className="text-emerald-600 font-medium">Paid days</p>
                                                <p className="text-stone-400">from your balance</p>
                                            </div>
                                            <div className={`rounded-lg p-2.5 text-center ${validation.paidInfo.unpaidDays > 0 ? 'bg-red-100' : 'bg-stone-100'}`}>
                                                <p className={`text-xl font-bold ${validation.paidInfo.unpaidDays > 0 ? 'text-red-600' : 'text-stone-400'}`}>
                                                    {validation.paidInfo.unpaidDays}
                                                </p>
                                                <p className={`font-medium ${validation.paidInfo.unpaidDays > 0 ? 'text-red-600' : 'text-stone-400'}`}>Unpaid days</p>
                                                <p className="text-stone-400">beyond balance</p>
                                            </div>
                                        </div>
                                        {validation.paidInfo.unpaidDays > 0 && (
                                            <div className="mt-3 pt-3 border-t border-amber-200 text-xs text-amber-800">
                                                <p className="font-semibold">Estimated salary deduction: Rs. {validation.paidInfo.salaryDeduction?.toLocaleString()}</p>
                                                <p className="text-stone-500 mt-0.5">Based on your monthly salary divided by 26 working days</p>
                                            </div>
                                        )}
                                        {validation.paidInfo.unpaidDays === 0 && (
                                            <p className="mt-2 text-xs text-emerald-700 font-medium">
                                                Fully covered by your {form.leaveType} balance. No salary deduction.
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* All good */}
                                {validation.valid && !validation.errors?.length && (
                                    <div className="flex items-center gap-2 text-xs text-emerald-700">
                                        <FaCheckCircle className="text-emerald-500" />
                                        Leave request is valid and can be submitted
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Reason */}
                        <div>
                            <label className={labelCls}>Reason</label>
                            <textarea name="reason" value={form.reason} onChange={handleChange}
                                placeholder="Briefly describe your reason for leave..."
                                className={inputCls} rows={3} required />
                        </div>

                        {submitError && (
                            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                                <FaTimesCircle className="flex-shrink-0 mt-0.5" /> {submitError}
                            </div>
                        )}

                        <button type="submit"
                            disabled={submitting || (validation && validation.errors?.length > 0) || !form.leaveType || !form.startDate || !form.endDate || !form.reason}
                            className="w-full bg-teal-600 hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-xl transition">
                            {submitting ? 'Submitting...' : 'Submit Leave Request'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}
export default Add
