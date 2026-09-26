import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import dotenv from 'dotenv'
import healthRoutes from './routes/health.js'
import authRoutes from './routes/auth.js'
import adminRoutes from './routes/admin.js'
import studentRoutes from './routes/student.js'
import specialRoutes from './routes/special.js'
import publicRoutes from './routes/public.js'
import { errorHandler } from './middleware/errorHandler.js'
import { authenticateUser } from './middleware/auth.js'

dotenv.config()

const app = express()

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}))

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}))

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: 'Too many requests, please try again later.'
  }
})

app.use('/api/', limiter)

app.use('/api/health', healthRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/admin', authenticateUser, adminRoutes)
app.use('/api/student', authenticateUser, studentRoutes)
app.use('/api/special', authenticateUser, specialRoutes)
app.use('/api', publicRoutes)

app.use(errorHandler)

export default app