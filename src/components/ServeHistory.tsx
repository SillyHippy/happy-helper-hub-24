
import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
import { Plus, MapPin, Clock, Trash, FileEdit } from "lucide-react";
import { ServeAttemptData } from "./ServeAttempt";
import { ClientData } from "./ClientForm";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import ServeAttemptEdit from "./ServeAttemptEdit";

interface ServeHistoryProps {
  serves: ServeAttemptData[];
  clients: ClientData[];
  onNewAttempt?: (clientId: string, caseNumber: string, previousAttempts: number) => void;
  onDelete?: (serveId: string) => Promise<boolean>;
}

const ServeHistory: React.FC<ServeHistoryProps> = ({ 
  serves, 
  clients, 
  onNewAttempt,
  onDelete
}) => {
  const [deleteServeId, setDeleteServeId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedServe, setSelectedServe] = useState<ServeAttemptData | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const isMobile = useIsMobile();

  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    return client ? client.name : "Unknown Client";
  };

  const getClientById = (clientId: string) => {
    return clients.find(c => c.id === clientId) || null;
  };

  const handleDeleteServe = async () => {
    if (!deleteServeId || !onDelete) return;
    
    try {
      setIsDeleting(true);
      const success = await onDelete(deleteServeId);
      
      if (success) {
        toast.success("Serve attempt deleted successfully");
      } else {
        toast.error("Failed to delete serve attempt");
      }
    } catch (error) {
      console.error("Error deleting serve attempt:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsDeleting(false);
      setDeleteServeId(null);
    }
  };

  const handleNewAttempt = (clientId: string, caseNumber: string, previousAttempts: number) => {
    if (onNewAttempt) {
      onNewAttempt(clientId, caseNumber, previousAttempts);
    }
  };

  const handleEditServe = (serve: ServeAttemptData) => {
    setSelectedServe(serve);
    setEditDialogOpen(true);
  };

  const handleServeUpdate = () => {
    toast.success("Refreshing data...");
    // The parent component will handle the actual data refresh via props
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  // Count number of attempts per case
  const attemptsPerCase = serves.reduce((acc, serve) => {
    const key = `${serve.clientId}-${serve.caseNumber}`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Format the mobile view of each serve attempt
  const renderMobileServeCard = (serve: ServeAttemptData) => {
    const clientName = getClientName(serve.clientId);
    const client = getClientById(serve.clientId);
    const serveDate = new Date(serve.timestamp);
    const attempts = attemptsPerCase[`${serve.clientId}-${serve.caseNumber}`] || 1;
    
    return (
      <Card key={serve.id} className="mb-4 neo-card">
        <CardContent className="p-4">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="font-semibold">{clientName}</h3>
              <p className="text-sm text-muted-foreground">Case: {serve.caseNumber}</p>
            </div>
            <div className={`px-2 py-1 rounded text-xs ${
              serve.status.toLowerCase() === 'completed' ? 'bg-green-100 text-green-800' :
              serve.status.toLowerCase() === 'failed' ? 'bg-red-100 text-red-800' :
              'bg-yellow-100 text-yellow-800'
            }`}>
              {serve.status}
            </div>
          </div>
          
          <div className="space-y-2 mt-3 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{serveDate.toLocaleString()}</span>
            </div>
            
            {serve.coordinates && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <a
                  href={`https://www.google.com/maps?q=${serve.coordinates.latitude},${serve.coordinates.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  View Location
                </a>
              </div>
            )}
            
            {serve.notes && (
              <div className="mt-2 border-t pt-2">
                <p className="text-sm text-muted-foreground">{serve.notes}</p>
              </div>
            )}
          </div>
          
          <div className="flex justify-between mt-4 pt-2 border-t">
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleEditServe(serve)}
              >
                <FileEdit className="h-4 w-4 mr-1" />
                Edit
              </Button>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => setDeleteServeId(serve.id)}
                  >
                    <Trash className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Serve Attempt</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this serve attempt? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setDeleteServeId(null)}>
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteServe}
                      disabled={isDeleting}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {isDeleting ? "Deleting..." : "Delete"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleNewAttempt(serve.clientId, serve.caseNumber, attempts)}
            >
              <Plus className="h-4 w-4 mr-1" />
              New Attempt
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  // For desktop view, use a table
  if (isMobile) {
    return (
      <div className="space-y-4">
        {serves.map(serve => renderMobileServeCard(serve))}
        
        {selectedServe && (
          <ServeAttemptEdit
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            serve={selectedServe}
            client={getClientById(selectedServe.clientId) || { name: "Unknown", email: "", phone: "", address: "", notes: "" }}
            onUpdate={handleServeUpdate}
          />
        )}
        
        <AlertDialog>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Serve Attempt</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this serve attempt? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setDeleteServeId(null)}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteServe}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  return (
    <Card className="neo-card">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Case Number</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {serves.map(serve => {
                const clientName = getClientName(serve.clientId);
                const serveDate = new Date(serve.timestamp);
                const attempts = attemptsPerCase[`${serve.clientId}-${serve.caseNumber}`] || 1;
                
                return (
                  <TableRow key={serve.id}>
                    <TableCell className="font-medium">{clientName}</TableCell>
                    <TableCell>{serve.caseNumber}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs ${
                        serve.status.toLowerCase() === 'completed' ? 'bg-green-100 text-green-800' :
                        serve.status.toLowerCase() === 'failed' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {serve.status}
                      </span>
                    </TableCell>
                    <TableCell>{serveDate.toLocaleString()}</TableCell>
                    <TableCell>
                      {serve.notes ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help underline decoration-dotted">
                                View Notes
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-sm whitespace-normal">
                              <p>{serve.notes}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <span className="text-muted-foreground">None</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {serve.coordinates ? (
                        <a
                          href={`https://www.google.com/maps?q=${serve.coordinates.latitude},${serve.coordinates.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline flex items-center"
                        >
                          <MapPin className="h-4 w-4 mr-1" />
                          Map
                        </a>
                      ) : (
                        <span className="text-muted-foreground">No location</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditServe(serve)}
                        >
                          <FileEdit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-destructive hover:bg-destructive/10"
                              onClick={() => setDeleteServeId(serve.id)}
                            >
                              <Trash className="h-4 w-4 mr-1" />
                              Delete
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Serve Attempt</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this serve attempt? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel onClick={() => setDeleteServeId(null)}>
                                Cancel
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={handleDeleteServe}
                                disabled={isDeleting}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                {isDeleting ? "Deleting..." : "Delete"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleNewAttempt(serve.clientId, serve.caseNumber, attempts)}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          New Attempt
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      
      {selectedServe && (
        <ServeAttemptEdit
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          serve={selectedServe}
          client={getClientById(selectedServe.clientId) || { name: "Unknown", email: "", phone: "", address: "", notes: "" }}
          onUpdate={handleServeUpdate}
        />
      )}
    </Card>
  );
};

export default ServeHistory;
