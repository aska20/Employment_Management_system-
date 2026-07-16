import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { FACE_SERVICE_URL, faceHeaders } from '../utils/serviceConfig'
import { FaCamera, FaSignInAlt, FaSignOutAlt, FaStop, FaCheckCircle, FaTimesCircle, FaExclamationTriangle, FaUserCheck, FaUsers, FaClock, FaSignInAlt as FaLogin } from 'react-icons/fa'

const KioskDashboard = () => {
    const navigate = useNavigate()
    const videoRef = useRef(null)
    const canvasRef = useRef(null)
    const [stream, setStream]           = useState(null)
    const [mode, setMode]               = useState('checkin')
    const [status, setStatus]           = useState('idle')
    const [message, setMessage]         = useState('')
    const [result, setResult]           = useState(null)
    const [todayAttendance, setTodayAttendance] = useState([])
    const [currentTime, setCurrentTime] = useState(new Date())
    const [loading, setLoading]         = useState(false)

    // Live clock
    useEffect(() => {
        const t = setInterval(() => setCurrentTime(new Date()), 1000)
        return () => clearInterval(t)
    }, [])

    // Fetch today's attendance every 30 seconds
    useEffect(() => {
        fetchTodayAttendance()
        const t = setInterval(fetchTodayAttendance, 30000)
        return () => clearInterval(t)
    }, [])

    useEffect(() => () => { if (stream) stream.getTracks().forEach(t => t.stop()) }, [stream])

    const fetchTodayAttendance = async () => {
        try {
            const today = new Date().toISOString().split('T')[0]
            const r = await axios.get(`http://localhost:5000/api/attendance/daily/${today}`)
            if (r.data.success) setTodayAttendance(r.data.attendance)
        } catch {}
    }

    const startCamera = async () => {
        try {
            const s = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' } })
            videoRef.current.srcObject = s
            videoRef.current.play()
            setStream(s)
            setStatus('ready')
            setResult(null)
            setMessage('Position your face in the frame and click Scan')
        } catch {
            setStatus('error')
            setMessage('Camera access denied. Please allow camera permissions.')
        }
    }

    const stopCamera = () => {
        if (stream) stream.getTracks().forEach(t => t.stop())
        setStream(null)
        setStatus('idle')
        setMessage('')
        setResult(null)
    }

    const capture = useCallback(async () => {
        if (!videoRef.current || !canvasRef.current) return
        setStatus('processing')
        setMessage('Scanning face...')
        setResult(null)
        setLoading(true)

        const canvas = canvasRef.current
        canvas.width  = videoRef.current.videoWidth
        canvas.height = videoRef.current.videoHeight
        canvas.getContext('2d').drawImage(videoRef.current, 0, 0)
        const imageData = canvas.toDataURL('image/jpeg', 0.85)

        const endpoint = mode === 'checkin' ? `${FACE_SERVICE_URL}/recognize` : `${FACE_SERVICE_URL}/checkout`
        try {
            const res = await axios.post(endpoint, { image: imageData }, { headers: faceHeaders() })
            const data = res.data

            if (data.success && !data.alreadyMarked && !data.alreadyCheckedOut) {
                setStatus('success')
                setResult(data)
                setMessage(mode === 'checkin'
                    ? `Welcome, ${data.employeeName || data.employeeId}! Check-in recorded.`
                    : `Goodbye, ${data.employeeName || data.employeeId}! Check-out recorded.`)
                stopCamera()
                fetchTodayAttendance()
            } else if (data.alreadyMarked) {
                setStatus('warning')
                setResult(data)
                setMessage(`${data.employeeName || data.employeeId} - already checked in today.`)
            } else if (data.alreadyCheckedOut) {
                setStatus('warning')
                setResult(data)
                setMessage(`${data.employeeName || data.employeeId} - already checked out today.`)
            } else {
                setStatus('error')
                setMessage(data.message || 'Face not recognized. Please try again.')
            }
        } catch {
            setStatus('error')
            setMessage('Cannot connect to face recognition service. Please start the Python service (port 5001).')
        }
        setLoading(false)
    }, [stream, mode])

    // Auto-reset after 5 seconds on success/error
    useEffect(() => {
        if (status === 'success' || status === 'warning') {
            const t = setTimeout(() => {
                setStatus('idle')
                setMessage('')
                setResult(null)
            }, 5000)
            return () => clearTimeout(t)
        }
    }, [status])

    const presentCount  = todayAttendance.filter(a => a.status === 'Present' || a.status === 'Late').length
    const checkedOut    = todayAttendance.filter(a => a.checkOut).length
    const absentCount   = todayAttendance.filter(a => a.status === 'Absent').length

    const statusStyle = {
        success:    'bg-emerald-50 border-emerald-300 text-emerald-800',
        error:      'bg-red-50 border-red-300 text-red-800',
        warning:    'bg-amber-50 border-amber-300 text-amber-800',
        processing: 'bg-teal-50 border-teal-300 text-teal-800',
        ready:      'bg-stone-50 border-stone-300 text-stone-700',
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-teal-900 via-teal-800 to-stone-800 flex flex-col">
            {/* Top Bar */}
            <div className="flex items-center justify-between px-8 py-4 bg-black/20 border-b border-white/10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-teal-500 rounded-xl flex items-center justify-center">
                        <FaUsers className="text-white" />
                    </div>
                    <div>
                        <p className="text-white font-bold text-lg leading-tight">EMS Attendance Kiosk</p>
                        <p className="text-teal-300 text-xs">Scan your face to mark attendance</p>
                    </div>
                </div>

                {/* Live Clock */}
                <div className="text-right">
                    <p className="text-white text-3xl font-bold tracking-tight font-mono">
                        {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </p>
                    <p className="text-teal-300 text-sm">
                        {currentTime.toLocaleDateString('en-NP', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                </div>

                {/* Login Link */}
                <button onClick={() => navigate('/login')}
                    className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm font-semibold rounded-xl transition border border-white/20">
                    <FaLogin /> Staff Login
                </button>
            </div>

            <div className="flex-1 flex gap-6 p-6">
                {/* Left: Camera + Controls */}
                <div className="flex-1 flex flex-col gap-4">
                    {/* Mode Toggle */}
                    <div className="flex gap-3">
                        <button onClick={() => { setMode('checkin'); stopCamera() }}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition ${mode === 'checkin' ? 'bg-teal-500 text-white shadow-lg' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}>
                            <FaSignInAlt /> Check In
                        </button>
                        <button onClick={() => { setMode('checkout'); stopCamera() }}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition ${mode === 'checkout' ? 'bg-amber-500 text-white shadow-lg' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}>
                            <FaSignOutAlt /> Check Out
                        </button>
                    </div>

                    {/* Camera Feed */}
                    <div className="relative bg-black/40 rounded-2xl overflow-hidden border border-white/20 shadow-xl flex-1" style={{ minHeight: 320 }}>
                        <video ref={videoRef} className="w-full h-full object-cover rounded-2xl" style={{ display: stream ? 'block' : 'none' }} />
                        {!stream && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-white/40">
                                <FaCamera className="text-6xl mb-4" />
                                <p className="text-lg font-medium">Camera not started</p>
                                <p className="text-sm mt-1">Click Start Camera to begin</p>
                            </div>
                        )}

                        {/* Face guide overlay */}
                        {stream && (
                            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                                <div className="w-48 h-56 border-2 border-teal-400 rounded-full opacity-50"></div>
                                <div className="absolute top-4 left-4 w-10 h-10 border-t-2 border-l-2 border-teal-400 rounded-tl-xl"></div>
                                <div className="absolute top-4 right-4 w-10 h-10 border-t-2 border-r-2 border-teal-400 rounded-tr-xl"></div>
                                <div className="absolute bottom-4 left-4 w-10 h-10 border-b-2 border-l-2 border-teal-400 rounded-bl-xl"></div>
                                <div className="absolute bottom-4 right-4 w-10 h-10 border-b-2 border-r-2 border-teal-400 rounded-br-xl"></div>
                            </div>
                        )}

                        {status === 'processing' && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-2xl">
                                <div className="text-center text-white">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-400 mx-auto mb-3"></div>
                                    <p className="font-semibold">Recognizing face...</p>
                                </div>
                            </div>
                        )}

                        {status === 'success' && (
                            <div className="absolute inset-0 bg-emerald-500/30 flex items-center justify-center rounded-2xl">
                                <FaCheckCircle className="text-emerald-400 text-8xl animate-bounce" />
                            </div>
                        )}
                    </div>
                    <canvas ref={canvasRef} className="hidden" />

                    {/* Buttons */}
                    <div className="flex gap-3">
                        {!stream ? (
                            <button onClick={startCamera}
                                className="flex-1 flex items-center justify-center gap-2 bg-teal-500 hover:bg-teal-400 text-white font-bold py-4 rounded-xl transition text-base shadow-lg">
                                <FaCamera /> Start Camera
                            </button>
                        ) : (
                            <>
                                <button onClick={capture} disabled={status === 'processing'}
                                    className={`flex-1 flex items-center justify-center gap-2 font-bold py-4 rounded-xl transition text-white shadow-lg text-base
                                    ${mode === 'checkin' ? 'bg-teal-500 hover:bg-teal-400' : 'bg-amber-500 hover:bg-amber-400'} disabled:opacity-50`}>
                                    {status === 'processing' ? '⏳ Scanning...' : `Scan & ${mode === 'checkin' ? 'Check In' : 'Check Out'}`}
                                </button>
                                <button onClick={stopCamera}
                                    className="px-5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition">
                                    <FaStop />
                                </button>
                            </>
                        )}
                    </div>

                    {/* Status Message */}
                    {message && (
                        <div className={`p-4 rounded-xl border text-sm font-semibold text-center ${statusStyle[status] || 'bg-stone-50 border-stone-200 text-stone-600'}`}>
                            {status === 'success' && <FaCheckCircle className="inline mr-2 text-emerald-500" />}
                            {status === 'error' && <FaTimesCircle className="inline mr-2 text-red-500" />}
                            {status === 'warning' && <FaExclamationTriangle className="inline mr-2 text-amber-500" />}
                            {message}
                            {(status === 'success' || status === 'warning') && (
                                <p className="text-xs font-normal mt-1 opacity-70">Screen resets in 5 seconds...</p>
                            )}
                        </div>
                    )}
                </div>

                {/* Right: Today's Attendance List */}
                <div className="w-80 flex flex-col gap-4">
                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2">
                        <div className="bg-emerald-500/20 border border-emerald-400/30 rounded-xl p-3 text-center">
                            <p className="text-2xl font-bold text-emerald-300">{presentCount}</p>
                            <p className="text-xs text-emerald-200 mt-0.5">Present</p>
                        </div>
                        <div className="bg-amber-500/20 border border-amber-400/30 rounded-xl p-3 text-center">
                            <p className="text-2xl font-bold text-amber-300">{checkedOut}</p>
                            <p className="text-xs text-amber-200 mt-0.5">Checked Out</p>
                        </div>
                        <div className="bg-red-500/20 border border-red-400/30 rounded-xl p-3 text-center">
                            <p className="text-2xl font-bold text-red-300">{absentCount}</p>
                            <p className="text-xs text-red-200 mt-0.5">Absent</p>
                        </div>
                    </div>

                    {/* Attendance List */}
                    <div className="flex-1 bg-white/10 rounded-2xl border border-white/20 overflow-hidden">
                        <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
                            <FaUserCheck className="text-teal-300" />
                            <h3 className="font-bold text-white text-sm">Today's Check-Ins</h3>
                            <span className="ml-auto text-xs text-teal-300">{presentCount} present</span>
                        </div>
                        <div className="overflow-y-auto" style={{ maxHeight: 420 }}>
                            {todayAttendance.length === 0 ? (
                                <div className="text-center py-10 text-white/40">
                                    <FaUsers className="text-3xl mx-auto mb-2" />
                                    <p className="text-sm">No check-ins yet today</p>
                                </div>
                            ) : (
                                todayAttendance.map(a => {
                                    const statusColor = {
                                        Present:    'text-emerald-400',
                                        Late:       'text-amber-400',
                                        'Half Day': 'text-orange-400',
                                        Absent:     'text-red-400'
                                    }
                                    return (
                                        <div key={a._id} className="flex items-center gap-3 px-4 py-2.5 border-b border-white/5 hover:bg-white/5">
                                            <img
                                                src={`http://localhost:5000/${a.employeeId?.userId?.profileImage}`}
                                                className="w-9 h-9 rounded-full object-cover border border-white/20 flex-shrink-0"
                                                onError={e => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(a.employeeId?.userId?.name || 'E')}&background=0f766e&color=fff&size=36` }}
                                            />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-white font-semibold text-sm truncate">{a.employeeId?.userId?.name}</p>
                                                <p className="text-white/40 text-xs">{a.employeeId?.department?.dep_name}</p>
                                            </div>
                                            <div className="text-right flex-shrink-0">
                                                <p className={`text-xs font-bold ${statusColor[a.status] || 'text-white/60'}`}>{a.status}</p>
                                                <p className="text-white/40 text-xs">{a.checkIn || '—'}</p>
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    </div>

                    {/* Info */}
                    <div className="bg-white/10 rounded-xl p-3 text-xs text-white/50 text-center space-y-1 border border-white/10">
                        <p>🕘 On time: before 9:00 AM</p>
                        <p>⏰ Late: 9:01 AM – 10:00 AM</p>
                        <p>📅 Half Day: after 10:00 AM</p>
                        <p className="text-white/30">Refreshes automatically every 30 seconds</p>
                    </div>
                </div>
            </div>
        </div>
    )
}
export default KioskDashboard
