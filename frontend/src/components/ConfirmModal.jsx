import React from 'react'
import { FaExclamationTriangle } from 'react-icons/fa'

const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel, confirmText = 'Delete', confirmColor = 'bg-red-600 hover:bg-red-700' }) => {
    if (!isOpen) return null
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
                <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <FaExclamationTriangle className="text-red-600 text-xl" />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-stone-800">{title}</h3>
                        <p className="text-sm text-stone-500 mt-0.5">{message}</p>
                    </div>
                </div>
                <div className="flex gap-3 mt-6">
                    <button onClick={onCancel}
                        className="flex-1 py-2.5 rounded-xl border border-stone-200 text-stone-600 font-semibold text-sm hover:bg-stone-50 transition">
                        Cancel
                    </button>
                    <button onClick={onConfirm}
                        className={`flex-1 py-2.5 rounded-xl text-white font-semibold text-sm transition ${confirmColor}`}>
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default ConfirmModal