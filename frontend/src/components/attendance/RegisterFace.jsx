import React, { useRef, useState, useEffect } from 'react'
import axios from 'axios'
import { FACE_SERVICE_URL, faceHeaders } from '../../utils/serviceConfig'
import { FaCamera, FaStop, FaUserPlus, FaCheckCircle } from 'react-icons/fa'
import { API_BASE, apiUrl, fileUrl } from '../../utils/apiConfig'

const RegisterFace = () => {
    const videoRef = useRef(null)
    const canvasRef = useRef(null)
    const [stream, setStream] = useState(null)
    const [employees, setEmployees] = useState([])
    const [selectedEmployee, setSelectedEmployee] = useState('')
    const [captures, setCaptures] = useState([])
    const [status, setStatus] = useState('idle')
    const [message, setMessage] = useState('')

    useEffect(() => {
        axios.get(`${API_BASE}/api/employee`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }).then(r => { if (r.data.success) setEmployees(r.data.employees) }).catch(console.error)
        return () => { if (stream) stream.getTracks().forEach(t => t.stop()) }
    }, [])

    const startCamera = async () => {
        if (!selectedEmployee) { setMessage(' Please select an employee first.'); return }
        try {
            const s = await navigator.mediaDevices.getUserMedia({ video: true })
            videoRef.current.srcObject = s
            videoRef.current.play()
            setStream(s)
            setStatus('ready')
            setCaptures([])
        
        } catch { setStatus('error'); setMessage('Could not access camera.') }
    }

    const stopCamera = () => {
        if (stream) stream.getTracks().forEach(t => t.stop())
        setStream(null); setStatus('idle')
    }

    const capturePhoto = () => {
        const canvas = canvasRef.current
        canvas.width = videoRef.current.videoWidth
        canvas.height = videoRef.current.videoHeight
        canvas.getContext('2d').drawImage(videoRef.current, 0, 0)
        const img = canvas.toDataURL('image/jpeg', 0.85)
        setCaptures(prev => [...prev, img])
        setMessage(` ${captures.length + 1} photo(s) captured. ${captures.length < 2 ? 'Capture more for better accuracy.' : 'You can register now.'}`)
    }

    const registerFace = async () => {
        if (!selectedEmployee) { setMessage('Please select an employee.'); return }
        if (captures.length === 0) { setMessage('Please capture at least one photo.'); return }
        setStatus('loading')
        setMessage('Registering face embeddings...')
        try {
            const res = await axios.post(`${FACE_SERVICE_URL}/register`, { employeeId: selectedEmployee, images: captures }, { headers: faceHeaders() })
            if (res.data.success) {
                setStatus('success')
                setMessage(` ${res.data.message}`)
                setCaptures([])
                stopCamera()
            } else {
                setStatus('error')
                setMessage(` ${res.data.error || 'Registration failed. No clear face detected.'}`)
            }
        } catch {
            setStatus('error')
            setMessage(' Cannot connect to face service on port 5001.')
        }
    }

    return (
        <div className="p-6 bg-stone-50 min-h-full">
            <div className="max-w-xl mx-auto">
                <div className="mb-5">
                    <h2 className="text-2xl font-bold text-stone-800">Register Employee Face</h2>
                  
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6">
                    <div className="mb-5">
                        <label className="block text-sm font-semibold text-stone-700 mb-1.5">Select Employee</label>
                        <select value={selectedEmployee} onChange={e => setSelectedEmployee(e.target.value)}
                            className="w-full p-3 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-stone-50">
                            <option value="">-- Choose Employee --</option>
                            {employees.map(emp => (
                                <option key={emp._id} value={emp.employeeId}>
                                    {emp.userId?.name} ({emp.employeeId})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="bg-stone-900 rounded-xl overflow-hidden mb-4 relative" style={{ minHeight: 240 }}>
                        <video ref={videoRef} className="w-full rounded-xl" style={{ display: stream ? 'block' : 'none' }} />
                        {!stream && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-stone-500">
                                <FaCamera className="text-5xl opacity-20 mb-3" />
                                <p className="text-sm">Camera not started</p>
                            </div>
                        )}
                        <canvas ref={canvasRef} className="hidden" />
                    </div>

                    {/* Thumbnails */}
                    {captures.length > 0 && (
                        <div className="flex gap-2 mb-4 flex-wrap">
                            {captures.map((img, i) => (
                                <div key={i} className="relative">
                                    <img src={img} alt="" className="w-14 h-14 object-cover rounded-lg border-2 border-teal-400" />
                                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-teal-500 text-white text-xs rounded-full flex items-center justify-center font-bold">{i+1}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex gap-2 mb-4">
                        {!stream ? (
                            <button onClick={startCamera} className="flex-1 flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 rounded-xl text-sm transition">
                                <FaCamera /> Start Camera
                            </button>
                        ) : (
                            <>
                                <button onClick={capturePhoto} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl text-sm transition">
                                     Capture Photo
                                </button>
                                <button onClick={registerFace} disabled={status === 'loading' || captures.length === 0}
                                    className="flex-1 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-sm transition flex items-center justify-center gap-2">
                                    {status === 'loading' ? ' Registering...' : <><FaUserPlus /> Register Face</>}
                                </button>
                                <button onClick={stopCamera} className="px-4 bg-stone-200 hover:bg-stone-300 text-stone-600 rounded-xl transition">
                                    <FaStop />
                                </button>
                            </>
                        )}
                    </div>

                    {message && (
                        <div className={`p-4 rounded-xl text-sm font-medium ${
                            status === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' :
                            status === 'error' ? 'bg-red-50 border border-red-200 text-red-800' :
                            'bg-teal-50 border border-teal-200 text-teal-800'}`}>
                            {message}
                        </div>
                    )}

                </div>
            </div>
        </div>
    )
}
export default RegisterFace
