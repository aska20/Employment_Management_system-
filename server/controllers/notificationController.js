import Notification from '../models/Notification.js';

// Get notifications for current user based on role
const getNotifications = async (req, res) => {
    try {
        const { _id, role } = req.user;
        let query;

    if (role === 'admin') {
    // Admin sees admin notifications only, not holiday/all broadcasts
    query = { forRole: 'admin' };
        } else {
            // Employee sees only: their own notifications OR 'all' (holidays)
            query = {
                $or: [
                    { forRole: 'all' },                              // holidays - everyone
                    { forRole: 'employee', forUserId: _id }          // their own only
                ]
            };
        }

        const notifications = await Notification.find(query)
            .sort({ createdAt: -1 })
            .limit(20);

        const unreadCount = await Notification.countDocuments({
            ...query,
            isRead: false
        });

        return res.status(200).json({ success: true, notifications, unreadCount });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};

// Mark all as read for current user
const markAllRead = async (req, res) => {
    try {
        const { _id, role } = req.user;
        let query;
        if (role === 'admin') {
            query = { forRole: { $in: ['admin', 'all'] } };
        } else {
            query = { $or: [{ forRole: 'all' }, { forRole: 'employee', forUserId: _id }] };
        }
        await Notification.updateMany(query, { isRead: true });
        return res.status(200).json({ success: true });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};

// Mark one as read
const markOneRead = async (req, res) => {
    try {
        await Notification.findByIdAndUpdate(req.params.id, { isRead: true });
        return res.status(200).json({ success: true });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};

// Internal helper - create notification
export const createNotification = async (type, message, link = '', forRole = 'admin', forUserId = null) => {
    try {
        await Notification.create({ type, message, link, forRole, forUserId });
    } catch (e) {
        console.log('Notification error:', e.message);
    }
};

export { getNotifications, markAllRead, markOneRead };
