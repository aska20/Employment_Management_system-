import express from 'express'
import authMiddleware from '../middleware/authMiddleware.js'
import {
    addLeave, getLeave, getLeaveDetail, getLeaves,
    updateLeave, getLeavesByEmployee,
    getLeaveBalance, checkLeaveValidation, getAllBalances
} from '../controllers/leaveController.js'

const router = express.Router()

router.post('/add',              authMiddleware, addLeave)
router.post('/validate',         authMiddleware, checkLeaveValidation)
router.get('/balance/:userId',   authMiddleware, getLeaveBalance)
router.get('/all-balances',      authMiddleware, getAllBalances)
router.get('/detail/:id',        authMiddleware, getLeaveDetail)
router.get('/employee/:empId',   authMiddleware, getLeavesByEmployee)
router.get('/:id/:role',         authMiddleware, getLeave)
router.get('/',                  authMiddleware, getLeaves)
router.put('/:id',               authMiddleware, updateLeave)

export default router
