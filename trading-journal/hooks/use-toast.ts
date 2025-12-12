// Compatibility layer for shadcn/ui toast API
import { useToast as useToastOriginal } from '@/components/ui/toast'

export interface ToastOptions {
  title?: string
  description?: string
  variant?: 'default' | 'destructive'
}

export function useToast() {
  const { addToast } = useToastOriginal()

  const toast = (options: ToastOptions | string) => {
    if (typeof options === 'string') {
      addToast(options, 'info')
      return
    }

    const { title, description, variant } = options
    const message = title && description ? `${title}: ${description}` : title || description || ''
    const type = variant === 'destructive' ? 'error' : 'success'

    addToast(message, type)
  }

  return { toast }
}

export type { Toast, ToastType } from '@/components/ui/toast'
