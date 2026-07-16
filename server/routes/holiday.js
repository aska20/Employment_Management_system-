import express from 'express';
import { getHolidays, addHoliday, deleteHoliday } from '../controllers/holidayController.js';
import authMiddleware from '../middleware/authMiddleware.js';
const router = express.Router();
router.get('/', authMiddleware, getHolidays);
router.post('/add', authMiddleware, addHoliday);
router.delete('/:id', authMiddleware, deleteHoliday);
export default router;
