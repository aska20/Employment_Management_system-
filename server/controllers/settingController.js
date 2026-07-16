import User from "../models/User.js";
import bcrypt from 'bcrypt';
import { sendTestEmail } from '../utils/emailService.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const changePassword = async (req, res) => {
    try {
        const { userId, oldPassword, newPassword } = req.body;
        if (!newPassword || newPassword.length < 6)
            return res.status(400).json({ success: false, error: 'New password must be at least 6 characters.' });

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ success: false, error: 'User not found' });

        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) return res.status(400).json({ success: false, error: 'Current password is incorrect' });

        // Prevent reusing the same password
        const isSame = await bcrypt.compare(newPassword, user.password);
        if (isSame) return res.status(400).json({ success: false, error: 'New password must be different from your current password.' });

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await User.findByIdAndUpdate(userId, {
            password:           hashedPassword,
            mustChangePassword: false,   // ← clears the forced change flag
            isFirstLogin:       false,   // ← marks first login complete
            updatedAt:          new Date(),
        });

        return res.status(200).json({ success: true, message: 'Password changed successfully. Please log in again.' });
    } catch (error) {
        return res.status(500).json({ success: false, error: 'Setting server error' });
    }
}

/**
 * Save SMTP email config to the server .env file.
 * Admin enters their Gmail + App Password once — all emails sent from there.
 */
const saveEmailConfig = async (req, res) => {
    try {
        const { smtpEmail, smtpPassword } = req.body;
        if (!smtpEmail || !smtpPassword)
            return res.status(400).json({ success: false, error: 'Email and App Password are required.' });

        // Update process.env immediately (works for current session)
        process.env.SMTP_EMAIL    = smtpEmail;
        process.env.SMTP_PASSWORD = smtpPassword;

        // Also persist to .env file so it survives server restart
        const envPath = path.resolve(__dirname, '../../.env');
        // Create .env if it doesn't exist
        if (!fs.existsSync(envPath)) fs.writeFileSync(envPath, '');
        let envContent = '';
        try { envContent = fs.readFileSync(envPath, 'utf8'); } catch {}

        // Update or add SMTP_EMAIL
        if (envContent.includes('SMTP_EMAIL=')) {
            envContent = envContent.replace(/SMTP_EMAIL=.*/,  `SMTP_EMAIL=${smtpEmail}`)
        } else {
            envContent += `\nSMTP_EMAIL=${smtpEmail}`
        }
        // Update or add SMTP_PASSWORD
        if (envContent.includes('SMTP_PASSWORD=')) {
            envContent = envContent.replace(/SMTP_PASSWORD=.*/, `SMTP_PASSWORD=${smtpPassword}`)
        } else {
            envContent += `\nSMTP_PASSWORD=${smtpPassword}`
        }

        fs.writeFileSync(envPath, envContent);

        return res.status(200).json({ success: true, message: 'Email configuration saved.' });
    } catch (error) {
        return res.status(500).json({ success: false, error: 'Failed to save email config: ' + error.message });
    }
}

/**
 * Get current email config (only returns email, never the password).
 */
const getEmailConfig = async (req, res) => {
    return res.status(200).json({
        success:     true,
        smtpEmail:   process.env.SMTP_EMAIL || '',
        configured:  !!(process.env.SMTP_EMAIL && process.env.SMTP_PASSWORD),
    });
}

/**
 * Send a test email to verify configuration works.
 */
const testEmailConfig = async (req, res) => {
    try {
        await sendTestEmail();
        return res.status(200).json({ success: true, message: `Test email sent to ${process.env.SMTP_EMAIL}` });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
}

export { changePassword, saveEmailConfig, getEmailConfig, testEmailConfig };
