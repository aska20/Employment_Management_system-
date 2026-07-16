import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import { changePassword, saveEmailConfig, getEmailConfig, testEmailConfig } from '../controllers/settingController.js';

const router = express.Router()

router.put('/change-password',  authMiddleware, changePassword)
router.post('/email-config',    authMiddleware, saveEmailConfig)
router.get('/email-config',     authMiddleware, getEmailConfig)
router.post('/test-email',      authMiddleware, testEmailConfig)

export default router
