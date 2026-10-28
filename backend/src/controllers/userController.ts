import { Response, NextFunction } from 'express'
import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import User, { IUser } from '../models/User'
import Brand from '../models/Brand'
import Ticket from '../models/Ticket'
import Area from '../models/Area'
import { AuthRequest } from '../middlewares/auth'
import { leerPaginacion, armarPaginacion } from '../utils/pagination'
import { registrarEvento } from '../services/ticketEvents'
import { revocarTodos } from '../services/sesion'

const ROLES_EDITABLES: IUser['rol'][] = ['admin', 'soporte', 'usuario']
const ESTADOS_VALIDOS: IUser['estado'][] = ['activo', 'inactivo']

// Devuelve el usuario con el mismo formato que el listado: _id, sin password, marca y áreas pobladas
const findUserResponse = (id: mongoose.Types.ObjectId | string) =>
  User.findById(id).select('-password').populate('marca', 'nombre').populate('areas', 'nombre')

// Todas las áreas deben existir, ser de la marca y estar activas
const areasValidas = async (areaIds: string[], marca: mongoose.Types.ObjectId | string | undefined): Promise<boolean> => {
  if (areaIds.length === 0) return true
  const count = await Area.countDocuments({ _id: { $in: areaIds }, marca, activo: true })
  return count === new Set(areaIds).size
}

// Los tickets abiertos del soporte vuelven a la cola de su área (sin asignar, abierto)
const liberarTickets = async (
  soporteId: mongoose.Types.ObjectId,
  soporteNombre: string,
  filtroExtra: Record<string, unknown>,
  motivo: string,
  autorId: string
): Promise<void> => {
  const tickets = await Ticket.find({ asignadoA: soporteId, estado: { $ne: 'cerrado' }, ...filtroExtra })
  for (const ticket of tickets) {
    ticket.asignadoA = undefined
    ticket.estado = 'abierto'
    await ticket.save()
    await registrarEvento({
      ticket: ticket._id,
      marca: ticket.marca,
      tipo: 'desasignado',
      autor: autorId,
      de: String(soporteId),
      deNombre: soporteNombre,
      motivo
    })
  }
}

const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(10)
  return bcrypt.hash(password, salt)
}

// GET /api/users — listar usuarios (superadmin: todos · admin: los de su marca)
export const getUsers = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { rol, marca } = req.user!

    const filtro: Record<string, unknown> = rol === 'admin' ? { marca } : {}

    const consulta = User.find(filtro)
      .select('-password') // excluye el password de la respuesta
      .populate('marca', 'nombre')
      .populate('areas', 'nombre')
      .sort({ createdAt: -1, _id: -1 })

    const pag = leerPaginacion(req.query)
    if (pag) {
      const [users, total] = await Promise.all([
        consulta.skip(pag.skip).limit(pag.limit),
        User.countDocuments(filtro)
      ])
      res.status(200).json({ users, pagination: armarPaginacion(pag, total) })
      return
    }

    res.status(200).json({ users: await consulta })

  } catch (error) {
    next(error)
  }
}

// POST /api/users — superadmin crea admins, soportes y usuarios
// admin crea soportes y usuarios de su marca
export const createUser = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { nombre, email, password, rol, marcaId, areaIds } = req.body || {}

    if (!nombre || !email || !password || !rol) {
      res.status(400).json({ message: 'Nombre, email, password y rol son obligatorios' })
      return
    }

    if (!ROLES_EDITABLES.includes(rol)) {
      res.status(400).json({ message: 'Rol inválido. Debe ser admin, soporte o usuario' })
      return
    }

    if (req.user?.rol === 'admin' && rol === 'admin') {
      res.status(403).json({ message: 'Un admin no puede crear otros admins' })
      return
    }

    const existing = await User.findOne({ email })
    if (existing) {
      res.status(400).json({ message: 'Ya existe un usuario con ese email' })
      return
    }

    // La marca viene del token si es admin, del body si es superadmin
    const marcaFinal = req.user?.rol === 'admin' ? req.user?.marca : marcaId

    if (marcaFinal) {
      const brand = await Brand.findById(marcaFinal)
      if (!brand) {
        res.status(404).json({ message: 'Marca no encontrada' })
        return
      }
    }

    // Áreas: solo para soporte
    const areasFinales: string[] = rol === 'soporte' && Array.isArray(areaIds) ? areaIds : []
    if (!(await areasValidas(areasFinales, marcaFinal))) {
      res.status(400).json({ message: 'Alguna de las áreas no existe, no es de la marca o está inactiva' })
      return
    }

    const user = await User.create({
      nombre,
      email,
      password: await hashPassword(password),
      rol,
      marca: marcaFinal || undefined,
      areas: areasFinales
    })

    if (rol === 'admin' && marcaFinal) {
      await Brand.findByIdAndUpdate(marcaFinal, { admin: user._id })
    }

    res.status(201).json({
      message: 'Usuario creado exitosamente',
      user: await findUserResponse(user._id)
    })

  } catch (error) {
    next(error)
  }
}

