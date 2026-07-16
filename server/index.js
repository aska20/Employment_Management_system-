import express from 'express'
import cors from 'cors'
import authRouter from './routes/auth.js'
import departmentRouter from './routes/department.js'
import employeeRouter from './routes/employee.js'
import salaryRouter from './routes/salary.js'
import leaveRouter from './routes/leave.js'
import settingRouter from './routes/setting.js'
import dashboardRouter from './routes/Dashboard.js'
import attendanceRouter from './routes/attendance.js'
import notificationRouter from './routes/notification.js'
import holidayRouter from './routes/holiday.js'
import connectToDatabase from './db/db.js'
import './models/LeaveBalance.js' // register model

connectToDatabase()
const app = express()

app.set('trust proxy', 1)

// Parse allowed origins from env — supports comma-separated list
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:5174,http://localhost:3000')
    .split(',').map(o => o.trim())

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, Postman)
        // OR from any allowed origin
        // OR from any local network IP (192.168.x.x, 10.x.x.x)
        if (!origin) return callback(null, true)
        if (allowedOrigins.includes(origin)) return callback(null, true)
        // Allow any local network origin dynamically
        if (/^http:\/\/(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)/.test(origin)) return callback(null, true)
        callback(new Error('Not allowed by CORS'))
    },
    credentials: true,
}))

app.use(express.json({ limit: '10mb' }))
app.use(express.static('public/uploads'))
app.use('/api/auth',          authRouter)
app.use('/api/department',    departmentRouter)
app.use('/api/employee',      employeeRouter)
app.use('/api/salary',        salaryRouter)
app.use('/api/leave',         leaveRouter)
app.use('/api/setting',       settingRouter)
app.use('/api/dashboard',     dashboardRouter)
app.use('/api/attendance',    attendanceRouter)
app.use('/api/notifications', notificationRouter)
app.use('/api/holidays',      holidayRouter)

app.use((req, res) => res.status(404).json({ success: false, error: 'Route not found' }))

app.listen(process.env.PORT, () => console.log(`Server running on port ${process.env.PORT}`))
