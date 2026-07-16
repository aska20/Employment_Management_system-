import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../context/authContext'
import { useNavigate } from 'react-router-dom'
import { FaBell, FaSignOutAlt, FaCalendarCheck, FaCalendarTimes, FaUmbrellaBeach, FaUserClock, FaRunning, FaCheckCircle, FaTimesCircle } from 'react-icons/fa'
import axios from 'axios'
import { API_BASE, apiUrl, fileUrl } from '../../utils/apiConfig'

const iconMap = {
    leave_applied:       { icon: <FaCalendarCheck className="text-teal-500" />,    bg: 'bg-teal-50'    },
    leave_approved:      { icon: <FaCalendarCheck className="text-emerald-500" />,  bg: 'bg-emerald-50' },
    leave_rejected:      { icon: <FaCalendarTimes className="text-red-500" />,     bg: 'bg-red-50'     },
    holiday_declared:    { icon: <FaUmbrellaBeach className="text-amber-500" />,   bg: 'bg-amber-50'   },
    attendance_absent:   { icon: <FaUserClock className="text-orange-500" />,      bg: 'bg-orange-50'  },
    early_exit_request:  { icon: <FaRunning className="text-amber-500" />,         bg: 'bg-amber-50'   },
    early_exit_approved: { icon: <FaCheckCircle className="text-emerald-500" />,   bg: 'bg-emerald-50' },
    early_exit_rejected: { icon: <FaTimesCircle className="text-red-500" />,       bg: 'bg-red-50'     },
}

const timeAgo = (dateStr) => {
    const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000)
    if (diff < 60)    return `${diff}s ago`
    if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
}

const Navbar = () => {
    const { user, logout }  = useAuth()
    const navigate          = useNavigate()
    const [open, setOpen]   = useState(false)
    const [notifications, setNotifications] = useState([])
    const [unread, setUnread]   = useState(0)
    const [imgError, setImgError] = useState(false)
    const dropRef = useRef(null)
    const pollRef = useRef(null)

    const fetchNotifications = async () => {
        try {
            const r = await axios.get(`${API_BASE}/api/notifications`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            })
            if (r.data.success) { setNotifications(r.data.notifications); setUnread(r.data.unreadCount) }
        } catch {}
    }

    useEffect(() => {
        fetchNotifications()
        pollRef.current = setInterval(fetchNotifications, 15000)
        return () => clearInterval(pollRef.current)
    }, [])

    useEffect(() => {
        const handler = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false) }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    const handleOpen = async () => {
        const wasOpen = open; setOpen(o => !o)
        if (!wasOpen && unread > 0) {
            try {
                await axios.put(`${API_BASE}/api/notifications/read-all`, {}, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
                setUnread(0); setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
            } catch {}
        }
    }

    const handleLogout = () => { logout(); navigate('/login') }
    const handleNotifClick = (n) => { if (n.link) navigate(n.link); setOpen(false) }

    const photoUrl   = user?.profileImage ? `${API_BASE}/${user.profileImage}` : null
    const avatarUrl  = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'U')}&background=0f766e&color=fff&size=36&rounded=true&bold=true`

    return (
        <div className="flex items-center justify-between h-14 px-6 bg-white border-b border-stone-200 shadow-sm sticky top-0 z-20">
            <div>
                <p className="text-xs text-stone-400 uppercase tracking-wider font-medium">Welcome back</p>
                <p className="text-stone-800 font-bold text-sm leading-tight">{user?.name}</p>
            </div>

            <div className="flex items-center gap-3">
                {/* Bell */}
                <div className="relative" ref={dropRef}>
                    <button onClick={handleOpen} className="relative p-2.5 rounded-xl hover:bg-stone-100 transition text-stone-500">
                        <FaBell className="text-base" />
                        {unread > 0 && (
                            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold px-1 leading-none">
                                {unread > 9 ? '9+' : unread}
                            </span>
                        )}
                    </button>
                    {open && (
                        <div className="absolute right-0 top-11 w-80 bg-white rounded-2xl shadow-2xl border border-stone-200 z-50 overflow-hidden">
                            <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100 bg-stone-50">
                                <h3 className="font-bold text-stone-800 text-sm">Notifications</h3>
                                <div className="flex items-center gap-2">
                                    {unread === 0 && <span className="text-xs text-emerald-600 font-medium">All read</span>}
                                    <span className="text-xs text-stone-400">{notifications.length} total</span>
                                </div>
                            </div>
                            <div className="max-h-96 overflow-y-auto divide-y divide-stone-50">
                                {notifications.length === 0 ? (
                                    <div className="text-center py-10 text-stone-400">
                                        <FaBell className="text-3xl mx-auto mb-2 opacity-20" />
                                        <p className="text-xs font-medium">No notifications yet</p>
                                    </div>
                                ) : notifications.map(n => {
                                    const meta = iconMap[n.type] || { icon: <FaBell className="text-stone-400" />, bg: 'bg-stone-50' }
                                    return (
                                        <div key={n._id} onClick={() => handleNotifClick(n)}
                                            className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition ${!n.isRead ? 'bg-teal-50/70' : 'bg-white'} hover:bg-stone-50`}>
                                            <div className={`w-8 h-8 ${meta.bg} rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5`}>{meta.icon}</div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-xs leading-relaxed ${!n.isRead ? 'font-semibold text-stone-800' : 'text-stone-600'}`}>{n.message}</p>
                                                <p className="text-[10px] text-stone-400 mt-0.5">{timeAgo(n.createdAt)}</p>
                                            </div>
                                            {!n.isRead && <div className="w-2 h-2 bg-teal-500 rounded-full flex-shrink-0 mt-2"></div>}
                                        </div>
                                    )
                                })}
                            </div>
                            <div className="px-4 py-2.5 bg-stone-50 border-t border-stone-100 text-center">
                                <p className="text-[10px] text-stone-400">Updates every 15 seconds automatically</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* User chip: photo + name + role */}
                <div className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl">
                    {photoUrl && !imgError ? (
                        <img src={photoUrl} alt={user?.name} onError={() => setImgError(true)}
                            className="w-7 h-7 rounded-lg object-cover border border-stone-200 flex-shrink-0" />
                    ) : (
                        <img src={avatarUrl} alt={user?.name} className="w-7 h-7 rounded-lg object-cover flex-shrink-0" />
                    )}
                    <div className="leading-none">
                        <p className="text-stone-800 text-xs font-bold truncate max-w-[120px]">{user?.name}</p>
                        <p className="text-stone-400 text-[10px] capitalize mt-0.5">{user?.role}</p>
                    </div>
                </div>

                <button onClick={handleLogout}
                    className="flex items-center gap-2 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-sm font-medium transition border border-red-100">
                    <FaSignOutAlt /><span>Logout</span>
                </button>
            </div>
        </div>
    )
}
export default Navbar
