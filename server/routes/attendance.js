import express from 'express';
import { markAttendance, markCheckout, handleEarlyExitRequest, notifyEarlyExit, runDailyAbsentCheck, getEmployeeAttendance, getDailyAttendance, getMonthlyAttendance } from '../controllers/attendanceController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/mark',                  markAttendance)
router.post('/checkout',              markCheckout)
router.post('/early-exit-action',     authMiddleware, handleEarlyExitRequest)  // admin approve/reject
router.post('/notify-early-exit',     notifyEarlyExit)  // called by face service — no auth needed (internal)
router.post('/run-absent-check',      authMiddleware, runDailyAbsentCheck)
router.get('/employee/:userId',       authMiddleware, getEmployeeAttendance)
router.get('/daily/:date',            getDailyAttendance)  // public — office attendance page
router.get('/monthly/:year/:month',   authMiddleware, getMonthlyAttendance)

export default router;
