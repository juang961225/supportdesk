import { Request, Response, NextFunction } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import User from '../models/User'
import Brand from '../models/Brand'

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
        _id: user._id,
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

    // 4. Validar que el usuario y su marca estén activos
    // (después del password, para no revelar el estado de cuentas ajenas)
    if (user.estado === 'inactivo') {
      res.status(403).json({ message: 'Tu cuenta está desactivada' })
      return
    }

    if (user.marca) {
      const brand = await Brand.findById(user.marca).select('estado')
      if (!brand || brand.estado === 'inactivo') {
        res.status(403).json({ message: 'Tu marca está desactivada' })
        return
      }
    }

    // 5. Generar el JWT
    const token = jwt.sign(
      { id: user._id, rol: user.rol, marca: user.marca },   // payload — datos que guarda el token
      process.env.JWT_SECRET as string,   // secret — clave para firmarlo
      { expiresIn: '24h' }               // expira en 24 horas
    )

    // 6. Responder con el token
    res.status(200).json({
      message: 'Login exitoso',
      token,
      user: {
        _id: user._id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol
      }
    })

  } catch (error) {
    next(error)
  }
}
