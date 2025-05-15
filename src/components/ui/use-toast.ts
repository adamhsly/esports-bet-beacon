
// This file is kept only for backwards compatibility
// All functionality has been moved to separate files

// Import from the new files
import { toast, useToast, ToastProvider } from "@/components/ui/toast-provider"
import type { ToastProps, ToastActionElement } from "@/components/ui/toast"
import type { ToasterToast } from "./toast-types"

// Re-export everything
export {
  toast,
  useToast,
  ToastProvider,
  type ToastProps,
  type ToastActionElement,
  type ToasterToast,
}
