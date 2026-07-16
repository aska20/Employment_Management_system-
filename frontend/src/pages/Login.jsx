import axios from 'axios';
import React, { useState } from 'react';
import { useAuth } from '../context/authContext';
import { useNavigate, Link } from 'react-router-dom';
import { FaUsers, FaLock, FaEnvelope, FaEye, FaEyeSlash, FaExclamationTriangle } from 'react-icons/fa';
import { API_BASE, apiUrl, fileUrl } from '../utils/apiConfig'

const Login = () => {
    const [email, setEmail]           = useState('');
    const [password, setPassword]     = useState('');
    const [showPassword, setShowPass] = useState(false);
    const [error, setError]           = useState(null);
    const [loading, setLoading]       = useState(false);
    const [isLocked, setIsLocked]     = useState(false);
    const { login } = useAuth();
    const navigate  = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true); setError(null); setIsLocked(false);
        localStorage.removeItem('token'); // clear any old session first
        try {
            const r = await axios.post(`${API_BASE}/api/auth/login`, { email, password });
            if (r.data.success) {
                login(r.data.user);
                localStorage.setItem('token', r.data.token);
                // If first login or must change password — force password change first
                if (r.data.user.mustChangePassword) {
                    navigate('/change-password');
                } else {
                    navigate(r.data.user.role === 'admin' ? '/admin-dashboard' : '/employee-dashboard');
                }
            }
        } catch (err) {
            const status = err.response?.status;
            setError(err.response?.data?.error || 'Invalid credentials. Please try again.');
            if (status === 429) setIsLocked(true);
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen flex bg-stone-950">
            <div className="hidden lg:flex flex-col justify-between w-1/2 bg-gradient-to-br from-teal-900 via-teal-800 to-stone-900 p-12 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-500/5 rounded-full translate-y-1/2 -translate-x-1/2"></div>
                <div className="relative flex items-center gap-3">
                    <div className="w-10 h-10 bg-teal-500 rounded-xl flex items-center justify-center shadow-lg"><FaUsers className="text-white" /></div>
                    <span className="text-white font-bold text-xl tracking-tight">EMS Portal</span>
                </div>
                <div className="relative">
                    <h1 className="text-5xl font-extrabold text-white leading-tight mb-4 tracking-tight">Employee<br />Management<br />System</h1>
                   
                </div>
                <p className="relative text-teal-500/50 text-xs"></p>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center px-8 bg-stone-950">
                <div className="w-full max-w-sm">
                    <div className="mb-8 text-center">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg transition ${isLocked ? 'bg-red-700' : 'bg-teal-600'}`}>
                            <FaLock className="text-white text-xl" />
                        </div>
      <h2 className="text-2xl font-extrabold text-white tracking-tight">{isLocked ? 'Account Locked' : 'Login'}</h2>
<p className="text-stone-500 text-sm mt-1">{isLocked ? 'Too many failed attempts' : 'Enter your credentials'}</p>
                    </div>

                    {error && (
                        <div className={`mb-5 p-3.5 border rounded-xl text-sm flex items-start gap-2 ${isLocked ? 'bg-red-950/50 border-red-700/50 text-red-300' : 'bg-red-900/30 border-red-700/50 text-red-300'}`}>
                            <FaExclamationTriangle className="flex-shrink-0 mt-0.5 text-red-400" /><span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-stone-400 text-xs font-bold mb-1.5 uppercase tracking-wider">Email Address</label>
                            <div className="relative">
                                <FaEnvelope className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-600 text-xs" />
                                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required disabled={isLocked || loading}
                                    placeholder="example@gmail.com"
                                    className="w-full pl-9 pr-4 py-3 bg-stone-800 border border-stone-700 rounded-xl text-white placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm transition disabled:opacity-50 disabled:cursor-not-allowed" />
                            </div>
                        </div>
<div>
    <label className="block text-stone-400 text-xs font-bold mb-1.5 uppercase tracking-wider">Password</label>
    <div className="relative">
        <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required disabled={isLocked || loading}
            placeholder="••••••••"
className="w-full pl-4 pr-10 py-3 bg-stone-800 border border-stone-700 rounded-xl text-white placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm transition disabled:opacity-50 disabled:cursor-not-allowed [&::-ms-reveal]:hidden [&::-webkit-credentials-auto-fill-button]:hidden" />
        <button type="button" onClick={() => setShowPass(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300 transition" tabIndex={-1}>
            {showPassword ? <FaEyeSlash /> : <FaEye />}
        </button>
    </div>
</div>
                        <button type="submit" disabled={loading || isLocked}
                            className="w-full bg-teal-600 hover:bg-teal-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition shadow-lg text-sm mt-2">
                            {loading ? <span className="flex items-center justify-center gap-2"><span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span> Logging in...</span>
                                     : isLocked ? 'Access Temporarily Locked' : 'Login'}
                        </button>
                    </form>

                   
                    <div className="mt-7 p-4 bg-stone-800/60 border border-stone-700/50 rounded-xl text-center">
                        <p className="text-stone-500 text-xs mb-2">Mark attendance</p>
                        <Link to="/attendance" className="inline-flex items-center gap-2 text-teal-400 hover:text-teal-300 font-semibold text-sm transition">
                            <FaUsers className="text-xs" /> Open Attendance Scanner
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};
export default Login;
