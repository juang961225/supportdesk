import Modal from './Modal'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'default'
  isLoading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

const confirmStyles: Record<'danger' | 'default', string> = {
  danger: 'bg-red-600 hover:bg-red-700',
  default: 'bg-blue-600 hover:bg-blue-700',
}

function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'danger',
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  // Mientras procesa no se puede cerrar (ni Esc ni click afuera)
  const handleClose = () => {
    if (!isLoading) onCancel()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title}>
      <div className="text-sm text-gray-600 dark:text-gray-300 mb-6">
        {message}
      </div>

      <div className="flex gap-3 justify-end">
        <button
          type="button"
          onClick={handleClose}
          disabled={isLoading}
          autoFocus
          className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded disabled:opacity-50 transition-colors"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isLoading}
          className={`px-4 py-2 text-sm text-white rounded disabled:opacity-50 transition-colors ${confirmStyles[variant]}`}
        >
          {isLoading ? 'Procesando...' : confirmLabel}
        </button>
      </div>
    </Modal>
  )
}

export default ConfirmDialog
