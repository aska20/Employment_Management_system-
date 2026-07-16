import axios from 'axios';
import React, { createContext, useContext, useEffect, useState } from 'react'
import { API_BASE, apiUrl, fileUrl } from '../utils/apiConfig'

const userContext = createContext();

const SKIP_INTERCEPT_URLS = ['/auth/login', 'localhost:5001', 'localhost:5002', '/api/attendance/today']

const authContext = ({ children }) => {
    const [user, setUser]       = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const verifyUser = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) { setUser(null); setLoading(false); return; }
                const response = await axios.get(`${API_BASE}/api/auth/verify`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (response.data.success) setUser(response.data.user);
                else { setUser(null); localStorage.removeItem('token'); }
            } catch {
                setUser(null); localStorage.removeItem('token');
            } finally {
                setLoading(false);
            }
        };
        verifyUser();
    }, []);

    useEffect(() => {
        const interceptor = axios.interceptors.response.use(
            r => r,
            error => {
                const url = error.config?.url || ''
                const shouldSkip = SKIP_INTERCEPT_URLS.some(skip => url.includes(skip))
                if (error.response?.status === 401 && !shouldSkip) {
                    const token = localStorage.getItem('token')
                    const onLoginPage = window.location.pathname === '/login'
                    if (token && !onLoginPage) {
                        setUser(null);
                        localStorage.removeItem('token');
                        window.location.href = '/login';
                    }
                }
                return Promise.reject(error);
            }
        );
        return () => axios.interceptors.response.eject(interceptor);
    }, []);

    const login  = (userData) => setUser(userData);
    // updateUser — called after password change to clear mustChangePassword flag
    const updateUser = (updates) => setUser(prev => ({ ...prev, ...updates }));
    const logout = () => { setUser(null); localStorage.removeItem('token'); };

    return (
        <userContext.Provider value={{ user, login, logout, updateUser, loading }}>
            {children}
        </userContext.Provider>
    );
};

export const useAuth = () => useContext(userContext);
export default authContext;
