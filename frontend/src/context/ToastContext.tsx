import { createContext } from 'react'
import type { Toast, ToastOptions } from '../types/toast'

export interface ToastApi {
  success: (message: string, options?: ToastOptions) => void
  error: (message: string, options?: ToastOptions) => void
  info: (message: string, options?: ToastOptions) => void
  warning: (message: string, options?: ToastOptions) => void
  dismiss: (id: string) => void
  clear: () => void
}

export interface ToastContextValue {
  toasts: Toast[]
  toast: ToastApi
}

export const ToastContext = createContext<ToastContextValue | null>(null)