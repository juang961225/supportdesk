import type { Ticket } from '../types'

const ETIQUETA_SEDE = { concesionario: 'Concesionario', importador: 'Importador', corporativo: 'Alcance' } as const

const Campo = ({ etiqueta, valor }: { etiqueta: string; valor: string }) => (
  <div>
    <p className="text-gray-500 dark:text-gray-400">{etiqueta}</p>
    <p className="text-gray-800 dark:text-white font-medium">{valor}</p>
  </div>
)

// Campos del detalle del ticket; no muestra nada si el ticket no tiene ese dato (otras marcas o tickets anteriores)
function TicketContexto({ contexto }: { contexto: Ticket['contexto'] }) {
  if (!contexto) return null
  return (
    <>
      {contexto.organizacion && <Campo etiqueta="Organización" valor={contexto.organizacion} />}
      {contexto.tipo && contexto.nombre && <Campo etiqueta={ETIQUETA_SEDE[contexto.tipo]} valor={contexto.nombre} />}
    </>
  )
}

export default TicketContexto
