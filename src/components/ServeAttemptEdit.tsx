
import React, { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ServeAttemptData } from "./ServeAttempt";
import { ClientData } from "./ClientForm";
import { supabase } from "@/lib/supabase";
import { sendEmail, createUpdateNotificationEmail } from "@/utils/email";

interface ServeAttemptEditProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serve: ServeAttemptData;
  client: ClientData;
  onUpdate: () => void;
}

const serveAttemptFormSchema = z.object({
  caseNumber: z.string().min(1, { message: "Case number is required" }),
  status: z.string().min(1, { message: "Status is required" }),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof serveAttemptFormSchema>;

const ServeAttemptEdit: React.FC<ServeAttemptEditProps> = ({
  open,
  onOpenChange,
  serve,
  client,
  onUpdate,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(serveAttemptFormSchema),
    defaultValues: {
      caseNumber: serve.caseNumber || "",
      status: serve.status || "Attempted",
      notes: serve.notes || "",
    },
  });

  const handleSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    
    try {
      console.log("Updating serve attempt:", values);
      
      // Store the old status for the email notification
      const oldStatus = serve.status;
      
      // Update serve attempt in Supabase
      const { error } = await supabase
        .from("serve_attempts")
        .update({
          case_number: values.caseNumber,
          status: values.status,
          notes: values.notes,
        })
        .eq("id", serve.id);
      
      if (error) {
        throw error;
      }
      
      // If the status has changed, send an email notification
      if (oldStatus !== values.status && client.email) {
        try {
          const emailBody = createUpdateNotificationEmail(
            client.name,
            values.caseNumber,
            new Date(serve.timestamp),
            oldStatus,
            values.status,
            values.notes
          );
          
          const emailResult = await sendEmail({
            to: client.email,
            subject: `Serve Attempt Updated - ${values.caseNumber}`,
            body: emailBody,
          });
          
          if (emailResult.success) {
            console.log("Email notification sent:", emailResult);
          } else {
            console.error("Failed to send email notification:", emailResult.message);
          }
        } catch (emailError) {
          console.error("Error sending email notification:", emailError);
        }
      }
      
      toast.success("Serve attempt updated successfully");
      onUpdate();
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating serve attempt:", error);
      toast.error("Failed to update serve attempt");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Serve Attempt</DialogTitle>
          <DialogDescription>
            Update the details of this serve attempt
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="caseNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Case Number</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter case number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Attempted">Attempted</SelectItem>
                      <SelectItem value="Completed">Completed</SelectItem>
                      <SelectItem value="Failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add any additional notes"
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Updating..." : "Update Serve Attempt"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default ServeAttemptEdit;
