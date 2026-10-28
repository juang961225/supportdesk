import { Request, Response, NextFunction } from 'express'
import bcrypt from 'bcryptjs'
import User, { IUser } from '../models/User'
import Brand from '../models/Brand'
import { emitirAccessToken, crearRefreshToken, rotarRefreshToken, revocarRefreshToken, REFRESH_TOKEN_MS } from '../services/sesion'
import { COOKIE_REFRESH, RUTA_COOKIE_REFRESH, leerCookie, opcionesCookieRefresh } from '../utils/cookies'

// Lo que el frontend necesita del usuario (sin password)
const usuarioPublico = (user: IUser) => ({
  _id: user._id,
  nombre: user.nombre,
  email: user.email,
  rol: user.rol
})

const ponerCookieRefresh = (res: Response, token: string): void => {
  res.cookie(COOKIE_REFRESH, token, opcionesCookieRefresh(process.env, REFRESH_TOKEN_MS))
}

const borrarCookieRefresh = (res: Response): void => {
  const { maxAge: _maxAge, ...opciones } = opcionesCookieRefresh(process.env, 0)
  res.clearCookie(COOKIE_REFRESH, { ...opciones, path: RUTA_COOKIE_REFRESH })
}

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

    // 5. Access token corto (va en la respuesta) + refresh token largo (cookie httpOnly)
    const token = emitirAccessToken(user)
    ponerCookieRefresh(res, await crearRefreshToken(user._id))

    // 6. Responder con el token
    res.status(200).json({
      message: 'Login exitoso',
      token,
      user: usuarioPublico(user)
    })

  } catch (error) {
    next(error)
  }
}

// POST /api/auth/refresh — con la cookie, entrega un access token nuevo y rota el refresh token
export const refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = leerCookie(req.headers.cookie, COOKIE_REFRESH)
    if (!token) {
      res.status(401).json({ message: 'Sesión no iniciada', motivo: 'sin_sesion' })
      return
    }

    const resultado = await rotarRefreshToken(token)
    if (!resultado.ok) {
      // "rotado": otra pestaña acaba de renovar; la cookie nueva ya está en el navegador → no se borra
      if (resultado.motivo !== 'rotado') borrarCookieRefresh(res)
      res.status(401).json({ message: 'La sesión expiró, inicia sesión de nuevo', motivo: resultado.motivo })
      return
    }

    ponerCookieRefresh(res, resultado.nuevoToken)
    res.status(200).json({ token: emitirAccessToken(resultado.user), user: usuarioPublico(resultado.user) })

  } catch (error) {
    next(error)
  }
}

// POST /api/auth/logout — invalida el refresh token de este navegador y borra la cookie
export const logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = leerCookie(req.headers.cookie, COOKIE_REFRESH)
    if (token) await revocarRefreshToken(token)
    borrarCookieRefresh(res)
    res.status(200).json({ message: 'Sesión cerrada' })
  } catch (error) {
    next(error)
  }
}
