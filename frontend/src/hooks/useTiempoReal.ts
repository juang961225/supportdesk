import { useEffect, useState } from 'react'
import { socket, seguirTicket } from '../services/tiempoReal'
import type { EventoTicket } from '../services/tiempoReal'

const ESPERA_MS = 400 // agrupa cambios seguidos en una sola recarga

// Cuenta que sube cuando hay que recargar: se pone en las dependencias del useEffect que pide los datos.
// `filtro` decide qué eventos importan; al reconectar siempre se recarga (pudo perderse algún cambio).
const useVersionPorEventos = (eventos: string[], filtro: (evento: EventoTicket) => boolean, activo: boolean): number => {
  const [version, setVersion] = useState(0)

  useEffect(() => {
    if (!activo) return
    let timer: ReturnType<typeof setTimeout> | undefined
    let yaConecto = socket.connected
    const programar = () => {
      clearTimeout(timer)
      timer = setTimeout(() => setVersion((v) => v + 1), ESPERA_MS)
    }
    const alEvento = (evento: EventoTicket) => {
      if (filtro(evento)) programar()
    }
    const alConectar = () => {
      if (yaConecto) programar() // reconexión (la primera conexión no necesita recargar)
      yaConecto = true
    }

    eventos.forEach((nombre) => socket.on(nombre, alEvento))
    socket.on('connect', alConectar)
    return () => {
      clearTimeout(timer)
      eventos.forEach((nombre) => socket.off(nombre, alEvento))
      socket.off('connect', alConectar)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activo, eventos.join(',')])

  return version
}

const todos = () => true

// Listas y dashboards: el servidor solo avisa de tickets que este usuario puede ver
export const useRecargaEnVivo = (): number => useVersionPorEventos(['ticket:cambio'], todos, true)

// Detalle de un ticket: se suscribe a su sala mientras la pantalla está abierta
export const useTicketEnVivo = (ticketId: string | undefined): { versionTicket: number; versionComentarios: number } => {
  useEffect(() => {
    if (!ticketId) return
    return seguirTicket(ticketId)
  }, [ticketId])

  const esDeEsteTicket = (evento: EventoTicket) => evento.ticketId === ticketId
  return {
    versionTicket: useVersionPorEventos(['ticket:cambio'], esDeEsteTicket, Boolean(ticketId)),
    versionComentarios: useVersionPorEventos(['comentario:nuevo'], esDeEsteTicket, Boolean(ticketId)),
  }
}

// true si la conexión se perdió hace más de `gracia` ms (para el aviso "Reconectando…")
export const useConexionPerdida = (gracia = 3000): boolean => {
  const [perdida, setPerdida] = useState(false)

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    const alDesconectar = (motivo: string) => {
      if (motivo === 'io client disconnect') return // cierre de sesión: no es una caída
      clearTimeout(timer)
      timer = setTimeout(() => setPerdida(true), gracia)
    }
    const alConectar = () => {
      clearTimeout(timer)
      setPerdida(false)
    }
    socket.on('disconnect', alDesconectar)
    socket.on('connect', alConectar)
    return () => {
      clearTimeout(timer)
      socket.off('disconnect', alDesconectar)
      socket.off('connect', alConectar)
    }
  }, [gracia])

  return perdida
}
