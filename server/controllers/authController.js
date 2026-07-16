import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import bcrypt from 'bcrypt';

const loginAttempts = new Map();
const MAX_ATTEMPTS  = 5;
const WINDOW_MS     = 10 * 60 * 1000;
const LOCKOUT_MS    = 15 * 60 * 1000;

function checkBruteForce(ip) {
    const now  = Date.now();
    const data = loginAttempts.get(ip) || { count: 0, firstAttempt: now, lockedUntil: 0 };
    if (data.lockedUntil && now < data.lockedUntil) {
        const minutesLeft = Math.ceil((data.lockedUntil - now) / 60000);
        return { blocked: true, message: `Too many failed attempts. Try again in ${minutesLeft} minute${minutesLeft !== 1 ? 's' : ''}.` };
    }
    if (now - data.firstAttempt > WINDOW_MS) loginAttempts.set(ip, { count: 0, firstAttempt: now, lockedUntil: 0 });
    return { blocked: false };
}

function recordFailedAttempt(ip) {
    const now  = Date.now();
    const data = loginAttempts.get(ip) || { count: 0, firstAttempt: now, lockedUntil: 0 };
    data.count += 1;
    if (data.count >= MAX_ATTEMPTS) data.lockedUntil = now + LOCKOUT_MS;
    loginAttempts.set(ip, data);
    return Math.max(0, MAX_ATTEMPTS - data.count);
}

function clearAttempts(ip) { loginAttempts.delete(ip); }

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ success: false, error: 'Email and password are required.' });

        // Lockout is per EMAIL — not per IP
        // This way Manalika's lockout does not affect Seema's login
        const lockKey = email.toLowerCase().trim()
        const bf = checkBruteForce(lockKey);
        if (bf.blocked) return res.status(429).json({ success: false, error: bf.message });

        const user = await User.findOne({ email: lockKey });
        if (!user) {
            // Still count failed attempts per email to prevent enumeration
            recordFailedAttempt(lockKey);
            return res.status(401).json({ success: false, error: 'Invalid email or password.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            const remaining = recordFailedAttempt(lockKey);
            return res.status(401).json({ success: false, error: remaining > 0 ? `Invalid email or password. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.` : 'Too many failed attempts. This account is temporarily locked for 15 minutes.' });
        }

        clearAttempts(lockKey);
        const token = jwt.sign({ _id: user._id, role: user.role }, process.env.JWT_KEY, { expiresIn: '8h' });
        return res.status(200).json({
            success: true, token,
            user: { _id: user._id, name: user.name, role: user.role, profileImage: user.profileImage || null, mustChangePassword: user.mustChangePassword || false, isFirstLogin: user.isFirstLogin || false },
        });
    } catch (error) {
        return res.status(500).json({ success: false, error: 'Server error. Please try again.' });
    }
};

const verify = (req, res) => {
    const user = req.user;
    return res.status(200).json({
        success: true,
        user: {
            _id:               user._id,
            name:              user.name,
            role:              user.role,
            profileImage:      user.profileImage || null,
            mustChangePassword: user.mustChangePassword || false,
            isFirstLogin:      user.isFirstLogin || false,
        }
    });
};

export { login, verify };
