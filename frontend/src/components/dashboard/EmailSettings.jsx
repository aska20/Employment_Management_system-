import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { FaEnvelope, FaCheckCircle, FaExclamationTriangle, FaPaperPlane, FaInfoCircle, FaEye, FaEyeSlash } from 'react-icons/fa'
import { API_BASE, apiUrl, fileUrl } from '../../utils/apiConfig'

const EmailSettings = () => {
    const [email, setEmail]       = useState('')
    const [password, setPassword] = useState('')
    const [showPass, setShowPass] = useState(false)
    const [configured, setConfigured] = useState(false)
    const [saving, setSaving]     = useState(false)
    const [testing, setTesting]   = useState(false)
    const [msg, setMsg]           = useState(null)  // { type: 'success'|'error', text: '' }

    useEffect(() => {
        axios.get(`${API_BASE}/api/setting/email-config`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }).then(r => {
            if (r.data.success) {
                setEmail(r.data.smtpEmail || '')
                setConfigured(r.data.configured)
            }
        }).catch(() => {})
    }, [])

    const handleSave = async (e) => {
        e.preventDefault()
        setSaving(true); setMsg(null)
        try {
            const r = await axios.post(`${API_BASE}/api/setting/email-config`,
                { smtpEmail: email, smtpPassword: password },
                { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
            )
            if (r.data.success) {
                setConfigured(true)
                setPassword('')
                setMsg({ type: 'success', text: 'Email configuration saved! You can now send welcome emails to employees.' })
            }
        } catch (err) {
            setMsg({ type: 'error', text: err.response?.data?.error || 'Failed to save configuration.' })
        }
        setSaving(false)
    }

    const handleTest = async () => {
        setTesting(true); setMsg(null)
        try {
            const r = await axios.post(`${API_BASE}/api/setting/test-email`, {},
                { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
            )
            if (r.data.success) setMsg({ type: 'success', text: r.data.message })
        } catch (err) {
            setMsg({ type: 'error', text: err.response?.data?.error || 'Test failed. Check your credentials.' })
        }
        setTesting(false)
    }

    return (
<div className="p-6 max-w-2xl mx-auto">
<div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-teal-700 to-teal-600 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <FaEnvelope className="text-teal-200" />
                    <h3 className="font-bold text-white">Email Configuration</h3>
                </div>
                {configured && (
                    <span className="flex items-center gap-1.5 text-xs text-emerald-300 font-semibold bg-emerald-900/30 border border-emerald-700/40 px-3 py-1 rounded-full">
                        <FaCheckCircle /> Configured
                    </span>
                )}
            </div>
        

            <div className="p-6">




                {msg && (
                    <div className={`mb-5 p-3.5 border rounded-xl text-sm flex items-start gap-2 ${
                        msg.type === 'success'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                            : 'bg-red-50 border-red-200 text-red-700'
                    }`}>
                        {msg.type === 'success' ? <FaCheckCircle className="flex-shrink-0 mt-0.5" /> : <FaExclamationTriangle className="flex-shrink-0 mt-0.5" />}
                        {msg.text}
                    </div>
                )}

                <form onSubmit={handleSave} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">Gmail Address</label>
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                            placeholder="example@gmail.com"
                            className="w-full px-4 py-2.5 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-stone-50" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">
                            Gmail App Password 
                        </label>
                        <div className="relative">
                            <input type={showPass ? 'text' : 'password'} value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder={configured ? '••••••••••••••••  (leave blank to keep existing)' : 'xxxx xxxx xxxx xxxx'}
                                required={!configured}
                                className="w-full px-4 py-2.5 pr-10 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-stone-50" />
                            <button type="button" onClick={() => setShowPass(!showPass)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition">
                                {showPass ? <FaEyeSlash /> : <FaEye />}
                            </button>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button type="submit" disabled={saving}
                            className="flex-1 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-sm transition">
                            {saving ? 'Saving...' : 'Save Configuration'}
                        </button>
                        {configured && (
                            <button type="button" onClick={handleTest} disabled={testing}
                                className="flex items-center gap-2 px-4 bg-stone-100 hover:bg-stone-200 disabled:opacity-50 text-stone-700 font-semibold py-2.5 rounded-xl text-sm transition border border-stone-200">
                                <FaPaperPlane className="text-xs" />
                                {testing ? 'Sending...' : 'Test Email'}
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
        </div>
    )
}
export default EmailSettings
