import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import connectDB from './config/database'
import authRoutes from './routes/authRoutes'
import brandRoutes from './routes/brandRoutes'
import categoryRoutes from './routes/categoryRoutes'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

connectDB()

app.use(cors())
app.use(express.json())

app.use('/api/auth', authRoutes)
app.use('/api/brands', brandRoutes)
app.use('/api/categories', categoryRoutes)

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'SupportDesk API running' })
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})