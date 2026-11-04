import { Link } from 'react-router-dom'
import PaginaEstado, { botonPrincipal } from '../components/PaginaEstado'

function SinPermisoPage() {
  return (
    <PaginaEstado codigo="403" titulo="No tienes permiso" mensaje="Tu usuario no tiene acceso a esta pantalla. Si crees que debería, habla con el administrador de tu marca.">
      <Link to="/" className={botonPrincipal}>Ir a mi inicio</Link>
    </PaginaEstado>
  )
}

export default SinPermisoPage
