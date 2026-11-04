// Qué ve el usuario final de quién atiende su ticket: el área, nunca la persona.
// Se aplica en el backend para que el nombre tampoco viaje al navegador. Funciones puras.

const NOMBRE_EQUIPO = 'El equipo de soporte'

const esUsuarioFinal = (rol: string | undefined): boolean => rol === 'usuario'

// Quita al soporte asignado de lo que recibe el usuario final
export const ticketParaRol = <T extends object>(ticket: T, rol: string | undefined): Omit<T, 'asignadoA'> | T => {
  if (!esUsuarioFinal(rol)) return ticket
  const { asignadoA: _oculto, ...visible } = ticket as T & { asignadoA?: unknown }
  return visible
}

interface AutorComentario {
  _id?: unknown
  nombre?: string
  email?: string
  rol?: string
}

// Para el usuario final, lo que escribe el equipo aparece a nombre del área. Otro usuario (creador
// u observador) conserva su nombre. Tampoco se envía el id ni el correo de quien comentó.
export const comentarioParaRol = <T extends { autor?: unknown }>(
  comentario: T,
  rol: string | undefined,
  areaNombre: string | undefined
): T => {
  const autor = comentario.autor as AutorComentario | null | undefined
  if (!esUsuarioFinal(rol) || esUsuarioFinal(autor?.rol)) return comentario
  return { ...comentario, autor: { _id: 'equipo', nombre: areaNombre ?? NOMBRE_EQUIPO, rol: 'soporte' } }
}

// Nombre de quien hizo la acción, según quién recibe el correo
export const actorParaDestinatario = (
  actor: { nombre?: string; rol?: string } | null | undefined,
  rolDestinatario: string,
  areaNombre: string | undefined
): string => {
  if (esUsuarioFinal(rolDestinatario) && !esUsuarioFinal(actor?.rol)) return areaNombre ?? NOMBRE_EQUIPO
  return actor?.nombre ?? 'Alguien'
}
