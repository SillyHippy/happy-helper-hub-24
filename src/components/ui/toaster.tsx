
import { toast as sonnerToast, Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-center"
      toastOptions={{
        style: {
          fontSize: '14px',
          maxWidth: '90vw',
          width: 'auto',
        },
        className: 'group',
      }}
    />
  );
}

export const toast = sonnerToast;
