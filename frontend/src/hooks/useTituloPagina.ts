import { useEffect } from 'react'

// Título de la pestaña para una página concreta (p. ej., el detalle de un ticket).
// La página se renderiza dentro de Layout, así que su efecto corre después y gana
export function useTituloPagina(titulo: string | undefined): void {
  useEffect(() => {
    if (titulo) document.title = `${titulo} · SupportDesk`
  }, [titulo])
}
