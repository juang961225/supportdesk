import http from 'http'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'
import connectDB from './config/database'
import authRoutes from './routes/authRoutes'
import brandRoutes from './routes/brandRoutes'
import categoryRoutes from './routes/categoryRoutes'
import ticketRoutes from './routes/ticketRoutes'
import { errorHandler } from './middlewares/errorHandler'
import commentRoutes from './routes/commentRoutes'
import userRoutes from './routes/userRoutes'
import areaRoutes from './routes/areaRoutes'
import dashboardRoutes from './routes/dashboardRoutes'
import horarioRoutes from './routes/horarioRoutes'
import { origenesFrontend } from './config/origenes'
import { iniciarTiempoReal } from './services/tiempoReal'
import { configurarMedicion, medirPeticiones } from './middlewares/medicion'
import { revisarEntorno } from './config/entorno'

dotenv.config()

// Arranque seguro: sin las variables mínimas (o con un JWT_SECRET débil en producción) no se arranca
const revision = revisarEntorno(process.env)
revision.avisos.forEach((aviso) => console.warn(`⚠️  ${aviso}`))
if (revision.errores.length > 0) {
  revision.errores.forEach((error) => console.error(`❌ ${error}`))
  process.exit(1)
}

configurarMedicion()

const app = express()
const PORT = process.env.PORT || 3000

connectDB()

// Detrás de un proxy (producción): cuántos saltos confiar para leer la IP real del cliente (límites de intentos)
app.set('trust proxy', Number(process.env.TRUST_PROXY) || false)

// Cabeceras de seguridad (sin X-Powered-By, nosniff, HSTS, etc.)
app.use(helmet())

// Solo el frontend propio, con credenciales (la cookie de sesión)
app.use(cors({ origin: origenesFrontend(), credentials: true }))
app.use(express.json({ limit: '100kb' })) // los adjuntos van por multipart, no por JSON
app.use(medirPeticiones)

app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/areas', areaRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/horario', horarioRoutes)
app.use('/api/brands', brandRoutes)
app.use('/api/categories', categoryRoutes)
app.use('/api/tickets', ticketRoutes)
app.use('/api/tickets/:id/comments', commentRoutes)

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'SupportDesk API running' })
})

app.use(errorHandler)

// Un solo servidor HTTP para el API y el tiempo real (Socket.io)
const servidor = http.createServer(app)
iniciarTiempoReal(servidor)

servidor.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})