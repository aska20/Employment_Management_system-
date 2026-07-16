import React, { useState } from 'react'
import axios from 'axios'
import { useAuth } from '../context/authContext'
import { useNavigate } from 'react-router-dom'
import { FaLock, FaEye, FaEyeSlash, FaShieldAlt, FaCheckCircle } from 'react-icons/fa'
import { API_BASE, apiUrl, fileUrl } from '../utils/apiConfig'

const ForcePasswordChange = () => {
    const { user, updateUser, logout } = useAuth()
    const navigate = useNavigate()
    const [form, setForm]     = useState({ oldPassword: '', newPassword: '', confirmPassword: '' })
    const [showOld, setShowOld]     = useState(false)
    const [showNew, setShowNew]     = useState(false)
    const [showConf, setShowConf]   = useState(false)
    const [error, setError]   = useState('')
    const [loading, setLoading] = useState(false)

    const requirements = [
        { label: 'At least 8 characters',          met: form.newPassword.length >= 8 },
        { label: 'Contains a number',               met: /\d/.test(form.newPassword) },
        { label: 'Matches confirmation',             met: form.newPassword && form.newPassword === form.confirmPassword },
        { label: 'Different from temporary password',    met: form.newPassword && form.newPassword !== form.oldPassword },
    ]
    const allMet = requirements.every(r => r.met)

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!allMet) { setError('Please meet all password requirements.'); return }
        setLoading(true); setError('')

        try {
            const r = await axios.put(`${API_BASE}/api/setting/change-password`,
                { userId: user._id, oldPassword: form.oldPassword, newPassword: form.newPassword },
                { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
            )
            if (r.data.success) {
                // Update local user state so mustChangePassword = false
                updateUser({ mustChangePassword: false, isFirstLogin: false })
                // Redirect to their dashboard
                navigate(user.role === 'admin' ? '/admin-dashboard' : '/employee-dashboard', { replace: true })
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to change password. Please try again.')
        }
        setLoading(false)
    }

   const inputCls = (show, val) => `w-full pl-4 pr-10 py-3 bg-stone-800 border border-stone-700 rounded-xl text-white placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm transition [&::-ms-reveal]:hidden [&::-webkit-credentials-auto-fill-button]:hidden`

    return (
        <div className="min-h-screen bg-stone-950 flex items-center justify-center px-4">
            <div className="w-full max-w-md">

                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                        <FaShieldAlt className="text-white text-2xl" />
                    </div>
                    <h1 className="text-2xl font-extrabold text-white tracking-tight">Set Your Password</h1>
                    <p className="text-stone-400 text-sm mt-2 leading-relaxed">
                        Welcome, <span className="text-teal-400 font-semibold">{user?.name}</span>!
                    </p>
                </div>

                {/* Info banner */}
                <div className="bg-amber-900/30 border border-amber-700/40 rounded-xl p-4 mb-6 flex items-start gap-3">
                    <span className="text-amber-400 text-lg flex-shrink-0"></span>
                    <p className="text-amber-200/80 text-xs leading-relaxed">
                       For security purposes, you are required to change your temporary password before accessing the system.
                    </p>
                </div>

                {error && (
                    <div className="mb-5 p-3.5 bg-red-900/30 border border-red-700/50 rounded-xl text-red-300 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">

                    {/* Temp password */}
                    <div>
                        <label className="block text-stone-400 text-xs font-bold mb-1.5 uppercase tracking-wider">
                            Temporary Password (from email)
                        </label>
                        <div className="relative">
                            <input type={showOld ? 'text' : 'password'}
                                value={form.oldPassword}
                                onChange={e => { setError(''); setForm(p => ({ ...p, oldPassword: e.target.value })) }}
                                placeholder="Enter the temp password from your email"
                                required
                                className={inputCls()}
                            />
                            <button type="button" onClick={() => setShowOld(!showOld)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300 transition" tabIndex={-1}>
                                {showOld ? <FaEyeSlash /> : <FaEye />}
                            </button>
                        </div>
                    </div>

                    {/* New password */}
                    <div>
                        <label className="block text-stone-400 text-xs font-bold mb-1.5 uppercase tracking-wider">
                            New Password
                        </label>
                        <div className="relative">
                            <input type={showNew ? 'text' : 'password'}
                                value={form.newPassword}
                                onChange={e => { setError(''); setForm(p => ({ ...p, newPassword: e.target.value })) }}
                                placeholder="Choose a strong password"
                                required
                                className={inputCls()}
                            />
                            <button type="button" onClick={() => setShowNew(!showNew)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300 transition" tabIndex={-1}>
                                {showNew ? <FaEyeSlash /> : <FaEye />}
                            </button>
                        </div>
                    </div>

                    {/* Confirm password */}
                    <div>
                        <label className="block text-stone-400 text-xs font-bold mb-1.5 uppercase tracking-wider">
                            Confirm New Password
                        </label>
                        <div className="relative">
                            <input type={showConf ? 'text' : 'password'}
                                value={form.confirmPassword}
                                onChange={e => { setError(''); setForm(p => ({ ...p, confirmPassword: e.target.value })) }}
                                placeholder="Repeat your new password"
                                required
                                className={inputCls()}
                            />
                            <button type="button" onClick={() => setShowConf(!showConf)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300 transition" tabIndex={-1}>
                                {showConf ? <FaEyeSlash /> : <FaEye />}
                            </button>
                        </div>
                    </div>

                    {/* Password requirements */}
                    {form.newPassword && (
                        <div className="bg-stone-800/60 border border-stone-700/50 rounded-xl p-4 space-y-2">
                            <p className="text-stone-400 text-xs font-bold uppercase tracking-wider mb-2">Requirements</p>
                            {requirements.map(r => (
                                <div key={r.label} className="flex items-center gap-2.5">
                                    <FaCheckCircle className={`text-xs flex-shrink-0 ${r.met ? 'text-emerald-400' : 'text-stone-600'}`} />
                                    <span className={`text-xs ${r.met ? 'text-emerald-300' : 'text-stone-500'}`}>{r.label}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    <button type="submit" disabled={loading || !allMet}
                        className="w-full bg-teal-600 hover:bg-teal-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition shadow-lg text-sm mt-2">
                        {loading
                            ? <span className="flex items-center justify-center gap-2"><span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>Setting password...</span>
                            : ' Set New Password & Continue'
                        }
                    </button>
                </form>

                <div className="mt-4 text-center">
                    <button onClick={() => { logout(); navigate('/login') }}
                        className="text-stone-600 hover:text-stone-400 text-xs transition">
                        Back to Login
                    </button>
                </div>
            </div>
        </div>
    )
}
export default ForcePasswordChange
