interface EmptyStateProps {
  icon: string // emoji, igual que en el resto de la UI
  title: string
  description?: string
  action?: { label: string; onClick: () => void }
}

// Estado vacío de una lista: ícono + mensaje + acción opcional
function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="p-10 text-center">
      <p className="text-4xl mb-3" aria-hidden="true">{icon}</p>
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
