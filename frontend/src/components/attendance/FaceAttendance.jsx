import React, { useRef, useState, useCallback, useEffect } from 'react'
import axios from 'axios'
import { FaCamera, FaStop, FaCheckCircle, FaTimesCircle, FaExclamationTriangle, FaSignInAlt, FaSignOutAlt } from 'react-icons/fa'

const STATUS = { IDLE: 'idle', READY: 'ready', PROCESSING: 'processing', SUCCESS: 'success', ERROR: 'error', WARNING: 'warning' }

const FaceAttendance = () => {
    const videoRef = useRef(null)
    const canvasRef = useRef(null)
    const [stream, setStream] = useState(null)
    const [mode, setMode] = useState('checkin')
    const [status, setStatus] = useState(STATUS.IDLE)
    const [message, setMessage] = useState('')
    const [result, setResult] = useState(null)

    useEffect(() => () => { if (stream) stream.getTracks().forEach(t => t.stop()) }, [stream])

    const startCamera = async () => {
        try {
            const s = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' } })
            videoRef.current.srcObject = s
            videoRef.current.play()
            setStream(s)
            setStatus(STATUS.READY)
            setMessage('Position your face in the frame and click Scan')
            setResult(null)
        } catch {
            setStatus(STATUS.ERROR)
            setMessage('Camera access denied. Please allow camera permissions in your browser.')
        }
    }

    const stopCamera = () => {
        if (stream) stream.getTracks().forEach(t => t.stop())
        setStream(null)
        setStatus(STATUS.IDLE)
        setMessage('')
    }

    const capture = useCallback(async () => {
        if (!videoRef.current || !canvasRef.current) return
        setStatus(STATUS.PROCESSING)
        setMessage('Scanning face, please hold still...')
        setResult(null)

        const canvas = canvasRef.current
        canvas.width = videoRef.current.videoWidth
        canvas.height = videoRef.current.videoHeight
        canvas.getContext('2d').drawImage(videoRef.current, 0, 0)
        const imageData = canvas.toDataURL('image/jpeg', 0.85)

        const endpoint = mode === 'checkin' ? 'http://localhost:5001/recognize' : 'http://localhost:5001/checkout'

        try {
            const res = await axios.post(endpoint, { image: imageData })
            const data = res.data

            if (data.success && !data.alreadyMarked && !data.alreadyCheckedOut) {
                // Perfect success
                setStatus(STATUS.SUCCESS)
                setResult(data)
                setMessage(mode === 'checkin'
                    ? ` Check-In successful for ${data.employeeName || data.employeeId}`
                    : ` Check-Out successful for ${data.employeeName || data.employeeId}`)
                stopCamera()
            } else if (data.alreadyMarked) {
                // Already checked in
                setStatus(STATUS.WARNING)
                setMessage(` Already checked in today. You cannot check in twice in a day.`)
            } else if (data.alreadyCheckedOut) {
                // Already checked out
                setStatus(STATUS.WARNING)
                setMessage(` Already checked out today. You cannot check out twice in a day.`)
            } else {
                // Face not recognized or other failure
                setStatus(STATUS.ERROR)
                setMessage(data.message || 'Face not recognized. Please ensure you are registered and try again.')
            }
        } catch (err) {
            setStatus(STATUS.ERROR)
            setMessage(' Cannot connect to face recognition service on port 5001. Please start the Python service.')
        }
    }, [stream, mode])

    const msgStyle = {
        [STATUS.SUCCESS]: 'bg-emerald-50 border border-emerald-200 text-emerald-800',
        [STATUS.ERROR]: 'bg-red-50 border border-red-200 text-red-800',
        [STATUS.WARNING]: 'bg-amber-50 border border-amber-200 text-amber-800',
        [STATUS.PROCESSING]: 'bg-teal-50 border border-teal-200 text-teal-800',
        [STATUS.READY]: 'bg-stone-50 border border-stone-200 text-stone-700',
    }

    return (
        <div className="p-6 bg-stone-50 min-h-full">
            <div className="max-w-xl mx-auto">
                <div className="mb-5">
                    <h2 className="text-2xl font-bold text-stone-800">Face Attendance</h2>
                    <p className="text-stone-500 text-sm mt-0.5">Mark your attendance using facial recognition</p>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
                    {/* Mode Selector */}
                    <div className="flex border-b border-stone-100">
                        <button onClick={() => { setMode('checkin'); setStatus(STATUS.IDLE); setMessage(''); setResult(null) }}
                            className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-semibold transition ${mode === 'checkin' ? 'bg-teal-600 text-white' : 'text-stone-500 hover:bg-stone-50'}`}>
                            <FaSignInAlt /> Check In
                        </button>
                        <button onClick={() => { setMode('checkout'); setStatus(STATUS.IDLE); setMessage(''); setResult(null) }}
                            className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-semibold transition ${mode === 'checkout' ? 'bg-amber-600 text-white' : 'text-stone-500 hover:bg-stone-50'}`}>
                            <FaSignOutAlt /> Check Out
                        </button>
                    </div>

                    <div className="p-5">
                        {/* Camera Feed */}
                        <div className={`relative rounded-xl overflow-hidden bg-stone-900 mb-4 ${stream ? '' : 'border-2 border-dashed border-stone-300'}`} style={{ minHeight: 280 }}>
                            <video ref={videoRef} className="w-full rounded-xl" style={{ display: stream ? 'block' : 'none' }} />
                            {!stream && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-stone-500">
                                    <FaCamera className="text-5xl mb-3 opacity-20" />
                                    <p className="text-sm font-medium">Camera not started</p>
                                    <p className="text-xs text-stone-400 mt-1">Click "Start Camera" to begin</p>
                                </div>
                            )}
                            {/* Corner guides when camera is active */}
                            {stream && (
                                <div className="absolute inset-0 pointer-events-none">
                                    <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-teal-400 rounded-tl-lg opacity-80"></div>
                                    <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-teal-400 rounded-tr-lg opacity-80"></div>
                                    <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-teal-400 rounded-bl-lg opacity-80"></div>
                                    <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-teal-400 rounded-br-lg opacity-80"></div>
                                </div>
                            )}
                            {status === STATUS.PROCESSING && (
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                    <div className="text-center text-white">
                                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-400 mx-auto mb-2"></div>
                                        <p className="text-sm font-medium">Recognizing...</p>
                                    </div>
                                </div>
                            )}
                        </div>
                        <canvas ref={canvasRef} className="hidden" />

                        {/* Buttons */}
                        <div className="flex gap-2 mb-4">
                            {!stream ? (
                                <button onClick={startCamera}
                                    className="flex-1 flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 rounded-xl transition text-sm">
                                    <FaCamera /> Start Camera
                                </button>
                            ) : (
                                <>
                                    <button onClick={capture} disabled={status === STATUS.PROCESSING}
                                        className={`flex-1 flex items-center justify-center gap-2 font-semibold py-3 rounded-xl transition text-sm text-white
                                        ${mode === 'checkin' ? 'bg-teal-600 hover:bg-teal-700' : 'bg-amber-600 hover:bg-amber-700'} disabled:opacity-50`}>
                                        {status === STATUS.PROCESSING
                                            ? <><span className="animate-spin">⏳</span> Processing...</>
                                            : <>{mode === 'checkin' ? <FaSignInAlt /> : <FaSignOutAlt />} Capture & {mode === 'checkin' ? 'Check In' : 'Check Out'}</>}
                                    </button>
                                    <button onClick={stopCamera}
                                        className="px-4 bg-stone-200 hover:bg-stone-300 text-stone-600 rounded-xl transition">
                                        <FaStop />
                                    </button>
                                </>
                            )}
                        </div>

                        {/* Status Message */}
                        {message && (
                            <div className={`p-4 rounded-xl text-sm font-medium ${msgStyle[status] || 'bg-stone-50 text-stone-600'}`}>
                                {message}
                            </div>
                        )}

                        {/* Success Detail Card */}
                        {status === STATUS.SUCCESS && result && (
                            <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
                                <FaCheckCircle className="text-emerald-500 text-xl mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="font-bold text-emerald-800 text-sm">Attendance Recorded Successfully</p>
                                    <p className="text-emerald-600 text-xs mt-1">Employee ID: {result.employeeId}</p>
                                    {result.employeeName && <p className="text-emerald-600 text-xs">Name: {result.employeeName}</p>}
                                    <p className="text-emerald-600 text-xs">Time: {new Date().toLocaleTimeString()}</p>
                                    <p className="text-emerald-600 text-xs">Mode: {mode === 'checkin' ? 'Check In' : 'Check Out'}</p>
                                </div>
                            </div>
                        )}

                        {/* Tips */}
                        <div className="mt-4 bg-stone-50 rounded-xl p-4">
                            <p className="text-xs font-semibold text-stone-600 mb-2"> Tips for accurate recognition:</p>
                            <ul className="text-xs text-stone-500 space-y-1 list-disc list-inside">
                                <li>Ensure good lighting on your face</li>
                                <li>Look directly at the camera</li>
                                <li>Remove sunglasses or hats</li>
                                <li>Your face must be registered first by admin</li>
                                <li>One check-in and one check-out per day only</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
export default FaceAttendance
