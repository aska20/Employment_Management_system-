/**
 * Central API configuration.
 * All API URLs come from here — change once, works everywhere.
 *
 * For local development:   leave as is (uses localhost)
 * For office network:      set VITE_API_URL in frontend/.env
 * For production/internet: set VITE_API_URL to your domain
 */

export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export const apiUrl = (path) => `${API_BASE}${path}`

export const fileUrl = (path) => path ? `${API_BASE}/${path}` : null
