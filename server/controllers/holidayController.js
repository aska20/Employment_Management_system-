import Holiday from '../models/Holiday.js';
import { createNotification } from './notificationController.js';

// Get all holidays
const getHolidays = async (req, res) => {
    try {
        const holidays = await Holiday.find().sort({ date: 1 });
        return res.status(200).json({ success: true, holidays });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};

// Add holiday
const addHoliday = async (req, res) => {
    try {
        const { name, date, description } = req.body;
        const existing = await Holiday.findOne({ date });
        if (existing) return res.status(400).json({ success: false, error: 'Holiday already declared for this date.' });

        const holiday = new Holiday({ name, date, description, declaredBy: req.user._id });
        await holiday.save();

        await createNotification(
            'holiday_declared',
            `Holiday declared: ${name} on ${new Date(date).toLocaleDateString('en-NP', { day: 'numeric', month: 'long', year: 'numeric' })}`,
            '',
            'all'
        );
        return res.status(201).json({ success: true, holiday });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};

// Delete holiday
const deleteHoliday = async (req, res) => {
    try {
        await Holiday.findByIdAndDelete(req.params.id);
        return res.status(200).json({ success: true });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};

// Check if a date is holiday
export const isHoliday = async (dateStr) => {
    const h = await Holiday.findOne({ date: dateStr });
    return h ? h.name : null;
};

export { getHolidays, addHoliday, deleteHoliday };
