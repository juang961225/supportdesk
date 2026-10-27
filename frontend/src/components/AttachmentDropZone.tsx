import { useEffect, useRef, useState } from 'react'
import { useAgregarAdjuntos } from '../hooks/useAgregarAdjuntos'
import { nombrarPegado } from '../utils/attachments'

interface AttachmentDropZoneProps {
  files: File[]
  onChange: (files: File[]) => void
  disabled?: boolean
  children: React.ReactNode
}

const traeArchivos = (e: React.DragEvent | DragEvent): boolean =>
  Array.from(e.dataTransfer?.types ?? []).includes('Files')

// Envuelve un formulario para adjuntar pegando (Ctrl/Cmd+V) o arrastrando archivos encima
function AttachmentDropZone({ files, onChange, disabled = false, children }: AttachmentDropZoneProps) {
  const agregar = useAgregarAdjuntos(files, onChange)
  const [arrastrando, setArrastrando] = useState(false)
  const profundidad = useRef(0) // dragenter/dragleave se disparan también al pasar por los hijos

  // Soltar un archivo fuera de la zona haría que el navegador lo abra y se pierda el formulario
  useEffect(() => {
    const evitarAbrir = (e: DragEvent) => {
      if (traeArchivos(e)) e.preventDefault()
    }
    window.addEventListener('dragover', evitarAbrir)
    window.addEventListener('drop', evitarAbrir)
    return () => {
      window.removeEventListener('dragover', evitarAbrir)
      window.removeEventListener('drop', evitarAbrir)
    }
  }, [])

  const handlePaste = (e: React.ClipboardEvent) => {
    if (disabled) return
    const pegados = Array.from(e.clipboardData.files)
    // Si también trae texto (ej. celdas de Excel o Word) se pega el texto, no la imagen
    if (pegados.length === 0 || e.clipboardData.getData('text/plain').trim()) return
    e.preventDefault()
    const ahora = new Date()
    agregar(pegados.map((archivo, i) => nombrarPegado(archivo, ahora, i)))
  }

  const handleDragEnter = (e: React.DragEvent) => {
    if (disabled || !traeArchivos(e)) return
    profundidad.current += 1
    setArrastrando(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    if (!traeArchivos(e)) return
    profundidad.current = Math.max(profundidad.current - 1, 0)
    if (profundidad.current === 0) setArrastrando(false)
  }

  const handleDragOver = (e: React.DragEvent) => {
    if (disabled || !traeArchivos(e)) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }

  const handleDrop = (e: React.DragEvent) => {
    profundidad.current = 0
    setArrastrando(false)
    if (disabled || !traeArchivos(e)) return
    e.preventDefault()
    agregar(Array.from(e.dataTransfer.files))
  }

  return (
    <div
      className="relative"
      onPaste={handlePaste}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {children}
      {arrastrando && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-lg border-2 border-dashed border-blue-500 bg-blue-50/90 dark:bg-blue-900/80">
          <p className="text-sm font-medium text-blue-700 dark:text-blue-200">📎 Suelta los archivos aquí</p>
        </div>
      )}
    </div>
  )
}

export default AttachmentDropZone
