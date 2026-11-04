import { Link } from 'react-router-dom'
import PaginaEstado, { botonPrincipal } from '../components/PaginaEstado'

function NotFoundPage() {
  return (
    <PaginaEstado codigo="404" titulo="Página no encontrada" mensaje="La dirección no existe o cambió. Revisa el enlace o vuelve al inicio.">
      <Link to="/" className={botonPrincipal}>Ir al inicio</Link>
    </PaginaEstado>
  )
}

export default NotFoundPage
