import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import DataTable from 'react-data-table-component'
import { FaEye, FaSearch, FaMagic } from 'react-icons/fa'
import { API_BASE, apiUrl, fileUrl } from '../../utils/apiConfig'

const Table = () => {
    const [leaves, setLeaves]         = useState(null)
    const [filtered, setFiltered]     = useState(null)
    const [activeFilter, setActive]   = useState('All')
    const navigate = useNavigate()

    const fetchLeaves = async () => {
        try {
            const r = await axios.get(`${API_BASE}/api/leave`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            })
            if (r.data.success) {
                setLeaves(r.data.leaves)
                setFiltered(r.data.leaves)
            }
        } catch (err) { console.error(err) }
    }

    useEffect(() => { fetchLeaves() }, [])

    const filterByStatus = (status) => {
        setActive(status)
        setFiltered(status === 'All' ? leaves : leaves.filter(l => l.status === status))
    }

    const filterBySearch = (e) => {
        const q = e.target.value.toLowerCase()
        setFiltered(leaves.filter(l =>
            l.employeeId?.employeeId?.toLowerCase().includes(q) ||
            l.employeeId?.userId?.name?.toLowerCase().includes(q)
        ))
    }

    const statusCell = (row) => {
        const map = {
            Approved: 'bg-emerald-100 text-emerald-700',
            Rejected: 'bg-red-100 text-red-700',
            Pending:  'bg-amber-100 text-amber-700'
        }
        return (
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${map[row.status] || 'bg-stone-100 text-stone-600'}`}>
                {row.status}
            </span>
        )
    }

    const actionCell = (row) => (
        <button
            onClick={() => navigate(`/admin-dashboard/leaves/${row._id}`)}
            className="inline-flex items-center gap-1 px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg transition">
            <FaEye />
            {row.status === 'Pending'
                ? <span className="flex items-center gap-0.5">Review <FaMagic className="text-teal-200 text-xs" /></span>
                : 'View'}
        </button>
    )

    const leaveTypeCell = (row) => {
        const map = {
            'Sick Leave':   'bg-red-100 text-red-700',
            'Casual Leave': 'bg-blue-100 text-blue-700',
            'Annual Leave': 'bg-purple-100 text-purple-700'
        }
        return (
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${map[row.leaveType] || 'bg-stone-100 text-stone-600'}`}>
                {row.leaveType}
            </span>
        )
    }

    const columns = [
        { name: '#',           selector: (_, i) => i + 1,                       width: '55px' },
        { name: 'Employee',    selector: row => row.employeeId?.userId?.name,    width: '140px',
          cell: row => (
            <div>
                <p className="font-semibold text-stone-800 text-xs">{row.employeeId?.userId?.name}</p>
                <p className="text-stone-400 text-xs">{row.employeeId?.employeeId}</p>
            </div>
          )
        },
        { name: 'Department',  selector: row => row.employeeId?.department?.dep_name, width: '130px' },
        { name: 'Leave Type',  cell: leaveTypeCell,                              width: '140px' },
        { name: 'Days',
          selector: row => Math.ceil((new Date(row.endDate) - new Date(row.startDate)) / 86400000) + 1,
          width: '70px'
        },
        { name: 'Applied',
          selector: row => new Date(row.appliedAt || row.createdAt).toLocaleDateString(),
          width: '100px'
        },
        { name: 'Status',      cell: statusCell,                                 width: '110px' },
        { name: 'Action',      cell: actionCell,                                 center: true }
    ]

    const counts = {
        All:      leaves?.length || 0,
        Pending:  leaves?.filter(l => l.status === 'Pending').length  || 0,
        Approved: leaves?.filter(l => l.status === 'Approved').length || 0,
        Rejected: leaves?.filter(l => l.status === 'Rejected').length || 0,
    }

    const customStyles = {
        headCells: {
            style: {
                backgroundColor: '#f8f7f4',
                color: '#78716c',
                fontSize: '11px',
                fontWeight: '600',
                textTransform: 'uppercase'
            }
        },
        rows: { style: { '&:hover': { backgroundColor: '#fafaf9' }, fontSize: '13px' } }
    }

    return (
        <div className="p-6 bg-stone-50 min-h-full">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-stone-800">Manage Leave Requests</h2>

            </div>

            {/* Status Summary Cards */}
            <div className="grid grid-cols-4 gap-3 mb-6">
                {['All','Pending','Approved','Rejected'].map(s => {
                    const colors = {
                        All: 'border-stone-200 bg-white', Pending: 'border-amber-200 bg-amber-50',
                        Approved: 'border-emerald-200 bg-emerald-50', Rejected: 'border-red-200 bg-red-50'
                    }
                    const numColors = {
                        All: 'text-stone-700', Pending: 'text-amber-600',
                        Approved: 'text-emerald-600', Rejected: 'text-red-500'
                    }
                    return (
                        <button key={s} onClick={() => filterByStatus(s)}
                            className={`rounded-xl border p-3 text-center transition hover:shadow-sm ${colors[s]} ${activeFilter === s ? 'ring-2 ring-teal-400' : ''}`}>
                            <p className={`text-2xl font-bold ${numColors[s]}`}>{counts[s]}</p>
                            <p className="text-xs text-stone-500 font-medium mt-0.5">{s}</p>
                        </button>
                    )
                })}
            </div>

            {/* Search + Filter */}
            <div className="bg-white rounded-xl border border-stone-200 p-4 mb-5 flex flex-wrap gap-3 items-center justify-between">
                <div className="relative">
                    <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-xs" />
                    <input type="text" placeholder="Search by name or employee ID..."
                        onChange={filterBySearch}
                        className="pl-8 pr-4 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 w-64" />
                </div>
                <div className="flex gap-2">
                    {['All','Pending','Approved','Rejected'].map(s => (
                        <button key={s} onClick={() => filterByStatus(s)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${activeFilter === s ? 'bg-teal-600 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}>
                            {s}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-sm">
                {!filtered ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
                    </div>
                ) : (
                    <DataTable.default
                        columns={columns}
                        data={filtered}
                        pagination
                        customStyles={customStyles}
                        noDataComponent={
                            <div className="text-center py-12 text-stone-400">
                                <p className="font-medium">No leave records found</p>
                            </div>
                        }
                    />
                )}
            </div>


        </div>
    )
}

export default Table
