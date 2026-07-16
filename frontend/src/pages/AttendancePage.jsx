import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import {
    FaCamera, FaSignInAlt, FaSignOutAlt, FaStop,
    FaCheckCircle, FaTimesCircle, FaExclamationTriangle,
    FaUserCheck, FaUsers, FaClock, FaLock, FaRunning, FaPaperPlane
} from 'react-icons/fa'
import { FACE_SERVICE_URL, faceHeaders } from '../utils/serviceConfig'
import { API_BASE } from '../utils/apiConfig'

const getLocalToday = () => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`
}

const AttendancePage = () => {
    const navigate     = useNavigate()
    const videoRef     = useRef(null)
    const canvasRef    = useRef(null)
    const dateRef      = useRef(getLocalToday())

    const [stream, setStream]               = useState(null)
    const [mode, setMode]                   = useState('checkin')
    const [scanStatus, setScanStatus]       = useState('idle')
    const [message, setMessage]             = useState('')
    const [todayList, setTodayList]         = useState([])
    const [currentTime, setCurrentTime]     = useState(new Date())
    const [loading, setLoading]             = useState(false)
    const [showReasonBox, setShowReasonBox] = useState(false)
    const [earlyReason, setEarlyReason]     = useState('')
    const [pendingCheckout, setPendingCheckout] = useState(null)
    const [workedInfo, setWorkedInfo]       = useState(null)
    const [requestSent, setRequestSent]     = useState(false)

    useEffect(() => {
        const t = setInterval(() => {
            const now = new Date(); setCurrentTime(now)
            const today = getLocalToday()
            if (today !== dateRef.current) {
                dateRef.current = today
                setTodayList([]); setScanStatus('idle'); setMessage('')
                setShowReasonBox(false); setPendingCheckout(null); setMode('checkin')
                stopCameraClean(); fetchToday(today)
            }
        }, 1000)
        return () => clearInterval(t)
    }, [])

    useEffect(() => {
        fetchToday(getLocalToday())
        const t = setInterval(() => fetchToday(getLocalToday()), 30000)
        return () => clearInterval(t)
    }, [])

    useEffect(() => () => { if (stream) stream.getTracks().forEach(t => t.stop()) }, [stream])

    const fetchToday = async (date) => {
        try {
            const r = await axios.get(`${API_BASE}/api/attendance/daily/${date || getLocalToday()}`)
            if (r.data.success) setTodayList(r.data.attendance)
        } catch {}
    }

    const stopCameraClean = () => {
        if (videoRef.current?.srcObject) {
            videoRef.current.srcObject.getTracks().forEach(t => t.stop())
            videoRef.current.srcObject = null
        }
    }

    const startCamera = async () => {
        try {
            const s = await navigator.mediaDevices.getUserMedia({ video: { width: 480, height: 360, facingMode: 'user' } })
            videoRef.current.srcObject = s; videoRef.current.play()
            setStream(s); setScanStatus('ready'); setResult(null)
            setMessage('Face the camera and click Scan')
        } catch {
            setScanStatus('error')
            setMessage('Camera access denied. Allow camera permissions in browser settings.')
        }
    }

    const stopCamera = () => {
        if (stream) stream.getTracks().forEach(t => t.stop())
        setStream(null); setScanStatus('idle'); setMessage(''); setResult(null)
        setShowReasonBox(false); setPendingCheckout(null); setRequestSent(false)
    }

    const [result, setResult] = useState(null)

    const scan = useCallback(async () => {
        if (!videoRef.current || !canvasRef.current) return
        setScanStatus('processing'); setMessage('Scanning - hold still...'); setResult(null); setLoading(true)
        const canvas = canvasRef.current
        canvas.width  = videoRef.current.videoWidth
        canvas.height = videoRef.current.videoHeight
        canvas.getContext('2d').drawImage(videoRef.current, 0, 0)
        const imageData = canvas.toDataURL('image/jpeg', 0.85)
        const endpoint  = mode === 'checkin' ? `${FACE_SERVICE_URL}/recognize` : `${FACE_SERVICE_URL}/checkout`
        try {
            const res  = await axios.post(endpoint, { image: imageData }, { headers: faceHeaders() })
            const data = res.data
            if (data.success && !data.alreadyMarked && !data.alreadyCheckedOut) {
                if (data.needsEarlyExitReason) {
                    setScanStatus('warning'); setWorkedInfo(data)
                    setPendingCheckout(data.employeeId); setShowReasonBox(true)
                    setMessage(data.message); setLoading(false); return
                }
                setScanStatus('success'); setResult(data)
                const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
                setMessage(mode === 'checkin' ? `Welcome ${data.employeeName}! Checked in at ${timeStr}` : `Goodbye ${data.employeeName}! Checked out.`)
                stopCamera(); fetchToday(getLocalToday())
                setTimeout(() => { setScanStatus('idle'); setMessage(''); setResult(null) }, 5000)
            } else if (data.alreadyMarked) {
                setScanStatus('warning')
                setMessage(`${data.employeeName} - already checked in today at ${data.checkIn}`)
            } else if (data.alreadyCheckedOut) {
                setScanStatus('warning')
                setMessage(`${data.employeeName} - already checked out${data.checkOut && data.checkOut !== 'pending approval' ? ` at ${data.checkOut}` : data.checkOut === 'pending approval' ? ' (pending admin approval)' : ''}`)
            } else {
                setScanStatus('error'); setMessage(data.message || 'Face not recognized.')
            }
        } catch {
            setScanStatus('error')
            setMessage('Cannot connect to face recognition service. Start the Python service (port 5001).')
        }
        setLoading(false)
    }, [stream, mode])

    const submitEarlyExitRequest = async () => {
        if (!earlyReason.trim()) { alert('Please enter a reason.'); return }
        setLoading(true)
        try {
            const res = await axios.post(`${FACE_SERVICE_URL}/checkout`, {
                employeeId: pendingCheckout, earlyExitReason: earlyReason,
            }, { headers: faceHeaders() })
            if (res.data.success) {
                setRequestSent(true); setShowReasonBox(false); setScanStatus('warning')
                setMessage('Early exit request sent to admin. Please wait for approval before leaving.')
                fetchToday(getLocalToday()); setTimeout(() => stopCamera(), 6000)
            }
        } catch { setMessage('Failed to send request. Try again.') }
        setLoading(false)
    }

    const checkedIn  = todayList.filter(a => a.checkIn && !a.checkOut).length
    const checkedOut = todayList.filter(a => a.checkIn && a.checkOut).length
    const absent     = todayList.filter(a => a.status === 'Absent').length

    const msgBg = {
        success:    'bg-emerald-900/40 border-emerald-600/40 text-emerald-200',
        error:      'bg-red-900/40 border-red-600/40 text-red-200',
        warning:    'bg-amber-900/40 border-amber-600/40 text-amber-200',
        processing: 'bg-teal-900/40 border-teal-600/40 text-teal-200',
        ready:      'bg-stone-800 border-stone-600 text-stone-400',
    }

    const time = currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    const day  = currentTime.toLocaleDateString('en-NP', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })

    const getStatusLabel = (a) => {
        if (a.earlyExitStatus === 'pending')  return { label: 'Pending exit', color: 'text-amber-400' }
        if (a.checkIn && a.checkOut) return { label: 'Out', color: 'text-stone-400' }
        const sc = { Present: 'text-emerald-400', Late: 'text-amber-400', 'Half Day': 'text-orange-400', Absent: 'text-red-400' }
        return { label: a.status, color: sc[a.status] || 'text-stone-400' }
    }

    return (
        <div className="h-screen bg-stone-900 flex flex-col overflow-hidden">

            {/* Top Bar — compact */}
            <div className="flex items-center justify-between px-6 py-3 bg-stone-800 border-b border-stone-700 flex-shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center">
                        <FaUsers className="text-white text-sm" />
                    </div>
                    <div>
                        <p className="text-white font-bold text-sm leading-tight">EMS Attendance</p>
                        <p className="text-stone-500 text-xs">{day}</p>
                    </div>
                </div>
                <p className="text-white text-xl font-mono font-bold tracking-wider">{time}</p>
                <button onClick={() => navigate('/login')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-700 hover:bg-teal-600 text-white text-xs font-semibold rounded-lg transition">
                    <FaLock className="text-xs" /> Staff Login
                </button>
            </div>

            {/* Main content — fills remaining height */}
            <div className="flex-1 flex min-h-0">

                {/* Left Panel — Scanner */}
               <div className="w-[70%] flex flex-col gap-3 p-4 min-h-0">

                    {/* Mode tabs */}
                    <div className="flex gap-2 p-1 bg-stone-800 rounded-xl border border-stone-700 flex-shrink-0">
                        <button onClick={() => { setMode('checkin'); stopCamera() }}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-bold text-sm transition ${mode === 'checkin' ? 'bg-teal-600 text-white' : 'text-stone-400 hover:text-white'}`}>
                            <FaSignInAlt className="text-xs" /> Check In
                        </button>
                        <button onClick={() => { setMode('checkout'); stopCamera() }}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-bold text-sm transition ${mode === 'checkout' ? 'bg-amber-600 text-white' : 'text-stone-400 hover:text-white'}`}>
                            <FaSignOutAlt className="text-xs" /> Check Out
                        </button>
                    </div>

                    {/* Camera — fixed compact height */}
                  <div className="relative bg-stone-900 rounded-xl overflow-hidden border border-stone-700 mx-auto w-full max-w-[420px] aspect-[4/3]">
    <video ref={videoRef} className="w-full h-full object-cover scale-x-[-1]"
                        style={{ display: stream ? "block" : "none" }} />
                        {!stream && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-stone-600">
                                <FaCamera className="text-5xl mb-2 opacity-20" />
                                <p className="text-stone-500 text-sm">Camera not started</p>
                                <p className="text-stone-600 text-xs mt-0.5">Click Start Camera below</p>
                            </div>
                        )}
                        {stream && (
                            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                                <div className="w-36 h-44 border-2 border-teal-500/50 rounded-2xl"></div>
                                <div className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-teal-400 rounded-tl-lg"></div>
                                <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-teal-400 rounded-tr-lg"></div>
                                <div className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-teal-400 rounded-bl-lg"></div>
                                <div className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-teal-400 rounded-br-lg"></div>
                            </div>
                        )}
                        {scanStatus === 'processing' && (
                            <div className="absolute inset-0 bg-stone-900/60 flex flex-col items-center justify-center">
                                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-400 mb-2"></div>
                                <p className="text-white text-sm">Scanning...</p>
                            </div>
                        )}
                        {scanStatus === 'success' && (
                            <div className="absolute inset-0 bg-emerald-900/40 flex items-center justify-center">
                                <FaCheckCircle className="text-emerald-400 text-6xl" />
                            </div>
                        )}
                    </div>
                    <canvas ref={canvasRef} className="hidden" />

                    {/* Buttons */}
                    <div className="flex gap-2 flex-shrink-0">
                        {!stream ? (
                            <button onClick={startCamera}
                                className="flex-1 flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-500 text-white font-bold py-3 rounded-xl text-sm transition">
                                <FaCamera /> Start Camera
                            </button>
                        ) : (
                            <>
                                <button onClick={scan} disabled={loading || showReasonBox}
                                    className={`flex-1 flex items-center justify-center gap-2 font-bold py-3 rounded-xl text-white text-sm transition disabled:opacity-50 ${mode === 'checkin' ? 'bg-teal-600 hover:bg-teal-500' : 'bg-amber-600 hover:bg-amber-500'}`}>
                                    {loading ? 'Processing...' : `Scan & ${mode === 'checkin' ? 'Check In' : 'Check Out'}`}
                                </button>
                                <button onClick={stopCamera}
                                    className="px-4 bg-stone-700 hover:bg-stone-600 text-stone-300 rounded-xl transition">
                                    <FaStop />
                                </button>
                            </>
                        )}
                    </div>

                    {/* Status message */}
                    {message && !showReasonBox && (
                        <div className={`p-3 rounded-xl border text-xs font-medium text-center flex-shrink-0 ${msgBg[scanStatus] || 'bg-stone-800 border-stone-600 text-stone-300'}`}>
                            {message}
                        </div>
                    )}

                    {/* Early exit reason form */}
                    {showReasonBox && (
                        <div className="bg-amber-900/30 border border-amber-600/40 rounded-xl p-4 flex-shrink-0">
                            <p className="text-amber-200 font-bold text-xs mb-1 flex items-center gap-1.5">
                                <FaRunning /> Early Exit - Admin Approval Required
                            </p>
                            {workedInfo && (
                                <p className="text-amber-300/80 text-xs mb-2">
                                    Worked {workedInfo.workedHours}h {workedInfo.workedMins}m of 8h required. Admin must approve.
                                </p>
                            )}
                            <textarea value={earlyReason} onChange={e => setEarlyReason(e.target.value)}
                                placeholder="Enter reason for early exit..."
                                className="w-full bg-stone-800 border border-stone-600 text-white rounded-lg p-2.5 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-amber-500"
                                rows={2} />
                            <div className="flex gap-2 mt-2">
                                <button onClick={submitEarlyExitRequest} disabled={loading}
                                    className="flex-1 flex items-center justify-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold py-2 rounded-lg text-xs transition disabled:opacity-50">
                                    <FaPaperPlane className="text-xs" /> Send to Admin
                                </button>
                                <button onClick={() => { setShowReasonBox(false); stopCamera() }}
                                    className="px-3 bg-stone-700 hover:bg-stone-600 text-stone-300 rounded-lg text-xs transition">
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Rules — compact horizontal */}
                    <div className="grid grid-cols-2 gap-2 flex-shrink-0">
                        {[
                            ['Present', 'Before 9:00 AM'],
                            ['Late', '9:01-10:00 AM'],
                            ['Half Day', 'After 10:00 AM'],
                            ['Min 8hrs', 'Required/day'],
                        ].map(([label, desc]) => (
                            <div key={label} className="bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-teal-500 flex-shrink-0"></div>
                                <div>
                                    <p className="text-stone-200 text-xs font-semibold leading-none">{label}</p>
                                    <p className="text-stone-500 text-xs leading-none mt-0.5">{desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Panel — Today's List */}
 <div className="w-[30%] bg-stone-800 border-l border-stone-700 flex flex-col min-h-0">
                    {/* Stats */}
                    <div className="grid grid-cols-3 border-b border-stone-700 flex-shrink-0">
                        {[
                            { label: 'In',     val: checkedIn,  color: 'text-emerald-400', bg: 'bg-emerald-900/20' },
                            { label: 'Out',    val: checkedOut, color: 'text-amber-400',   bg: 'bg-amber-900/20'   },
                            { label: 'Absent', val: absent,     color: 'text-red-400',     bg: 'bg-red-900/20'     },
                        ].map(s => (
                            <div key={s.label} className={`${s.bg} border-r border-stone-700 last:border-0 text-center py-3`}>
                                <p className={`text-xl font-bold ${s.color}`}>{s.val}</p>
                                <p className="text-stone-500 text-xs">{s.label}</p>
                            </div>
                        ))}
                    </div>

                    <div className="px-4 py-2.5 border-b border-stone-700 flex items-center gap-2 flex-shrink-0">
                        <FaUserCheck className="text-teal-400 text-xs" />
                        <p className="text-stone-300 font-semibold text-xs">Today - {getLocalToday()}</p>
                        <span className="ml-auto text-xs bg-teal-900/50 text-teal-400 px-2 py-0.5 rounded-full">{checkedIn} in</span>
                    </div>

                    {/* List — scrollable */}
                    <div className="flex-1 overflow-y-auto">
                        {todayList.length === 0 ? (
                            <div className="text-center py-8 text-stone-600">
                                <FaUsers className="text-3xl mx-auto mb-2 opacity-20" />
                                <p className="text-xs">No check-ins yet</p>
                            </div>
                        ) : todayList.map(a => {
                            const { label, color } = getStatusLabel(a)
                            return (
                                <div key={a._id} className="flex items-center gap-2.5 px-4 py-2.5 border-b border-stone-700/50 hover:bg-stone-700/30 transition">
                                    <img
                                        src={`${API_BASE}/${a.employeeId?.userId?.profileImage}`}
                                        className="w-8 h-8 rounded-lg object-cover border border-stone-600 flex-shrink-0"
                                        onError={e => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(a.employeeId?.userId?.name||'E')}&background=0f766e&color=fff&size=32` }}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-stone-200 font-semibold text-xs truncate">{a.employeeId?.userId?.name}</p>
                                        <p className="text-stone-500 text-xs">{a.employeeId?.department?.dep_name}</p>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <p className={`text-xs font-bold ${color}`}>{label}</p>
                                        <p className="text-stone-500 text-xs">
                                            {a.checkOut ? `${a.checkIn}→${a.checkOut}` : a.checkIn || '-'}
                                        </p>
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    <div className="px-4 py-2 border-t border-stone-700 flex-shrink-0">
                        <p className="text-stone-600 text-xs text-center">Auto-refreshes every 30s</p>
                    </div>
                </div>
            </div>
        </div>
    )
}
export default AttendancePage
