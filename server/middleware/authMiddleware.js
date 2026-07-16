import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const verifyUser = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer '))
            return res.status(401).json({ success: false, error: 'No token provided. Please log in.' });

        const token = authHeader.split(' ')[1];
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_KEY);
        } catch (err) {
            if (err.name === 'TokenExpiredError')
                return res.status(401).json({ success: false, error: 'Session expired. Please log in again.', expired: true });
            return res.status(401).json({ success: false, error: 'Invalid token. Please log in again.' });
        }

        const user = await User.findById(decoded._id).select('-password');
        if (!user) return res.status(401).json({ success: false, error: 'User account not found.' });

        req.user = user;
        next();
    } catch (error) {
        return res.status(500).json({ success: false, error: 'Authentication error.' });
    }
};

export default verifyUser;
