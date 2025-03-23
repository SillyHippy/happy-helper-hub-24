
import * as React from "react"
import { useToast as useOriginalToast } from "@/components/ui/use-toast"
import { toast as sonnerToast } from "sonner"

// Export the original hook and toast function
export const useToast = useOriginalToast

// Extend the toast component with custom defaults
export const toast = {
  ...useOriginalToast().toast,
  error: (title: string, options?: any) => {
    // Also show the error in sonner for consistency
    sonnerToast.error(title, options);
    return useOriginalToast().toast({
      variant: "destructive",
      title,
      ...options,
    })
  },
  success: (title: string, options?: any) => {
    // Also show the success in sonner for consistency
    sonnerToast.success(title, options);
    return useOriginalToast().toast({
      title,
      ...options,
    })
  },
  info: (title: string, options?: any) => {
    // Also show the info in sonner for consistency
    sonnerToast.info(title, options);
    return useOriginalToast().toast({
      title,
      ...options,
    })
  },
}
