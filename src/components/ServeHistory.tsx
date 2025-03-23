
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ClientData } from "./ClientForm";
import { ServeAttemptData } from "./ServeAttempt";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatCoordinates, getGoogleMapsUrl } from "@/utils/gps";
import { Calendar, CheckCircle, X, MapPin, ExternalLink, RefreshCw } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface ServeHistoryProps {
  serves: ServeAttemptData[];
  clients: ClientData[];
  onNewAttempt?: (clientId: string, caseNumber: string, previousAttempts: number) => void;
}

const ServeHistory: React.FC<ServeHistoryProps> = ({ 
  serves, 
  clients,
  onNewAttempt 
}) => {
  const [selectedServe, setSelectedServe] = useState<ServeAttemptData | null>(null);
  const { toast } = useToast();
  
  useEffect(() => {
    console.log("ServeHistory component received serves:", serves.length);
    if (serves.length === 0) {
      console.log("No serves to display");
    }
  }, [serves]);

  const getClientById = (id: string) => {
    return clients.find(client => client.id === id) || null;
  };

  const statusColors = {
    completed: "bg-green-500/10 text-green-700 border-green-200",
    failed: "bg-amber-500/10 text-amber-700 border-amber-200",
  };

  // Group serves by clientId and caseNumber
  const groupedServes = serves.reduce<Record<string, Record<string, ServeAttemptData[]>>>((acc, serve) => {
    if (!serve.clientId || !serve.caseNumber) {
      console.log("Skipping serve with missing clientId or caseNumber:", serve);
      return acc;
    }
    
    if (!acc[serve.clientId]) {
      acc[serve.clientId] = {};
    }
    
    if (!acc[serve.clientId][serve.caseNumber]) {
      acc[serve.clientId][serve.caseNumber] = [];
    }
    
    acc[serve.clientId][serve.caseNumber].push(serve);
    return acc;
  }, {});

  // Log the grouped structure for debugging
  useEffect(() => {
    console.log("Grouped serves structure:", 
      Object.keys(groupedServes).length, "clients,", 
      Object.values(groupedServes).reduce((sum, cases) => sum + Object.keys(cases).length, 0), "cases");
  }, [groupedServes]);

  return (
    <div className="space-y-8">
      {Object.keys(groupedServes).length === 0 && (
        <Card className="neo-card">
          <CardContent className="pt-6 flex flex-col items-center justify-center text-center min-h-[200px]">
            <div className="text-4xl mb-4">📋</div>
            <CardTitle className="mb-2">No serve history</CardTitle>
            <CardDescription>
              When you complete serve attempts, they will appear here.
            </CardDescription>
          </CardContent>
        </Card>
      )}

      {Object.entries(groupedServes).map(([clientId, caseServes]) => {
        const client = getClientById(clientId);
        if (!client) {
          console.log(`No client found for ID: ${clientId}`);
          return null;
        }
        
        return Object.entries(caseServes).map(([caseNumber, serveList]) => {
          // Sort serves by timestamp, newest first
          const sortedServes = [...serveList].sort((a, b) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
          
          // Get the latest serve
          const latestServe = sortedServes[0];
          const successfulServes = serveList.filter(s => s.status === "completed").length;
          
          // Find case name if available
          const caseName = latestServe?.caseNumber;
          
          return (
            <Card key={`${clientId}-${caseNumber}`} className="neo-card overflow-hidden animate-scale-in">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{client.name}</CardTitle>
                    <CardDescription className="mt-1 flex flex-col">
                      <span>Case: {caseName}</span>
                      <span>{client.address}</span>
                    </CardDescription>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {serveList.length} {serveList.length === 1 ? 'attempt' : 'attempts'}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {successfulServes > 0 ? 
                        `${successfulServes} successful` : 
                        'No successful serves'}
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-4">
                  {sortedServes.slice(0, 3).map((serve) => (
                    <div 
                      key={serve.id} 
                      className="flex items-center gap-3 py-2 border-b last:border-0"
                    >
                      <div 
                        className={`flex-shrink-0 w-10 h-10 rounded-md overflow-hidden border ${
                          serve.status === "completed" ? "border-green-200" : "border-amber-200"
                        }`}
                        onClick={() => setSelectedServe(serve)}
                      >
                        <img 
                          src={serve.imageData} 
                          alt="Serve" 
                          className="w-full h-full object-cover cursor-pointer" 
                        />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <div 
                            className={`text-xs px-2 py-0.5 rounded-full border ${
                              statusColors[serve.status]
                            }`}
                          >
                            {serve.status === "completed" ? "Served" : "Failed"}
                          </div>
                          
                          <div className="text-xs text-muted-foreground flex items-center">
                            <Calendar className="w-3 h-3 mr-1" />
                            {new Date(serve.timestamp).toLocaleDateString()}
                          </div>

                          {typeof serve.attemptNumber === 'number' && (
                            <div className="text-xs text-muted-foreground">
                              #{serve.attemptNumber}
                            </div>
                          )}
                        </div>
                        
                        {serve.notes && (
                          <div className="text-xs truncate text-muted-foreground mt-1 pr-4">
                            {serve.notes}
                          </div>
                        )}
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        className="flex-shrink-0 h-8 w-8"
                        onClick={() => setSelectedServe(serve)}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  
                  {sortedServes.length > 3 && (
                    <div className="text-center">
                      <Button 
                        variant="ghost" 
                        className="text-xs text-muted-foreground"
                      >
                        View all {sortedServes.length} attempts
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
              
              <CardFooter>
                {onNewAttempt && (
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => {
                      console.log(`Starting new attempt for client ${clientId} and case ${caseNumber} with ${serveList.length} previous attempts`);
                      onNewAttempt(clientId, caseNumber, serveList.length);
                    }}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    New Attempt
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        });
      })}

      <Dialog open={!!selectedServe} onOpenChange={(open) => !open && setSelectedServe(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Serve Details</DialogTitle>
            <DialogDescription>
              {selectedServe && (
                <span>Attempt #{selectedServe.attemptNumber} - {new Date(selectedServe.timestamp).toLocaleString()}</span>
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedServe && (
            <div className="space-y-4">
              <div className="rounded-md overflow-hidden border">
                <img 
                  src={selectedServe.imageData} 
                  alt="Serve" 
                  className="w-full aspect-[4/3] object-cover" 
                />
              </div>
              
              <div 
                className={`flex items-center px-3 py-2 rounded-md text-sm ${
                  statusColors[selectedServe.status]
                }`}
              >
                {selectedServe.status === "completed" ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Successfully served
                  </>
                ) : (
                  <>
                    <X className="w-4 h-4 mr-2" />
                    Unsuccessful attempt
                  </>
                )}
              </div>
              
              <div className="text-sm space-y-2">
                <div className="font-medium">Location:</div>
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div>
                    {formatCoordinates(
                      selectedServe.coordinates.latitude, 
                      selectedServe.coordinates.longitude
                    )}
                    <div className="mt-1">
                      <a 
                        href={getGoogleMapsUrl(
                          selectedServe.coordinates.latitude, 
                          selectedServe.coordinates.longitude
                        )} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary text-xs flex items-center hover:underline"
                      >
                        View on Google Maps
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
              
              {selectedServe.notes && (
                <div className="text-sm space-y-1">
                  <div className="font-medium">Notes:</div>
                  <div className="text-muted-foreground">
                    {selectedServe.notes}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ServeHistory;
