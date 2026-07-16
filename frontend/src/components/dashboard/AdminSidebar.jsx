import React from 'react'
import { NavLink, Link } from 'react-router-dom'
import { FaBuilding, FaMoneyBillWave, FaTachometerAlt, FaUsers, FaCalendarAlt, FaCogs, FaFingerprint, FaUserCheck, FaUmbrellaBeach, FaEnvelope, FaChartBar } from 'react-icons/fa'

const AdminSidebar = () => {
    const base     = 'flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-150'
    const active   = 'bg-teal-600 text-white shadow-md'
    const inactive = 'text-stone-300 hover:bg-white/10 hover:text-white'
    const cls = ({ isActive }) => `${base} ${isActive ? active : inactive}`

    return (
        <div className="bg-gradient-to-b from-teal-950 to-teal-900 h-screen fixed left-0 top-0 bottom-0 w-64 flex flex-col shadow-2xl">
            {/* Logo */}
            <div className="px-6 py-5 border-b border-white/10">
                <Link to="/admin-dashboard" className="flex items-center gap-3 hover:opacity-80 transition">
                    <div className="w-9 h-9 bg-teal-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                        <FaUsers className="text-white text-sm" />
                    </div>
                    <div>
                        <p className="text-white font-bold text-sm leading-tight">EMS Portal</p>
                        <p className="text-teal-400 text-xs">Admin Panel</p>
                    </div>
                </Link>
            </div>

            <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
                <p className="text-teal-500/80 text-[10px] font-bold uppercase tracking-widest px-4 mb-2 pt-1">Main</p>
                <NavLink to="/admin-dashboard" end className={cls}><FaTachometerAlt className="flex-shrink-0" /><span>Dashboard</span></NavLink>
                <NavLink to="/admin-dashboard/employees" className={cls}><FaUsers className="flex-shrink-0" /><span>Employees</span></NavLink>
                <NavLink to="/admin-dashboard/departments" className={cls}><FaBuilding className="flex-shrink-0" /><span>Departments</span></NavLink>
                <NavLink to="/admin-dashboard/leaves" className={cls}><FaCalendarAlt className="flex-shrink-0" /><span>Leave Requests</span></NavLink>
                <NavLink to="/admin-dashboard/leave-balances" className={cls}><FaChartBar className="flex-shrink-0" /><span>Leave Balances</span></NavLink>
                <NavLink to="/admin-dashboard/salary/add" className={cls}><FaMoneyBillWave className="flex-shrink-0" /><span>Salary</span></NavLink>

                <p className="text-teal-500/80 text-[10px] font-bold uppercase tracking-widest px-4 pt-5 mb-2">Attendance</p>
<NavLink to="/admin-dashboard/attendance" end className={cls}><FaUserCheck className="flex-shrink-0" /><span>View Attendance</span></NavLink>
                <NavLink to="/admin-dashboard/attendance/register-face" className={cls}><FaFingerprint className="flex-shrink-0" /><span>Register Face</span></NavLink>
                <NavLink to="/admin-dashboard/holidays" className={cls}><FaUmbrellaBeach className="flex-shrink-0" /><span>Holidays</span></NavLink>

                <p className="text-teal-500/80 text-[10px] font-bold uppercase tracking-widest px-4 pt-5 mb-2">System</p>
                <NavLink to="/admin-dashboard/setting" className={cls}><FaCogs className="flex-shrink-0" /><span>Settings</span></NavLink>
                <NavLink to="/admin-dashboard/email-settings" className={cls}><FaEnvelope className="flex-shrink-0" /><span>Email Settings</span></NavLink>
            </nav>

        </div>
    )
}
export default AdminSidebar
