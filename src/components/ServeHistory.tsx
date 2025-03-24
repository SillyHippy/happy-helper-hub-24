import React, { useState } from 'react';
import { ServeAttemptData } from './ServeAttempt';
import { ClientData } from './ClientForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, MapPin, Edit2, Trash2, Plus, FileCheck, MapPinOff } from 'lucide-react';
import { deleteServeAttempt } from '@/lib/supabase';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { formatCoordinates, getGoogleMapsUrl, isGeolocationCoordinates, safeFormatCoordinates, safeGetGoogleMapsUrl } from '@/utils/gps';

interface ServeHistoryProps {
  serves: ServeAttemptData[];
  clients: ClientData[];
  onNewAttempt?: (clientId: string, caseNumber: string, previousAttempts: number) => void;
  onDelete?: (serveId: string) => Promise<boolean>;
  onEdit?: (serve: ServeAttemptData) => void;
}

const ServeHistory: React.FC<ServeHistoryProps> = ({ 
  serves, 
  clients, 
  onNewAttempt, 
  onDelete,
  onEdit
}) => {
  const [deletingServeId, setDeletingServeId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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
  
  const handleDeleteServe = async (serveId: string) => {
    setIsDeleting(true);
    
    try {
      console.log(`Deleting serve attempt with ID: ${serveId}`);
      
      const result = await deleteServeAttempt(serveId);
      
      if (!result.success) {
        console.error("Error deleting serve attempt:", result.error);
        toast.error("Failed to delete record", {
          description: result.error || "Please try again"
        });
      } else {
        console.log("Successfully deleted from Supabase");
        toast.success("Record deleted successfully");
        
        if (onDelete) {
          await onDelete(serveId);
        }
      }
      
      setIsDeleteDialogOpen(false);
      setDeletingServeId(null);
    } catch (error) {
      console.error("Unexpected error deleting serve attempt:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsDeleting(false);
    }
  };
  
  const handleNewAttempt = (clientId: string, caseNumber: string, previousAttempts: number) => {
    if (onNewAttempt) {
      onNewAttempt(clientId, caseNumber, previousAttempts);
    }
  };
  
  const sortedClients = Object.keys(groupedServes).sort();
  
  return (
    <div className="space-y-8">
      {sortedClients.map(clientName => (
        <div key={clientName} className="space-y-4">
          <h3 className="text-xl font-semibold">{clientName}</h3>
          
          {Object.entries(groupedServes[clientName]).map(([caseNumber, caseServes]) => {
            const sortedServes = [...caseServes].sort((a, b) => 
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            );
            
            const client = clients.find(c => c.name === clientName);
            const clientId = client?.id || "";
            
            return (
              <Card key={caseNumber} className="overflow-hidden">
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
                    
                    const hasCoordinates = isGeolocationCoordinates(serve.coordinates);
                    console.log(`Serve #${index} coordinates:`, serve.coordinates, "Has coordinates:", hasCoordinates);
                    
                    let googleMapsUrl = '#';
                    let formattedCoords = 'No location data';
                    
                    if (hasCoordinates) {
                      try {
                        googleMapsUrl = safeGetGoogleMapsUrl(serve.coordinates);
                        formattedCoords = safeFormatCoordinates(serve.coordinates);
                        console.log("Formatted coordinates:", formattedCoords);
                        console.log("Google Maps URL:", googleMapsUrl);
                      } catch (error) {
                        console.error("Error formatting coordinates:", error);
                      }
                    }
                    
                    const statusClass = serve.status === "completed" ? 
                      "bg-green-100 text-green-800" : 
                      "bg-amber-100 text-amber-800";
                    
                    return (
                      <div key={serve.id} className={`p-3 sm:p-4 ${index !== sortedServes.length - 1 ? 'border-b' : ''}`}>
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
                            {onEdit && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 w-8 p-0"
                                title="Edit attempt"
                                onClick={() => onEdit(serve)}
                              >
                                <Edit2 className="h-4 w-4 text-primary" />
                              </Button>
                            )}
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
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <div className="flex items-center text-sm">
                              <Clock className="h-4 w-4 mr-2 text-muted-foreground flex-shrink-0" />
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
                            <div className="flex items-start text-sm">
                              {hasCoordinates ? (
                                <MapPin className="h-4 w-4 mr-2 text-muted-foreground flex-shrink-0 mt-0.5" />
                              ) : (
                                <MapPinOff className="h-4 w-4 mr-2 text-muted-foreground flex-shrink-0 mt-0.5" />
                              )}
                              <div>
                                {hasCoordinates ? (
                                  <>
                                    <div className="mb-1">{formattedCoords}</div>
                                    <a 
                                      href={googleMapsUrl} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-primary hover:underline inline-flex items-center"
                                    >
                                      View on Google Maps
                                    </a>
                                  </>
                                ) : (
                                  <span>No location data</span>
                                )}
                              </div>
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
      
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Serve Attempt</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this serve attempt? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
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
                  handleDeleteServe(deletingServeId);
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
