import { useCallback, useMemo, useReducer } from 'react'
import { ToastContext } from './ToastContext'
import type { ReactNode } from 'react'
import type { ToastApi, ToastContextValue } from './ToastContext'
import type { Toast, ToastAction, ToastOptions, ToastVariant } from '../types/toast'

const DEFAULT_DURATION = 4000

function toastReducer(state: Toast[], action: ToastAction): Toast[] {
  switch (action.type) {
    case 'ADD':
      return [...state, action.toast]
    case 'REMOVE':
      return state.filter((t) => t.id !== action.id)
    case 'CLEAR':
      return []
  }
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, dispatch] = useReducer(toastReducer, [])

  const show = useCallback(
    (variant: ToastVariant, message: string, options?: ToastOptions) => {
      const newToast: Toast = {
        id: crypto.randomUUID(),
        variant,
        message,
        duration: options?.duration ?? DEFAULT_DURATION,
      }
      dispatch({ type: 'ADD', toast: newToast })
    },
    []
  )

  const toast = useMemo<ToastApi>(
    () => ({
      success: (message, options) => show('success', message, options),
      error: (message, options) => show('error', message, options),
      info: (message, options) => show('info', message, options),
      warning: (message, options) => show('warning', message, options),
      dismiss: (id) => dispatch({ type: 'REMOVE', id }),
      clear: () => dispatch({ type: 'CLEAR' }),
    }),
    [show]
  )

  const value = useMemo<ToastContextValue>(
    () => ({ toasts, toast }),
    [toasts, toast]
  )

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
}