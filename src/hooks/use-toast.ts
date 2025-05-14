
// This file is used to re-export the use-toast hook from the UI components
// Extending or customizing functionality as needed

import { useToast as useToastOriginal, toast as toastOriginal } from "@/components/ui/use-toast";

export const useToast = useToastOriginal;
export const toast = toastOriginal;

export type { ToastActionElement, ToastProps } from '@/components/ui/toast';
