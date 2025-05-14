
// Import directly from the toast component
import { toast as toastOriginal, type ToastActionElement, type ToastProps } from '@/components/ui/toast';
import { useToast as useToastOriginal } from '@/components/ui/toast';

export const useToast = useToastOriginal;
export const toast = toastOriginal;

export type { ToastActionElement, ToastProps };
