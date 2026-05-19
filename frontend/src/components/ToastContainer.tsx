// src/components/ToastContainer.tsx
import { createPortal } from 'react-dom'
import { useToast } from '../hooks/useToast'
import { Toast } from './Toast'

export function ToastContainer() {
  const { toasts } = useToast()

  const portalRoot = document.getElementById('toast-root')
  if (!portalRoot) return null

  return createPortal(
    <div
      className="fixed top-4 right-4 z-50 flex flex-col gap-2"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} />
      ))}
    </div>,
    portalRoot
  )
}