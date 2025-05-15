
// Re-export the toast functionality from the UI component
import { useToast, toast, ToastProvider } from "@/components/ui/toast-provider"
import type { ToastActionElement, ToastProps } from "@/components/ui/toast"

// Export everything from the use-toast module
export { useToast, toast, ToastProvider, type ToastActionElement, type ToastProps }
