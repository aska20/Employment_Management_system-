import express from 'express';
import { getNotifications, markAllRead, markOneRead } from '../controllers/notificationController.js';
import authMiddleware from '../middleware/authMiddleware.js';
const router = express.Router();
router.get('/', authMiddleware, getNotifications);
router.put('/read-all', authMiddleware, markAllRead);
router.put('/read/:id', authMiddleware, markOneRead);
export default router;
