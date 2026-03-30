import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
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