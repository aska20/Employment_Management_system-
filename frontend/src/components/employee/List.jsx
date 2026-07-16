import React, { useState, useEffect } from 'react'
import ConfirmModal from '../ConfirmModal'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { FaPlus, FaSearch, FaEye, FaEdit, FaTrash, FaUsers, FaFilter } from 'react-icons/fa'
import { API_BASE, apiUrl, fileUrl } from '../../utils/apiConfig'

const List = () => {
    const [employees, setEmployees] = useState([])
    const [filtered, setFiltered]   = useState([])
    const [loading, setLoading]     = useState(true)
const [searchQuery, setSearchQuery] = useState('')
const [confirmData, setConfirmData] = useState(null)
const navigate = useNavigate()

    const fetchEmployees = async () => {
        try {
            const r = await axios.get(`${API_BASE}/api/employee`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            })
            if (r.data.success) {
                setEmployees(r.data.employees)
                setFiltered(r.data.employees)
            }
        } catch (err) { console.error(err) }
        setLoading(false)
    }

    useEffect(() => { fetchEmployees() }, [])

    const handleSearch = (e) => {
        const q = e.target.value.toLowerCase()
        setSearchQuery(e.target.value)
        setFiltered(employees.filter(emp =>
            emp.userId?.name?.toLowerCase().includes(q) ||
            emp.employeeId?.toLowerCase().includes(q) ||
            emp.department?.dep_name?.toLowerCase().includes(q) ||
            emp.designation?.toLowerCase().includes(q)
        ))
    }

const handleDelete = async () => {
    try {
        const r = await axios.delete(`${API_BASE}/api/employee/${confirmData.id}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        })
        if (r.data.success) { setConfirmData(null); fetchEmployees() }
    } catch (err) {
        alert(err.response?.data?.error || 'Failed to delete employee')
    }
}

    return (
        <div className="p-6 bg-gradient-to-br from-stone-100 to-stone-50 min-h-full">

            {/* Page Header */}
            <div className="flex items-center justify-between mb-7 gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-teal-600 rounded-xl flex items-center justify-center shadow-md">
                        <FaUsers className="text-white text-lg" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-extrabold text-stone-800 tracking-tight">Employees</h2>
                        <p className="text-stone-400 text-sm">{employees.length} total employee{employees.length !== 1 ? 's' : ''}</p>
                    </div>
                </div>
                <Link to="/admin-dashboard/add-employee"
                    className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition shadow-md hover:shadow-lg active:scale-95">
                    <FaPlus className="text-xs" /> Add Employee
                </Link>
            </div>

            {/* Card */}
            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">

                {/* Search Bar */}
                <div className="px-5 py-4 border-b border-stone-100 bg-stone-50/80 flex items-center justify-between gap-4 flex-wrap">
                    <div className="relative max-w-sm flex-1">
                        <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 text-xs" />
                        <input
                            type="text"
                            value={searchQuery}
                            placeholder="Search by name, ID, or department..."
                            onChange={handleSearch}
                            className="pl-9 pr-4 py-2.5 border border-stone-200 rounded-xl text-sm w-full focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent bg-white shadow-sm"
                        />
                    </div>
                    {searchQuery && (
                        <span className="text-xs text-stone-500 bg-stone-100 px-3 py-1.5 rounded-lg">
                            {filtered.length} result{filtered.length !== 1 ? 's' : ''}
                        </span>
                    )}
                </div>

                {/* Table */}
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-9 w-9 border-b-2 border-teal-600"></div>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-20 text-stone-400">
                        <FaUsers className="text-5xl mx-auto mb-3 opacity-10" />
                        <p className="font-semibold text-stone-500">No employees found</p>
                       
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left" style={{ minWidth: '700px' }}>
                            <thead className="text-xs uppercase bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold tracking-wide">
                                <tr>
                                    <th className="px-5 py-4 w-12">#</th>
                                    <th className="px-5 py-4 w-28">Emp ID</th>
                                    <th className="px-5 py-4">Employee</th>
                                    <th className="px-5 py-4">Department</th>
                                    <th className="px-5 py-4">Date of Birth</th>
                                    <th className="px-5 py-4 text-center" style={{ minWidth: '200px' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-100">
                                {filtered.map((emp, i) => (
                                    <tr key={emp._id} className="hover:bg-teal-50/30 transition group">
                                        <td className="px-5 py-4 text-stone-400 font-medium text-xs">{i + 1}</td>
                                        <td className="px-5 py-4">
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-teal-50 text-teal-700 text-xs font-bold border border-teal-100">
                                                {emp.employeeId}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-3">
                                                <img
                                                    src={`${API_BASE}/${emp.userId?.profileImage}`}
                                                    alt={emp.userId?.name}
                                                    className="w-9 h-9 rounded-xl object-cover border-2 border-stone-200 flex-shrink-0 shadow-sm"
                                                    onError={e => {
                                                        e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.userId?.name || 'E')}&background=0f766e&color=fff&size=36&rounded=true`
                                                    }}
                                                />
                                                <div>
                                                    <p className="font-bold text-stone-800 leading-tight">{emp.userId?.name}</p>
                                                    <p className="text-xs text-stone-400 capitalize mt-0.5">{emp.designation || emp.userId?.role || '—'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-stone-100 text-stone-600 text-xs font-semibold border border-stone-200">
                                                {emp.department?.dep_name || '—'}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4 text-stone-600 text-sm">
                                            {emp.dob ? new Date(emp.dob).toLocaleDateString('en-NP') : '—'}
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex items-center justify-center gap-2 flex-nowrap">
                                                <button
                                                    onClick={() => navigate(`/admin-dashboard/employees/${emp._id}`)}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 active:scale-95 text-white text-xs font-bold rounded-lg transition shadow-sm whitespace-nowrap"
                                                    title="View Profile">
                                                    <FaEye /> View
                                                </button>
                                                <button
                                                    onClick={() => navigate(`/admin-dashboard/employees/edit/${emp._id}`)}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white text-xs font-bold rounded-lg transition shadow-sm whitespace-nowrap"
                                                    title="Edit">
                                                    <FaEdit /> Edit
                                                </button>
                                                <button
onClick={() => setConfirmData({ id: emp._id, name: emp.userId?.name })}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-600 active:scale-95 text-white text-xs font-bold rounded-lg transition shadow-sm whitespace-nowrap"
                                                    title="Delete">
                                                    <FaTrash /> Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Footer */}
                        <div className="px-5 py-3 bg-stone-50 border-t border-stone-100 flex items-center justify-between flex-wrap gap-2">
                            <p className="text-xs text-stone-400">
                                Showing <b>{filtered.length}</b> of <b>{employees.length}</b> employees
                            </p>

                        </div>
                    </div>
                )}
            </div>
  
<ConfirmModal
                isOpen={!!confirmData}
                title={`Delete ${confirmData?.name}?`}
                message="This will permanently remove the employee and their login account."
                onConfirm={handleDelete}
                onCancel={() => setConfirmData(null)}
            />
                  </div>
    )
}

export default List
