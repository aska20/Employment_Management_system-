import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import { getSummary, getSalaryBreakdown, getAllSalaries } from '../controllers/dashboardController.js';

const router = express.Router();

router.get('/summary',          authMiddleware, getSummary)
router.get('/salary-breakdown', authMiddleware, getSalaryBreakdown)
router.get('/salary-all', authMiddleware, getAllSalaries)

export default router;
