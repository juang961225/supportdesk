import { useEffect } from 'react'
import { useToast } from '../hooks/useToast'
import type { Toast as ToastType } from '../types/toast'

interface ToastProps {
  toast: ToastType
}

const variantStyles: Record<ToastType['variant'], string> = {
  success: 'bg-green-50 border-green-500 text-green-800 dark:bg-green-900/30 dark:border-green-500 dark:text-green-200',
  error: 'bg-red-50 border-red-500 text-red-800 dark:bg-red-900/30 dark:border-red-500 dark:text-red-200',
  info: 'bg-blue-50 border-blue-500 text-blue-800 dark:bg-blue-900/30 dark:border-blue-500 dark:text-blue-200',
  warning: 'bg-yellow-50 border-yellow-500 text-yellow-800 dark:bg-yellow-900/30 dark:border-yellow-500 dark:text-yellow-200',
}

const variantIcons: Record<ToastType['variant'], string> = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
  warning: '⚠',
}

export function Toast({ toast }: ToastProps) {
  const { toast: toastApi } = useToast()

  useEffect(() => {
    if (toast.duration <= 0) return

    const timer = setTimeout(() => {
      toastApi.dismiss(toast.id)
    }, toast.duration)

    return () => clearTimeout(timer)
  }, [toast.id, toast.duration, toastApi])

  return (
    <div
      className={`flex items-center gap-3 min-w-[280px] max-w-md px-4 py-3 rounded-lg border-l-4 shadow-lg ${variantStyles[toast.variant]}`}
      role="alert"
    >
      <span className="text-lg font-bold">{variantIcons[toast.variant]}</span>
      <p className="flex-1 text-sm font-medium">{toast.message}</p>
      <button
        onClick={() => toastApi.dismiss(toast.id)}
        className="text-lg hover:opacity-70 transition-opacity"
        aria-label="Cerrar notificación"
      >
        ×
      </button>
    </div>
  )
}