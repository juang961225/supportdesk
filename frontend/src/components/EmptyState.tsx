import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: { label: string; onClick: () => void }
}

// Estado vacío de una lista: ícono + mensaje + acción opcional
function EmptyState({ icon: Icono, title, description, action }: EmptyStateProps) {
  return (
    <div className="p-10 text-center">
      <Icono className="w-10 h-10 mx-auto mb-3 text-gray-400 dark:text-gray-500" aria-hidden="true" />
      <p className="font-medium text-gray-700 dark:text-gray-200">{title}</p>
      {description && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}

export default EmptyState
