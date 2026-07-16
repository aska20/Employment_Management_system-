import React from 'react'
import { useNavigate } from 'react-router-dom'
import { FaLock, FaArrowLeft } from 'react-icons/fa'

const Unauthorized = () => {
    const navigate = useNavigate()
    return (
        <div className="min-h-screen bg-stone-100 flex items-center justify-center">
            <div className="text-center bg-white rounded-2xl p-10 shadow-md border border-stone-200 max-w-md w-full mx-4">
                <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <FaLock className="text-red-500 text-2xl" />
                </div>
                <h1 className="text-2xl font-bold text-stone-800 mb-2">Access Denied</h1>
                <p className="text-stone-500 text-sm mb-6">You do not have permission to access this page. Please login with the correct account.</p>
                <div className="flex gap-3 justify-center">
                    <button onClick={() => navigate(-1)}
                        className="flex items-center gap-2 px-4 py-2 border border-stone-300 rounded-xl text-stone-600 hover:bg-stone-50 text-sm font-medium transition">
                        <FaArrowLeft /> Go Back
                    </button>
                    <button onClick={() => navigate('/login')}
                        className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold transition">
                        Login Again
                    </button>
                </div>
            </div>
        </div>
    )
}
export default Unauthorized
