
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ServeAttemptData } from "./ServeAttempt";
import { useToast } from "@/hooks/use-toast";
import { sendEmail, createUpdateNotificationEmail } from "@/utils/email";
import { supabase } from "@/lib/supabase";

interface EditServeDialogProps {
  serve: ServeAttemptData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (updatedServe: ServeAttemptData) => Promise<boolean>;
}

const statusOptions = [
  "completed",
  "failed"
];

const statusDisplayMap: Record<string, string> = {
  "completed": "Served",
  "failed": "No Answer",
};

export default function EditServeDialog({ serve, open, onOpenChange, onSave }: EditServeDialogProps) {
  const [status, setStatus] = useState<"completed" | "failed">(serve.status);
  const [caseNumber, setCaseNumber] = useState<string>(serve.caseNumber || "");
  const [notes, setNotes] = useState<string>(serve.notes || "");
  const [isSaving, setIsSaving] = useState(false);
  const [clientEmail, setClientEmail] = useState<string | null>(null);
  const [clientName, setClientName] = useState<string>("Client");
  const { toast } = useToast();

  useEffect(() => {
    const fetchClientEmail = async () => {
      if (serve.clientId) {
        try {
          const { data, error } = await supabase
            .from('clients')
            .select('email, name')
            .eq('id', serve.clientId)
            .single();
          
          if (data && !error) {
            setClientEmail(data.email);
            setClientName(data.name || "Client");
          }
        } catch (error) {
          console.error("Error fetching client email:", error);
        }
      }
    };
    
    if (open) {
      fetchClientEmail();
    }
  }, [open, serve.clientId]);

  const handleSave = async () => {
    if (isSaving) return;
    
    setIsSaving(true);
    try {
      const updatedServe: ServeAttemptData = {
        ...serve,
        status,
        caseNumber,
        notes
      };
      
      const success = await onSave(updatedServe);
      if (success) {
        if (clientEmail && serve.status !== status) {
          try {
            console.log("Sending status update email to:", clientEmail);
            
            const emailBody = createUpdateNotificationEmail(
              clientName,
              caseNumber,
              new Date(serve.timestamp),
              statusDisplayMap[serve.status],
              statusDisplayMap[status],
              notes
            );
            
            // Ensure we're passing a single email string rather than an array
            const emailResult = await sendEmail({
              to: clientEmail,
              subject: `Serve Attempt Updated - ${caseNumber}`,
              body: emailBody
            });
            
            if (emailResult.success) {
              toast({
                title: "Email Sent",
                description: "Status update email sent to client"
              });
            } else {
              console.error("Email sending failed:", emailResult.message);
              toast({
                variant: "destructive",
                title: "Email Failed",
                description: "Failed to send status update email: " + emailResult.message
              });
            }
          } catch (error) {
            console.error("Error sending status update email:", error);
            toast({
              variant: "destructive",
              title: "Email Error",
              description: "Failed to send status update email"
            });
          }
        }
        
        onOpenChange(false);
      }
    } catch (error) {
      console.error("Error saving serve attempt:", error);
      toast({
        variant: "destructive",
        title: "Save Error",
        description: "An error occurred while saving"
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Serve Attempt</DialogTitle>
          <DialogDescription>
            Update the details of this serve attempt.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={status}
              onValueChange={(value: "completed" | "failed") => setStatus(value)}
            >
              <SelectTrigger id="status">
                <SelectValue placeholder="Select a status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {statusDisplayMap[option]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="caseNumber">Case Number</Label>
            <Input
              id="caseNumber"
              value={caseNumber}
              onChange={(e) => setCaseNumber(e.target.value)}
              placeholder="Enter case number"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter any notes about this serve attempt"
              rows={4}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
