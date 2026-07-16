import React from 'react'
import { useAuth } from '../context/authContext'
import { Navigate } from 'react-router-dom'

const RoleBaseRoutes = ({ children, requiredRole }) => {
    const { user, loading } = useAuth()

    if (loading) return (
        <div className="flex items-center justify-center h-screen bg-stone-100">
            <div className="text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600 mx-auto mb-3"></div>
                <p className="text-stone-500 text-sm">Verifying access...</p>
            </div>
        </div>
    )

    if (!user) return <Navigate to="/login" replace />
    if (!requiredRole.includes(user.role)) return <Navigate to="/unauthorized" replace />
    return children
}

export default RoleBaseRoutes
