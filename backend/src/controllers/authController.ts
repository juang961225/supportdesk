import { Request, Response, NextFunction } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import User from '../models/User'
import Brand from '../models/Brand'
import { AuthRequest } from '../middlewares/auth'

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { nombre, email, password } = req.body

    if (!nombre || !email || !password) {
      res.status(400).json({ message: 'Nombre, email y password son obligatorios' })
      return
    }

    // Verificar que no exista ya un superadmin
    // Solo puede haber uno en todo el sistema
    const superadminExiste = await User.findOne({ rol: 'superadmin' })
    if (superadminExiste) {
      res.status(403).json({ message: 'Ya existe un superadmin en el sistema' })
      return
    }

    const existingUser = await User.findOne({ email })
    if (existingUser) {
      res.status(400).json({ message: 'Ya existe un usuario con ese email' })
      return
    }

    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)

    const user = await User.create({
      nombre,
      email,
      password: hashedPassword,
      rol: 'superadmin'
    })

    res.status(201).json({
      message: 'Superadmin creado exitosamente',
      user: {
        id: user._id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol
      }
    })

  } catch (error) {
    next(error)
  }
}

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body

    // 1. Validar que vengan los datos
    if (!email || !password) {
      res.status(400).json({ message: 'Email y password son obligatorios' })
      return
    }

    // 2. Buscar el usuario en MongoDB
    const user = await User.findOne({ email })
    if (!user) {
      res.status(401).json({ message: 'Credenciales incorrectas' })
      return
    }

    // 3. Comparar el password con el encriptado
    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      res.status(401).json({ message: 'Credenciales incorrectas' })
      return
    }

    // 4. Generar el JWT
    const token = jwt.sign(
      { id: user._id, rol: user.rol, marca: user.marca },   // payload — datos que guarda el token
      process.env.JWT_SECRET as string,   // secret — clave para firmarlo
      { expiresIn: '24h' }               // expira en 24 horas
    )

    // 5. Responder con el token
    res.status(200).json({
      message: 'Login exitoso',
      token,
      user: {
        id: user._id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol
      }
    })

  } catch (error) {
    next(error)
  }
}

// POST /api/auth/create-user — solo superadmin crea admins
// solo admin crea soporters y usuarios de su marca
export const createUser = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { nombre, email, password, rol, marcaId } = req.body

    // Validar datos obligatorios
    if (!nombre || !email || !password || !rol) {
      res.status(400).json({ message: 'Nombre, email, password y rol son obligatorios' })
      return
    }

    // Validar que el rol sea válido
    const rolesValidos = ['admin', 'soporte', 'usuario']
    if (!rolesValidos.includes(rol)) {
      res.status(400).json({ message: 'Rol inválido. Debe ser admin, soporte o usuario' })
      return
    }

    // Si el que crea es admin, solo puede crear soporters y usuarios de su marca
    if (req.user?.rol === 'admin') {
      if (rol === 'admin') {
        res.status(403).json({ message: 'Un admin no puede crear otros admins' })
        return
      }
      // El admin solo puede crear usuarios de su propia marca
      if (String(req.user.marca) !== String(marcaId)) {
        res.status(403).json({ message: 'Solo puedes crear usuarios de tu marca' })
        return
      }
    }

    // Verificar que el email no exista
    const existing = await User.findOne({ email })
    if (existing) {
      res.status(400).json({ message: 'Ya existe un usuario con ese email' })
      return
    }

    // Si viene marcaId verificar que la marca exista
    if (marcaId) {
      const brand = await Brand.findById(marcaId)
      if (!brand) {
        res.status(404).json({ message: 'Marca no encontrada' })
        return
      }
    }

    // Encriptar password
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)

    // Crear usuario
    const user = await User.create({
      nombre,
      email,
      password: hashedPassword,
      rol,
      marca: marcaId || undefined
    })

    // Si el usuario creado es admin, actualizar Brand.admin automáticamente
    if (rol === 'admin' && marcaId) {
      await Brand.findByIdAndUpdate(marcaId, { admin: user._id })
    }

    res.status(201).json({
      message: 'Usuario creado exitosamente',
      user: {
        id: user._id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        marca: user.marca
      }
    })

  } catch (error) {
    next(error)
  }
}

// GET /api/users — listar usuarios de la marca (admin y superadmin)
export const getUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { rol, marca } = req.user!

    let filtro: any = {}

    if (rol === 'superadmin') {
      // superadmin ve todos los usuarios de todas las marcas
      filtro = {}
    } else if (rol === 'admin') {
      // admin solo ve usuarios de su marca
      filtro = { marca }
    }

    const users = await User.find(filtro)
      .select('-password') // excluye el password de la respuesta
      .populate('marca', 'nombre')
      .sort({ createdAt: -1 })

    res.status(200).json({ users })

  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Error interno del servidor' })
  }
}