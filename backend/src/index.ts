import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import connectDB from './config/database'
import authRoutes from './routes/authRoutes'
import brandRoutes from './routes/brandRoutes'
import categoryRoutes from './routes/categoryRoutes'
import ticketRoutes from './routes/ticketRoutes'
import { errorHandler } from './middlewares/errorHandler'
import commentRoutes from './routes/commentRoutes'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

connectDB()

app.use(cors())
app.use(express.json())

app.use('/api/auth', authRoutes)
app.use('/api/brands', brandRoutes)
app.use('/api/categories', categoryRoutes)
app.use('/api/tickets', ticketRoutes)
app.use('/api/tickets/:id/comments', commentRoutes)

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'SupportDesk API running' })
})

app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})