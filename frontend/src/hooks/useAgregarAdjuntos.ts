import { useToast } from './useToast'
import { combinarAdjuntos } from '../utils/attachments'

// Agrega archivos (del selector, pegados o soltados) validando y avisando con toasts
export function useAgregarAdjuntos(files: File[], onChange: (files: File[]) => void) {
  const { toast } = useToast()

  return (nuevos: File[]) => {
    if (nuevos.length === 0) return
    const { archivos, avisos } = combinarAdjuntos(files, nuevos)
    avisos.forEach((aviso) => toast.warning(aviso))
    onChange(archivos)
  }
}
