import express, { Response } from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import connectDB from './config/database'
import authRoutes from './routes/authRoutes'
import { authenticate, AuthRequest } from './middlewares/auth'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

// Conectar a MongoDB
connectDB()

// Middlewares
app.use(cors())
app.use(express.json())

app.use('/api/auth', authRoutes) 

// Ruta de prueba
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'SupportDesk API running' })
})

// Ruta protegida de prueba
app.get('/api/protected', authenticate, (req: AuthRequest, res: Response) => {
  res.json({
    message: 'Accediste a una ruta protegida',
    user: req.user
  })
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})