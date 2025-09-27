"use client"

import { toast as sonnerToast } from "sonner"

interface ToastOptions {
  title?: string
  description?: string
  duration?: number
}

export const toast = {
  success: (message: string, options?: ToastOptions) => {
    sonnerToast.success(message, {
      description: options?.description,
      duration: options?.duration || 4000,
    })
  },
  error: (message: string, options?: ToastOptions) => {
    sonnerToast.error(message, {
      description: options?.description,
      duration: options?.duration || 5000,
    })
  },
  info: (message: string, options?: ToastOptions) => {
    sonnerToast.info(message, {
      description: options?.description,
      duration: options?.duration || 4000,
    })
  },
  warning: (message: string, options?: ToastOptions) => {
    sonnerToast.warning(message, {
      description: options?.description,
      duration: options?.duration || 4000,
    })
  },
  loading: (message: string, options?: ToastOptions) => {
    return sonnerToast.loading(message, {
      description: options?.description,
    })
  },
  dismiss: (toastId?: string | number) => {
    sonnerToast.dismiss(toastId)
  },
}

export { toast as useToast }