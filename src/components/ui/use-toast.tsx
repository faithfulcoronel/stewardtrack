"use client"

import { toast as sonnerToast } from "sonner"

type ToastVariant = "default" | "destructive"

type ToastInput =
  | string
  | {
      title?: string
      description?: string
      duration?: number
      variant?: ToastVariant
    }

interface ToastOptions {
  description?: string
  duration?: number
}

type ToastCallable = ((input: ToastInput) => void) & {
  success: (message: string, options?: ToastOptions) => void
  error: (message: string, options?: ToastOptions) => void
  info: (message: string, options?: ToastOptions) => void
  warning: (message: string, options?: ToastOptions) => void
  loading: (message: string, options?: ToastOptions) => string | number
  dismiss: (toastId?: string | number) => void
}

const toastHandler = (input: ToastInput) => {
  if (typeof input === "string") {
    sonnerToast(input)
    return
  }

  const { title, description, duration, variant = "default" } = input
  const message = title ?? description ?? "Notification"
  const toastDescription = title ? description : undefined
  const fallbackDuration = variant === "destructive" ? 5000 : 4000

  if (variant === "destructive") {
    sonnerToast.error(message, {
      description: toastDescription,
      duration: duration ?? fallbackDuration,
    })
    return
  }

  sonnerToast(message, {
    description: toastDescription,
    duration: duration ?? fallbackDuration,
  })
}

export const toast: ToastCallable = Object.assign(toastHandler, {
  success: (message: string, options?: ToastOptions) => {
    sonnerToast.success(message, {
      description: options?.description,
      duration: options?.duration ?? 4000,
    })
  },
  error: (message: string, options?: ToastOptions) => {
    sonnerToast.error(message, {
      description: options?.description,
      duration: options?.duration ?? 5000,
    })
  },
  info: (message: string, options?: ToastOptions) => {
    sonnerToast.info(message, {
      description: options?.description,
      duration: options?.duration ?? 4000,
    })
  },
  warning: (message: string, options?: ToastOptions) => {
    sonnerToast.warning(message, {
      description: options?.description,
      duration: options?.duration ?? 4000,
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
})

export const useToast = () => ({ toast })
