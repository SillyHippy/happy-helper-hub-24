
import React, { useState } from 'react';
import { ServeAttemptData } from './ServeAttempt';
import { ClientData } from './ClientForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, MapPin, Mail, Edit2, Trash2, Plus, FileCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

interface ServeHistoryProps {
  serves: ServeAttemptData[];
  clients: ClientData[];
  onNewAttempt?: (clientId: string, caseNumber: string, previousAttempts: number) => void;
  onDelete?: (serveId: string) => Promise<boolean>;
}

const ServeHistory: React.FC<ServeHistoryProps> = ({ serves, clients, onNewAttempt, onDelete }) => {
  const [deletingServeId, setDeletingServeId] = useState<string | null>(null);
  const [deleteNote, setDeleteNote] = useState('');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Group serves by client and case number
  const groupedServes = serves.reduce((acc, serve) => {
    const client = clients.find(c => c.id === serve.clientId);
    if (!client) return acc;
    
    const clientName = client.name;
    if (!acc[clientName]) {
      acc[clientName] = {};
    }
    
    const caseNumber = serve.caseNumber || 'No Case Number';
    if (!acc[clientName][caseNumber]) {
      acc[clientName][caseNumber] = [];
    }
    
    acc[clientName][caseNumber].push({
      ...serve,
      clientName: client.name,
      clientAddress: client.address
    });
    
    return acc;
  }, {} as Record<string, Record<string, (ServeAttemptData & { clientName: string; clientAddress: string })[]>>);
  
  console.log("ServeHistory component received serves:", serves.length);
  console.log("Grouped serves structure:", Object.keys(groupedServes).length, "clients,", 
    Object.values(groupedServes).reduce((sum, cases) => sum + Object.keys(cases).length, 0), "cases");
  
  const handleDeleteServe = async (serveId: string, clientId: string, caseNumber: string, clientEmail: string) => {
    setIsDeleting(true);
    
    try {
      console.log(`Deleting serve attempt with ID: ${serveId}`);
      
      // Delete from Supabase first
      const { error } = await supabase
        .from('serve_attempts')
        .delete()
        .eq('id', serveId);
      
      if (error) {
        console.error("Error deleting serve attempt from Supabase:", error);
        toast.error("Error deleting serve attempt", {
          description: "There was a problem deleting this serve attempt. Please try again."
        });
        return;
      }
      
      // Find the serve to get its details for the email
      const serveToDelete = serves.find(s => s.id === serveId);
      
      // Find the client to get their details for the email
      const client = clients.find(c => c.id === clientId);
      
      if (serveToDelete && client) {
        // Send email notification
        const emailTo = client.email;
        const subject = `Serve Attempt Deleted - Case #${caseNumber}`;
        
        // Format the date nicely
        const serveDate = new Date(serveToDelete.timestamp);
        const formattedDate = serveDate.toLocaleDateString() + ', ' + serveDate.toLocaleTimeString();
        
        // Create email body
        let body = `A serve attempt for case #${caseNumber} has been deleted.\n\n`;
        body += `Client: ${client.name}\n`;
        body += `Address: ${client.address}\n`;
        body += `Date: ${formattedDate}\n`;
        body += `Status: ${serveToDelete.status}\n`;
        
        if (deleteNote) {
          body += `\nNote: ${deleteNote}\n`;
        }
        
        body += `\nThis is an automated notification from ServeTracker.`;
        
        console.log("Sending email:", { to: emailTo, subject });
        
        // Send the email
        try {
          const { data, error } = await supabase.functions.invoke('send-email', {
            body: { to: emailTo, subject, body }
          });
          
          if (error) {
            console.error("Error sending email:", error);
          } else {
            console.log("Response from send-email function:", data);
            toast.success("Notification email sent", {
              description: `Email notification sent to ${emailTo}`
            });
          }
        } catch (emailError) {
          console.error("Exception sending email:", emailError);
        }
      }
      
      // Update local state through the onDelete callback
      if (onDelete) {
        const success = await onDelete(serveId);
        if (success) {
          toast.success("Serve attempt deleted", {
            description: "The serve attempt has been permanently removed."
          });
          
          setDeleteNote('');
          setDeletingServeId(null);
          setIsDeleteDialogOpen(false);
        }
      }
    } catch (error) {
      console.error("Unexpected error deleting serve attempt:", error);
      toast.error("Error", {
        description: "An unexpected error occurred. Please try again."
      });
    } finally {
      setIsDeleting(false);
    }
  };
  
  const handleNewAttempt = (clientId: string, caseNumber: string, previousAttempts: number) => {
    if (onNewAttempt) {
      onNewAttempt(clientId, caseNumber, previousAttempts);
    }
  };
  
  // Sort clients alphabetically
  const sortedClients = Object.keys(groupedServes).sort();
  
  return (
    <div className="space-y-8">
      {sortedClients.map(clientName => (
        <div key={clientName} className="space-y-4">
          <h3 className="text-xl font-semibold">{clientName}</h3>
          
          {Object.entries(groupedServes[clientName]).map(([caseNumber, caseServes]) => {
            // Sort serves by timestamp, newest first
            const sortedServes = [...caseServes].sort((a, b) => 
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            );
            
            const client = clients.find(c => c.name === clientName);
            const clientId = client?.id || "";
            
            return (
              <Card key={caseNumber} className="neo-card overflow-hidden">
                <CardHeader className="border-b bg-muted/50 pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">Case #{caseNumber}</CardTitle>
                      <CardDescription>
                        {sortedServes.length} {sortedServes.length === 1 ? 'attempt' : 'attempts'}
                      </CardDescription>
                    </div>
                    
                    {onNewAttempt && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleNewAttempt(clientId, caseNumber, sortedServes.length)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        New Attempt
                      </Button>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent className="p-0">
                  {sortedServes.map((serve, index) => {
                    const date = new Date(serve.timestamp);
                    const hasCoordinates = serve.coordinates && 
                      typeof serve.coordinates.latitude === 'number' && 
                      typeof serve.coordinates.longitude === 'number';
                    
                    const googleMapsUrl = hasCoordinates ? 
                      `https://www.google.com/maps?q=${serve.coordinates.latitude},${serve.coordinates.longitude}` : 
                      null;
                    
                    const statusClass = serve.status === "completed" ? 
                      "bg-green-100 text-green-800" : 
                      "bg-amber-100 text-amber-800";
                    
                    return (
                      <div key={serve.id} className={`p-4 ${index !== sortedServes.length - 1 ? 'border-b' : ''}`}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2">
                          <div className="flex items-center gap-2 mb-2 sm:mb-0">
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusClass}`}>
                              {serve.status === "completed" ? "Served" : "Failed"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              Attempt #{serve.attemptNumber || 1}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0"
                              title="Delete attempt"
                              onClick={() => {
                                setDeletingServeId(serve.id);
                                setIsDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                            
                            {/* Add more action buttons as needed */}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <div className="flex items-center text-sm">
                              <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                              <span>{date.toLocaleDateString()} at {date.toLocaleTimeString()}</span>
                            </div>
                            
                            {serve.notes && (
                              <div className="text-sm mt-2">
                                <span className="text-muted-foreground">Notes: </span>
                                {serve.notes}
                              </div>
                            )}
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex items-center text-sm">
                              <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                              <span className="text-muted-foreground">Location: </span>
                              {hasCoordinates ? (
                                <a 
                                  href={googleMapsUrl || '#'} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline ml-1"
                                >
                                  View on map
                                </a>
                              ) : (
                                <span className="ml-1">No location data</span>
                              )}
                            </div>
                            
                            {serve.imageData && (
                              <div className="mt-2">
                                <a 
                                  href={serve.imageData} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-primary text-sm hover:underline inline-flex items-center"
                                >
                                  <FileCheck className="h-4 w-4 mr-1" />
                                  View photo evidence
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ))}
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Serve Attempt</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this serve attempt? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <label className="text-sm font-medium mb-2 block">
              Add a note for the email notification (optional):
            </label>
            <Textarea
              placeholder="Reason for deletion..."
              value={deleteNote}
              onChange={(e) => setDeleteNote(e.target.value)}
              className="w-full"
            />
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteNote('');
                setDeletingServeId(null);
                setIsDeleteDialogOpen(false);
              }}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deletingServeId) {
                  const serve = serves.find(s => s.id === deletingServeId);
                  if (serve) {
                    const client = clients.find(c => c.id === serve.clientId);
                    if (client) {
                      handleDeleteServe(deletingServeId, serve.clientId, serve.caseNumber || 'Unknown', client.email);
                    }
                  }
                }
              }}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ServeHistory;
