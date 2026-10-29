import mongoose from 'mongoose'
import { z } from 'zod'

// Esquemas de entrada de cada endpoint. Los controllers mantienen sus reglas de negocio;
// aquí se garantiza la forma y los límites de los datos (tipos, largos, formatos).

// ── Piezas comunes ──────────────────────────────────────────
// `femenino`: concordancia del mensaje ("La categoría es obligatoria", "El área es obligatoria")
const obligatorio = (campo: string, femenino: boolean) => `${campo} es ${femenino ? 'obligatoria' : 'obligatorio'}`

const objectId = (campo: string, femenino = false) =>
  z.string({ error: obligatorio(campo, femenino) }).trim().refine((v) => mongoose.isValidObjectId(v), `${campo} no tiene un formato válido`)

// Id opcional: vacío ('') cuenta como "no viene"
const idOpcional = (campo: string, femenino = false) => z.preprocess((v) => (v === '' ? undefined : v), objectId(campo, femenino).optional())

const texto = (campo: string, max: number, femenino = false) =>
  z.string({ error: obligatorio(campo, femenino) }).trim().min(1, obligatorio(campo, femenino)).max(max, `${campo} no puede superar ${max} caracteres`)

const textoOpcional = (campo: string, max: number) =>
  z.string().trim().max(max, `${campo} no puede superar ${max} caracteres`).optional()

const email = z.string({ error: 'El email es obligatorio' }).trim().toLowerCase().max(254, 'El email es demasiado largo')
  .pipe(z.email('El email no es válido'))

// Contraseñas creadas o cambiadas en SupportDesk. Las de usuarios de Online Brief no pasan por aquí
// (se administran allá). Máximo 72: bcrypt ignora lo que sobra
export const passwordNueva = z.string({ error: 'La contraseña es obligatoria' })
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .max(72, 'La contraseña no puede superar 72 caracteres')
  .regex(/[A-Za-zÁÉÍÓÚáéíóúÑñ]/, 'La contraseña debe tener al menos una letra')
  .regex(/\d/, 'La contraseña debe tener al menos un número')

const PRIORIDADES = ['baja', 'media', 'alta', 'critica'] as const
const ESTADOS_TICKET = ['abierto', 'en_progreso', 'en_revision', 'cerrado', 'reabierto'] as const
const ROLES = ['admin', 'soporte', 'usuario'] as const
const ESTADOS_CUENTA = ['activo', 'inactivo'] as const

// ── Auth ────────────────────────────────────────────────────
export const esquemaLogin = z.object({
  email,
  password: z.string({ error: 'La contraseña es obligatoria' }).min(1, 'La contraseña es obligatoria').max(200, 'Contraseña inválida')
})

export const esquemaRegistro = z.object({ nombre: texto('El nombre', 100), email, password: passwordNueva })

// ── Usuarios ────────────────────────────────────────────────
export const esquemaCrearUsuario = z.object({
  nombre: texto('El nombre', 100),
  email,
  password: passwordNueva,
  rol: z.enum(ROLES, { error: 'Rol inválido. Debe ser admin, soporte o usuario' }),
  marcaId: idOpcional('La marca', true),
  areaIds: z.array(objectId('El área', true), { error: 'Las áreas no son válidas' }).max(50).optional()
})

export const esquemaEditarUsuario = z.object({
  nombre: texto('El nombre', 100).optional(),
  email: email.optional(),
  // Vacío = no cambiarla
  password: z.union([z.literal(''), passwordNueva]).optional(),
  estado: z.enum(ESTADOS_CUENTA, { error: 'Estado inválido. Debe ser activo o inactivo' }).optional(),
  rol: z.enum(ROLES, { error: 'Rol inválido. Debe ser admin, soporte o usuario' }).optional(),
  marcaId: idOpcional('La marca', true),
  areaIds: z.array(objectId('El área', true), { error: 'Las áreas no son válidas' }).max(50).optional()
})

// ── Marcas, áreas y categorías ──────────────────────────────
export const esquemaCrearMarca = z.object({ nombre: texto('El nombre de la marca', 100) })
export const esquemaEditarMarca = z.object({
  nombre: texto('El nombre de la marca', 100).optional(),
  estado: z.enum(ESTADOS_CUENTA, { error: 'Estado inválido' }).optional()
})
export const esquemaAsignarAdmin = z.object({ adminId: objectId('El admin') })

export const esquemaArea = z.object({ nombre: texto('El nombre del área', 100), descripcion: textoOpcional('La descripción', 500) })
export const esquemaEditarArea = z.object({ nombre: texto('El nombre del área', 100).optional(), descripcion: textoOpcional('La descripción', 500) })
export const esquemaEstadoArea = z.object({ activo: z.boolean({ error: 'Indica si el área queda activa' }) })

export const esquemaCrearCategoria = z.object({
  nombre: texto('El nombre de la categoría', 100),
  descripcion: textoOpcional('La descripción', 500),
  areaId: objectId('El área', true)
})
export const esquemaEditarCategoria = z.object({
  nombre: texto('El nombre de la categoría', 100).optional(),
  descripcion: textoOpcional('La descripción', 500),
  activo: z.boolean().optional(),
  areaId: idOpcional('El área', true)
})

// ── Tickets (crear y comentar llegan como multipart: todo texto) ──
export const esquemaCrearTicket = z.object({
  titulo: texto('El título', 150),
  descripcion: texto('La descripción', 5000, true),
  prioridad: z.enum(PRIORIDADES, { error: 'Prioridad inválida' }),
  categoriaId: objectId('La categoría', true),
  observadorIds: z.union([objectId('El observador'), z.array(objectId('El observador')).max(20, 'Máximo 20 observadores')]).optional()
})

export const esquemaComentario = z.object({
  contenido: z.string().trim().max(5000, 'El comentario no puede superar 5000 caracteres').optional().default('')
})

export const esquemaAsignar = z.object({ soporterId: objectId('El soporte') })
export const esquemaMover = z.object({ areaId: objectId('El área destino', true) })
export const esquemaEstadoTicket = z.object({ estado: z.enum(ESTADOS_TICKET, { error: 'Estado inválido' }) })
export const esquemaFechaLimite = z.object({
  fechaLimite: z.iso.datetime({ offset: true, error: 'La nueva fecha límite no es válida' }),
  motivo: texto('El motivo', 300)
})
export const esquemaObservador = z.object({ userId: objectId('El usuario') })
