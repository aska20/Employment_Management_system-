import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { FaUmbrellaBeach, FaPlus, FaTrash, FaCalendarAlt } from 'react-icons/fa'
import { API_BASE, apiUrl, fileUrl } from '../../utils/apiConfig'

const HolidayManager = () => {
    const [holidays, setHolidays]   = useState([])
    const [loading, setLoading]     = useState(true)
    const [form, setForm]           = useState({ name: '', date: '', description: '' })
    const [error, setError]         = useState('')
    const [success, setSuccess]     = useState('')
    const [adding, setAdding]       = useState(false)

    useEffect(() => { fetchHolidays() }, [])

    const fetchHolidays = async () => {
        setLoading(true)
        try {
            const r = await axios.get(`${API_BASE}/api/holidays`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            })
            if (r.data.success) setHolidays(r.data.holidays)
        } catch (e) { console.error(e) }
        setLoading(false)
    }

    const handleAdd = async (e) => {
        e.preventDefault()
        setError(''); setSuccess(''); setAdding(true)
        try {
            const r = await axios.post(`${API_BASE}/api/holidays/add`, form, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            })
            if (r.data.success) {
                setSuccess(`Holiday "${form.name}" declared successfully!`)
                setForm({ name: '', date: '', description: '' })
                fetchHolidays()
            }
        } catch (e) {
            setError(e.response?.data?.error || 'Failed to add holiday')
        }
        setAdding(false)
        setTimeout(() => setSuccess(''), 3000)
    }

    const handleDelete = async (id, name) => {
        if (!confirm(`Remove holiday "${name}"?`)) return
        try {
            await axios.delete(`${API_BASE}/api/holidays/${id}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            })
            fetchHolidays()
        } catch (e) { alert('Failed to delete') }
    }

    const upcoming = holidays.filter(h => new Date(h.date) >= new Date())
    const past     = holidays.filter(h => new Date(h.date) < new Date())

    const inputCls = 'mt-1 p-2.5 w-full border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400'

    return (
        <div className="p-6 bg-stone-50 min-h-full">
            <div className="mb-6 flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center">
                    <FaUmbrellaBeach className="text-white" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-stone-800">Holiday Management</h2>
                   
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Add Holiday Form */}
                <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-5">
                    <h3 className="font-bold text-stone-700 mb-4 flex items-center gap-2">
                        <FaPlus className="text-teal-600" /> Declare New Holiday
                    </h3>
                    {error   && <div className="mb-3 p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">{error}</div>}
                    {success && <div className="mb-3 p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl">{success}</div>}
                    <form onSubmit={handleAdd} className="space-y-3">
                        <div>
                            <label className="block text-xs font-semibold text-stone-600">Holiday Name *</label>
                            <input type="text" value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))}
                                placeholder="e.g. Dashain, Tihar, New Year" className={inputCls} required />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-stone-600">Date *</label>
                            <input type="date" value={form.date} onChange={e => setForm(p => ({...p, date: e.target.value}))}
                                className={inputCls} required />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-stone-600">Description (optional)</label>
                            <input type="text" value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))}
                                placeholder="Short note..." className={inputCls} />
                        </div>
                        <button type="submit" disabled={adding}
                            className="w-full bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm transition">
                            {adding ? 'Declaring...' : 'Declare Holiday'}
                        </button>
                    </form>
                </div>

                {/* Holiday Lists */}
                <div className="lg:col-span-2 space-y-5">
                    {/* Upcoming */}
                    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
                        <div className="bg-teal-600 px-5 py-3 flex items-center justify-between">
                            <h3 className="font-semibold text-white text-sm flex items-center gap-2">
                                <FaCalendarAlt /> Upcoming Holidays ({upcoming.length})
                            </h3>
                        </div>
                        {loading ? (
                            <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-600"></div></div>
                        ) : upcoming.length === 0 ? (
                            <p className="text-stone-400 text-sm text-center py-8">No upcoming holidays declared</p>
                        ) : (
                            <div className="divide-y divide-stone-50">
                                {upcoming.map(h => (
                                    <div key={h._id} className="flex items-center justify-between px-5 py-3 hover:bg-stone-50 transition">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                                <FaUmbrellaBeach className="text-amber-600" />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-stone-800 text-sm">{h.name}</p>
                                                <p className="text-xs text-stone-400">
                                                    {new Date(h.date).toLocaleDateString('en-NP', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
                                                </p>
                                                {h.description && <p className="text-xs text-stone-400 italic">{h.description}</p>}
                                            </div>
                                        </div>
                                        <button onClick={() => handleDelete(h._id, h.name)}
                                            className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                                            <FaTrash className="text-xs" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Past */}
                    {past.length > 0 && (
                        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
                            <div className="bg-stone-600 px-5 py-3">
                                <h3 className="font-semibold text-white text-sm">Past Holidays ({past.length})</h3>
                            </div>
                            <div className="divide-y divide-stone-50">
                                {past.slice(0,5).map(h => (
                                    <div key={h._id} className="flex items-center justify-between px-5 py-3 opacity-60">
                                        <div>
                                            <p className="font-medium text-stone-700 text-sm">{h.name}</p>
                                            <p className="text-xs text-stone-400">{new Date(h.date).toLocaleDateString()}</p>
                                        </div>
                                        <button onClick={() => handleDelete(h._id, h.name)}
                                            className="p-2 text-red-400 hover:text-red-600 rounded-lg transition">
                                            <FaTrash className="text-xs" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
export default HolidayManager