// PATCH /api/users/:id — editar usuario
// superadmin edita a todos menos a sí mismo · admin solo soportes y usuarios de su marca
export const updateUser = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id: actorId, rol: actorRol, marca: actorMarca } = req.user!
    const { nombre, email, password, estado, rol, marcaId, areaIds } = req.body || {}

    const target = await User.findById(req.params.id)
    if (!target) {
      res.status(404).json({ message: 'Usuario no encontrado' })
      return
    }

    if (String(target._id) === actorId || target.rol === 'superadmin') {
      res.status(403).json({ message: 'No puedes editar este usuario' })
      return
    }

    if (actorRol === 'admin' && (String(target.marca) !== String(actorMarca) || target.rol === 'admin')) {
      res.status(403).json({ message: 'No puedes editar este usuario' })
      return
    }

    if (estado !== undefined && !ESTADOS_VALIDOS.includes(estado)) {
      res.status(400).json({ message: 'Estado inválido. Debe ser activo o inactivo' })
      return
    }

    if (password !== undefined && password !== '' && String(password).length < 6) {
      res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres' })
      return
    }

    const cambiaRol = rol !== undefined && rol !== target.rol
    const cambiaMarca = marcaId !== undefined && String(marcaId) !== String(target.marca)

    if (cambiaRol) {
      if (!ROLES_EDITABLES.includes(rol)) {
        res.status(400).json({ message: 'Rol inválido. Debe ser admin, soporte o usuario' })
        return
      }
      // A/desde admin solo lo decide el superadmin
      if (actorRol !== 'superadmin' && (rol === 'admin' || target.rol === 'admin')) {
        res.status(403).json({ message: 'Solo el superadmin puede asignar o quitar el rol admin' })
        return
      }
      const tieneTickets = await Ticket.exists({
        $or: [{ creadoPor: target._id }, { asignadoA: target._id }]
      })
      if (tieneTickets) {
        res.status(400).json({ message: 'No se puede cambiar el rol: el usuario tiene tickets' })
        return
      }
    }

    if (cambiaMarca) {
      if (actorRol !== 'superadmin') {
        res.status(403).json({ message: 'Solo el superadmin puede cambiar la marca' })
        return
      }
      const brand = await Brand.findById(marcaId)
      if (!brand) {
        res.status(404).json({ message: 'Marca no encontrada' })
        return
      }
    }

    // El admin asignado de una marca no cambia de rol ni de marca hasta que se asigne otro
    if ((cambiaRol || cambiaMarca) && target.rol === 'admin') {
      const esAdminDeMarca = await Brand.exists({ admin: target._id })
      if (esAdminDeMarca) {
        res.status(400).json({ message: 'Es el admin asignado de su marca: asigna otro admin antes de cambiarle rol o marca' })
        return
      }
    }

    const seDesactiva = estado === 'inactivo' && target.estado === 'activo'

    // Áreas finales: solo un soporte tiene áreas; cambiar de marca las vacía (eran de la otra marca)
    const rolFinal = cambiaRol ? rol : target.rol
    const marcaFinal = cambiaMarca ? marcaId : target.marca
    const areasAnteriores = target.areas.map(String)
    let areasFinales = areasAnteriores
    if (rolFinal !== 'soporte' || cambiaMarca) areasFinales = []
    if (rolFinal === 'soporte' && Array.isArray(areaIds)) {
      if (!(await areasValidas(areaIds, marcaFinal))) {
        res.status(400).json({ message: 'Alguna de las áreas no existe, no es de la marca o está inactiva' })
        return
      }
      areasFinales = areaIds.map(String)
    }
    const areasQuitadas = areasAnteriores.filter((a) => !areasFinales.includes(a))

    if (nombre) target.nombre = nombre
    if (email) target.email = email
    if (password) target.password = await hashPassword(password)
    if (estado) target.estado = estado
    if (cambiaRol) target.rol = rol
    if (cambiaMarca) target.marca = marcaId
    target.areas = areasFinales.map((a) => new mongoose.Types.ObjectId(a))

    await target.save()

    // Desactivado: sus sesiones abiertas (refresh tokens) dejan de servir
    if (seDesactiva) await revocarTodos(target._id)

    if (cambiaRol && rol === 'admin' && target.marca) {
      await Brand.findByIdAndUpdate(target.marca, { admin: target._id })
    }

    // Un soporte desactivado devuelve todos sus tickets abiertos a la cola;
    // si solo pierde áreas, devuelve los de esas áreas
    if (target.rol === 'soporte' || areasQuitadas.length > 0) {
      if (seDesactiva) {
        await liberarTickets(target._id, target.nombre, {}, 'Soporte desactivado', actorId)
      } else if (cambiaMarca) {
        await liberarTickets(target._id, target.nombre, {}, 'Soporte cambiado de marca', actorId)
      } else if (areasQuitadas.length > 0) {
        await liberarTickets(target._id, target.nombre, { area: { $in: areasQuitadas } }, 'Área quitada al soporte', actorId)
      }
    }

    res.status(200).json({
      message: 'Usuario actualizado exitosamente',
      user: await findUserResponse(target._id)
    })

  } catch (error) {
    next(error)
  }
}

// Escapa caracteres especiales para usar el texto del usuario dentro de una RegExp
const escapeRegex = (texto: string): string => texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// GET /api/users/search?q= — autocompletado de usuarios activos de la marca por nombre o email
// (para agregarlos como observadores). Mínimo 2 caracteres, máximo 8 resultados.
export const searchUsers = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const q = String(req.query.q || '').trim()
    if (q.length < 2) {
      res.status(200).json({ users: [] })
      return
    }

    const patron = new RegExp(escapeRegex(q), 'i')
    const users = await User.find({
      _id: { $ne: req.user!.id },
      rol: 'usuario',
      estado: 'activo',
      marca: req.user!.marca,
      $or: [{ nombre: patron }, { email: patron }]
    })
      .select('nombre email')
      .sort({ nombre: 1 })
      .limit(8)

    res.status(200).json({ users })

  } catch (error) {
    next(error)
  }
}
