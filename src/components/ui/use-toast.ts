
// Re-export from sonner for backwards compatibility
import { toast as sonnerToast } from "sonner";

// Create compatibility layer for existing code
export const useToast = () => ({
  toast: (props?: any) => sonnerToast(props?.title, { description: props?.description }),
  dismiss: (toastId?: string) => {
    if (toastId) {
      sonnerToast.dismiss(toastId);
    } else {
      sonnerToast.dismiss();
    }
  }
});

// Toast function that matches the interface expected by the codebase
export const toast = (props?: any) => {
  const message = props?.title || "";
  const description = props?.description;
  const variant = props?.variant;
  
  if (variant === "destructive") {
    return sonnerToast.error(message, { description });
  }
  
  return sonnerToast(message, { description });
};

// Add additional methods to match the existing interface
toast.error = (title?: string, options?: any) => sonnerToast.error(title, options);
toast.success = (title?: string, options?: any) => sonnerToast.success(title, options);
toast.warning = (title?: string, options?: any) => sonnerToast.warning(title, options);
toast.info = (title?: string, options?: any) => sonnerToast.info(title, options);
