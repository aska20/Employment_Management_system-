export const FACE_SERVICE_URL = import.meta.env.VITE_FACE_SERVICE_URL || 'http://localhost:5001'
export const ML_SERVICE_URL   = import.meta.env.VITE_ML_SERVICE_URL   || 'http://localhost:5002'
export const FACE_SERVICE_KEY = import.meta.env.VITE_FACE_SERVICE_KEY || 'ems-face-secret-2024'
export const ML_SERVICE_KEY   = import.meta.env.VITE_ML_SERVICE_KEY   || 'ems-ml-secret-2024'
export const faceHeaders = () => ({ 'Content-Type': 'application/json', 'X-Service-Key': FACE_SERVICE_KEY })
export const mlHeaders   = () => ({ 'Content-Type': 'application/json', 'X-Service-Key': ML_SERVICE_KEY })
