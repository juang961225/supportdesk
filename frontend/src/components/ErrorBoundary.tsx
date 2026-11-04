import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import PaginaEstado, { botonPrincipal, botonSecundario } from './PaginaEstado'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hayError: boolean
}

// Si una pantalla falla al dibujarse (o no se pudo descargar tras un despliegue), muestra un aviso
// en vez de dejar la página en blanco. Tiene que ser una clase: React no ofrece esto con hooks.
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hayError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hayError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Error al mostrar la pantalla:', error, info.componentStack)
  }

  render(): ReactNode {
    if (!this.state.hayError) return this.props.children

    return (
      <PaginaEstado
        titulo="Algo salió mal"
        mensaje="No pudimos mostrar esta pantalla. Tus datos guardados no se afectaron. Recarga la página para intentarlo de nuevo."
      >
        <button type="button" onClick={() => window.location.reload()} className={botonPrincipal}>
          Recargar
        </button>
        <a href="/" className={botonSecundario}>Ir al inicio</a>
      </PaginaEstado>
    )
  }
}

export default ErrorBoundary
