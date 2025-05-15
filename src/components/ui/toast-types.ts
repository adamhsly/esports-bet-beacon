
import { type ReactNode } from "react"
import { type ToastActionElement, type ToastProps } from "@/components/ui/toast"

export type ToasterToast = ToastProps & {
  id: string
  title?: ReactNode
  description?: ReactNode
  action?: ToastActionElement
}

export interface ToastContextType {
  toasts: ToasterToast[]
  toast: (props: ToastProps) => { id: string; dismiss: () => void; update: (props: ToastProps) => void }
  dismiss: (toastId?: string) => void
  update: (props: Partial<ToasterToast>) => void
}

export const TOAST_LIMIT = 100
export const TOAST_REMOVE_DELAY = 1000000
