
// This file is intentionally empty as we're removing all toast functionality

// Create empty stubs to prevent import errors
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
