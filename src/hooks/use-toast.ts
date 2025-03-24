
import * as React from "react";
import {
  Toast,
  ToastActionElement,
  ToastProps,
} from "@/components/ui/toast";

// Create empty stubs to prevent import errors but still accepting arguments
export const useToast = () => ({
  toasts: [],
  toast: () => ({}),
  dismiss: () => {},
});

// Toast function stub that accepts any arguments but does nothing
export const toast = (props?: any) => ({
  error: (title?: string, options?: any) => ({}),
  success: (title?: string, options?: any) => ({}),
  warning: (title?: string, options?: any) => ({}),
  info: (title?: string, options?: any) => ({}),
});
