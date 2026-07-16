import React from 'react'
import { NavLink, Link } from 'react-router-dom'
import { FaMoneyBillWave, FaTachometerAlt, FaUsers, FaCalendarAlt, FaCogs, FaUserCheck, FaChartBar } from 'react-icons/fa'
import { useAuth } from '../../context/authContext'

const Sidebar = () => {
    const { user } = useAuth()
    const base     = 'flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-150'
    const active   = 'bg-teal-600 text-white shadow-sm'
    const inactive = 'text-stone-300 hover:bg-white/10 hover:text-white'
    const cls = ({ isActive }) => `${base} ${isActive ? active : inactive}`

    return (
        <div className="bg-gradient-to-b from-teal-950 to-teal-900 h-screen fixed left-0 top-0 bottom-0 w-64 flex flex-col shadow-2xl">
            {/* Logo */}
            <div className="px-6 py-5 border-b border-white/10">
                <Link to="/employee-dashboard" className="flex items-center gap-3 hover:opacity-80 transition">
                    <div className="w-9 h-9 bg-teal-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                        <FaUsers className="text-white text-sm" />
                    </div>
                    <div>
                        <p className="text-white font-bold text-sm leading-tight">EMS Portal</p>
                        <p className="text-teal-400 text-xs">Employee Panel</p>
                    </div>
                </Link>
            </div>

            <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
                <p className="text-teal-500/80 text-[10px] font-bold uppercase tracking-widest px-4 mb-2 pt-1">Main</p>

                <NavLink to="/employee-dashboard" end className={cls}>
                    <FaTachometerAlt className="flex-shrink-0" /><span>Dashboard</span>
                </NavLink>

                <NavLink to={`/employee-dashboard/profile/${user._id}`} className={cls}>
                    <FaUsers className="flex-shrink-0" /><span>My Profile</span>
                </NavLink>

                <p className="text-teal-500/80 text-[10px] font-bold uppercase tracking-widest px-4 pt-5 mb-2">Records</p>

                <NavLink to="/employee-dashboard/attendance" className={cls}>
                    <FaUserCheck className="flex-shrink-0" /><span>Attendance History</span>
                </NavLink>

                <NavLink to={`/employee-dashboard/leaves/${user._id}`} className={cls}>
                    <FaCalendarAlt className="flex-shrink-0" /><span>My Leaves</span>
                </NavLink>

                <NavLink to={`/employee-dashboard/salary/${user._id}`} className={cls}>
                    <FaMoneyBillWave className="flex-shrink-0" /><span>My Salary</span>
                </NavLink>

                <p className="text-teal-500/80 text-[10px] font-bold uppercase tracking-widest px-4 pt-5 mb-2">System</p>

                <NavLink to="/employee-dashboard/setting" className={cls}>
                    <FaCogs className="flex-shrink-0" /><span>Settings</span>
                </NavLink>
            </nav>


        </div>
    )
}

export default Sidebar
