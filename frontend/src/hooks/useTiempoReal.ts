import { useEffect, useRef, useState } from 'react'
import { socket, seguirTicket } from '../services/tiempoReal'
import type { EventoTicket } from '../services/tiempoReal'

const ESPERA_MS = 400 // agrupa cambios seguidos en una sola recarga

interface OpcionesRecarga {
  cadaMs?: number // como mucho una recarga cada tantos ms (evita avalanchas con muchos usuarios)
  filtro?: (evento: EventoTicket) => boolean // qué eventos importan (se lee siempre el más reciente)
}

// Cuenta que sube cuando hay que recargar: se pone en las dependencias del useEffect que pide los datos.
// Al reconectar siempre se recarga (pudo perderse algún cambio).
const useVersionPorEventos = (eventos: string[], activo: boolean, { cadaMs = 0, filtro }: OpcionesRecarga = {}): number => {
  const [version, setVersion] = useState(0)
  const filtroRef = useRef(filtro)
  useEffect(() => {
    filtroRef.current = filtro
  })

  useEffect(() => {
    if (!activo) return
    let timer: ReturnType<typeof setTimeout> | undefined
    let ultimaRecarga = 0
    let yaConecto = socket.connected
    const programar = () => {
      clearTimeout(timer)
      // Espera corta para agrupar, y además respeta el mínimo entre recargas
      const espera = Math.max(ESPERA_MS, ultimaRecarga + cadaMs - Date.now())
      timer = setTimeout(() => {
        ultimaRecarga = Date.now()
        setVersion((v) => v + 1)
      }, espera)
    }
    const alEvento = (evento: EventoTicket) => {
      if (!filtroRef.current || filtroRef.current(evento)) programar()
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
  }, [activo, cadaMs, eventos.join(',')])

  return version
}

// Listas y dashboards: el servidor solo avisa de tickets que este usuario puede ver.
// Por defecto como mucho una recarga cada 3 s; los dashboards piden más espacio (cadaMs)
export const useRecargaEnVivo = (opciones: OpcionesRecarga = {}): number =>
  useVersionPorEventos(['ticket:cambio'], true, { cadaMs: 3000, ...opciones })

// Detalle de un ticket: se suscribe a su sala mientras la pantalla está abierta
export const useTicketEnVivo = (ticketId: string | undefined): { versionTicket: number; versionComentarios: number } => {
  useEffect(() => {
    if (!ticketId) return
    return seguirTicket(ticketId)
  }, [ticketId])

  const esDeEsteTicket = (evento: EventoTicket) => evento.ticketId === ticketId
  return {
    versionTicket: useVersionPorEventos(['ticket:cambio'], Boolean(ticketId), { filtro: esDeEsteTicket }),
    versionComentarios: useVersionPorEventos(['comentario:nuevo'], Boolean(ticketId), { filtro: esDeEsteTicket }),
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
