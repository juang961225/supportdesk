import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import User from '../models/User'

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { nombre, email, password, rol } = req.body

    // 1. Validar que vengan los datos
    if (!nombre || !email || !password) {
      res.status(400).json({ message: 'Nombre, email y password son obligatorios' })
      return
    }

    // 2. Verificar que el email no exista
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      res.status(400).json({ message: 'Ya existe un usuario con ese email' })
      return
    }

    // 3. Encriptar la contraseña
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)

    // 4. Crear el usuario
    const user = await User.create({
      nombre,
      email,
      password: hashedPassword,
      rol: rol || 'usuario'
    })

    // 5. Responder sin devolver la contraseña
    res.status(201).json({
      message: 'Usuario creado exitosamente',
      user: {
        id: user._id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol
      }
    })

  } catch (error) {
    res.status(500).json({ message: 'Error interno del servidor' })
  }
}

export const login = async (req: Request, res: Response): Promise<void> => {
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
      { id: user._id, rol: user.rol },   // payload — datos que guarda el token
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
    console.error(error)
    res.status(500).json({ message: 'Error interno del servidor' })
  }
}