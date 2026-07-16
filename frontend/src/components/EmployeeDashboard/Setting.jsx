import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/authContext'
import { FaCog, FaKey, FaCheckCircle } from 'react-icons/fa'
import { API_BASE, apiUrl, fileUrl } from '../../utils/apiConfig'

const Setting = () => {
    const { user }   = useAuth()
    const navigate   = useNavigate()
    const [form, setForm]     = useState({ userId: user._id, oldPassword: '', newPassword: '', confirmPassword: '' })
    const [error, setError]   = useState('')
    const [success, setSuccess] = useState('')
    const [loading, setLoading] = useState(false)

    const handleChange = (e) => {
        setError(''); setSuccess('')
        setForm(p => ({ ...p, [e.target.name]: e.target.value }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (form.newPassword !== form.confirmPassword) {
            setError('New password and confirm password do not match.'); return
        }
        if (form.newPassword.length < 6) {
            setError('New password must be at least 6 characters.'); return
        }
        setLoading(true)
        try {
            const r = await axios.put(`${API_BASE}/api/setting/change-password`, form, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            })
            if (r.data.success) {
                setSuccess('Password changed successfully!')
                setForm(p => ({ ...p, oldPassword: '', newPassword: '', confirmPassword: '' }))
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to change password')
        }
        setLoading(false)
    }

    const inputCls = 'mt-1 p-2.5 block w-full border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400'
    const labelCls = 'block text-sm font-medium text-stone-700'

    return (
        <div className="p-6 bg-stone-50 min-h-full">
            <div className="max-w-lg mx-auto">
                <div className="mb-6 flex items-center gap-3">
                    <div className="w-10 h-10 bg-teal-600 rounded-xl flex items-center justify-center">
                        <FaCog className="text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-stone-800">Settings</h2>
                        <p className="text-stone-500 text-sm">Manage your account security</p>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
                    <div className="flex items-center gap-2 mb-5">
                        <FaKey className="text-teal-600" />
                        <h3 className="font-semibold text-stone-700">Change Password</h3>
                    </div>

                    {error   && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">{error}</div>}
                    {success && (
                        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-xl flex items-center gap-2">
                            <FaCheckCircle /> {success}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className={labelCls}>Current Password</label>
                            <input type="password" name="oldPassword" value={form.oldPassword}
                                onChange={handleChange} className={inputCls} required placeholder=" Current password" />
                        </div>
                        <div>
                            <label className={labelCls}>New Password</label>
                            <input type="password" name="newPassword" value={form.newPassword}
                                onChange={handleChange} className={inputCls} required placeholder="New password" />
                        </div>
                        <div>
                            <label className={labelCls}>Confirm New Password</label>
                            <input type="password" name="confirmPassword" value={form.confirmPassword}
                                onChange={handleChange} className={inputCls} required placeholder="Confirm new password" />
                        </div>
                        <button type="submit" disabled={loading}
                            className="w-full bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition mt-2">
                            {loading ? 'Updating...' : 'Update Password'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}
export default Setting
