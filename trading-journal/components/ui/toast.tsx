"use client"

import * as React from "react"
import { X } from "lucide-react"

export type ToastType = "success" | "error" | "info" | "warning"

export interface Toast {
  id: string
  message: string
  type: ToastType
}

interface ToastContextType {
  toasts: Toast[]
  addToast: (message: string, type?: ToastType) => void
  removeToast: (id: string) => void
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([])

  const addToast = React.useCallback((message: string, type: ToastType = "info") => {
    const id = Math.random().toString(36).substring(7)
    setToasts((prev) => [...prev, { id, message, type }])

    // Auto remove after 5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id))
    }, 5000)
  }, [])

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md">
        {toasts.map((toast) => (
          <ToastNotification
            key={toast.id}
            toast={toast}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastNotification({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const getStyles = () => {
    switch (toast.type) {
      case "success":
        return "bg-green-600 dark:bg-green-700 text-white border-green-700 dark:border-green-600"
      case "error":
        return "bg-red-600 dark:bg-red-700 text-white border-red-700 dark:border-red-600"
      case "warning":
        return "bg-yellow-600 dark:bg-yellow-700 text-white border-yellow-700 dark:border-yellow-600"
      default:
        return "bg-blue-600 dark:bg-blue-700 text-white border-blue-700 dark:border-blue-600"
    }
  }

  return (
    <div
      className={`
        ${getStyles()}
        rounded-lg border-2 shadow-lg p-4 pr-12
        animate-in slide-in-from-right duration-300
        relative min-w-[300px]
      `}
      role="alert"
    >
      <p className="text-sm font-medium">{toast.message}</p>
      <button
        onClick={onClose}
        className="absolute top-3 right-3 text-white hover:text-gray-200 transition-colors"
        aria-label="Close notification"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

export function useToast() {
  const context = React.useContext(ToastContext)
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider")
  }
  return context
}
