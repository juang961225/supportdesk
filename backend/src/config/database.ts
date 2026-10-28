import mongoose from 'mongoose'

// Cada consulta paga al menos este tiempo de ida y vuelta: sirve para saber si la lentitud es la red
const latenciaPromedio = async (): Promise<number> => {
  const db = mongoose.connection.db
  if (!db) return 0
  let total = 0
  for (let i = 0; i < 3; i++) {
    const inicio = Date.now()
    await db.admin().ping()
    total += Date.now() - inicio
  }
  return Math.round(total / 3)
}

const connectDB = async (): Promise<void> => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI as string)
    console.log(`MongoDB connected: ${conn.connection.host}`)
    console.log(`Latencia a MongoDB (promedio de 3 pings): ${await latenciaPromedio()} ms`)
  } catch (error) {
    console.error('MongoDB connection error:', error)
    process.exit(1)
  }
}

export default connectDB