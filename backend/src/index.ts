import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import connectDB from './config/database'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

// Conectar a MongoDB
connectDB()

// Middlewares
app.use(cors())
app.use(express.json())

// Ruta de prueba
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'SupportDesk API running' })
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})