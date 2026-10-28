// Prueba de carga: 100 usuarios simultáneos navegando la app durante 30 s contra el backend de prueba.
// Uso (con el backend de prueba corriendo, ver backend/carga/LEEME.md):
//   API_URL=http://localhost:3100 JWT_SECRET=carga npm run carga:prueba
//
// Cada petición la hace un usuario al azar, con lo que su rol haría en la app:
//   usuarios (60 %): sus tickets, el detalle de uno suyo y sus comentarios
//   soportes (30 %): su cola, detalle, comentarios, historial y tiempo por área
//   admin (10 %): lista paginada, dashboard y tendencias

import fs from 'fs'
import path from 'path'
import jwt from 'jsonwebtoken'
import autocannon from 'autocannon'

interface DatosCarga {
  admin: string
  soportes: { id: string; tickets: string[] }[]
  usuarios: { id: string; tickets: string[] }[]
}

const API = process.env.API_URL ?? 'http://localhost:3100'
const SECRETO = process.env.JWT_SECRET ?? ''
const CONEXIONES = Number(process.env.CONEXIONES) || 100
const SEGUNDOS = Number(process.env.SEGUNDOS) || 30

const alAzar = <T>(lista: readonly T[]): T => lista[Math.floor(Math.random() * lista.length)]
const token = (id: string) => jwt.sign({ id }, SECRETO, { expiresIn: 3600 })

const datos = JSON.parse(fs.readFileSync(path.join(__dirname, '.datos-carga.json'), 'utf8')) as DatosCarga
const tokens = new Map<string, string>([datos.admin, ...datos.soportes.map((s) => s.id), ...datos.usuarios.map((u) => u.id)].map((id) => [id, token(id)]))

// Qué pide cada rol (rutas reales de la app)
const peticionAlAzar = (): { ruta: string; usuario: string } => {
  const dado = Math.random()
  if (dado < 0.6) {
    const u = alAzar(datos.usuarios.filter((x) => x.tickets.length > 0))
    const ticket = alAzar(u.tickets)
    return { usuario: u.id, ruta: alAzar(['/api/tickets', `/api/tickets/${ticket}`, `/api/tickets/${ticket}/comments`]) }
  }
  if (dado < 0.9) {
    const s = alAzar(datos.soportes.filter((x) => x.tickets.length > 0))
    const ticket = alAzar(s.tickets)
    return {
      usuario: s.id,
      ruta: alAzar(['/api/tickets', `/api/tickets/${ticket}`, `/api/tickets/${ticket}/comments`, `/api/tickets/${ticket}/history`, `/api/tickets/${ticket}/tramos`])
    }
  }
  return { usuario: datos.admin, ruta: alAzar(['/api/tickets?page=1', '/api/dashboard/summary', '/api/dashboard/tendencias?dias=30']) }
}

if (!SECRETO) {
  console.error('Falta JWT_SECRET (el mismo con el que corre el backend de prueba).')
  process.exit(1)
}

console.log(`Prueba de carga: ${CONEXIONES} usuarios simultáneos durante ${SEGUNDOS} s contra ${API}…`)

const instancia = autocannon(
  {
    url: API,
    connections: CONEXIONES,
    duration: SEGUNDOS,
    requests: [{
      setupRequest: (req) => {
        const { ruta, usuario } = peticionAlAzar()
        return { ...req, method: 'GET', path: ruta, headers: { ...req.headers, authorization: `Bearer ${tokens.get(usuario)}` } }
      }
    }]
  },
  (error, r) => {
    if (error) {
      console.error(error)
      process.exit(1)
    }
    console.log('\n──── Resultado ────')
    console.log(`Peticiones atendidas:   ${r.requests.total} (${r.requests.average.toFixed(0)} por segundo)`)
    console.log(`Tiempo de respuesta:    mediana ${r.latency.p50} ms · p90 ${r.latency.p90} ms · p99 ${r.latency.p99} ms · máx ${r.latency.max} ms`)
    console.log(`Errores de conexión:    ${r.errors} · timeouts: ${r.timeouts}`)
    console.log(`Respuestas no 2xx:      ${r.non2xx}`)
    console.log('Referencia: para 100 usuarios, p90 bajo ~500 ms y 0 errores es un buen resultado.')
  }
)

autocannon.track(instancia, { renderProgressBar: true, renderResultsTable: false, renderLatencyTable: false })
