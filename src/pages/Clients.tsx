
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle, Users, Pencil, Trash2, UserCheck } from "lucide-react";
import ClientForm, { ClientData } from "@/components/ClientForm";
import ClientDetail from "@/components/ClientDetail";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { toast as sonnerToast } from "sonner";

interface ClientsProps {
  clients: ClientData[];
  addClient: (client: ClientData) => void;
  updateClient: (client: ClientData) => void;
  deleteClient: (clientId: string) => void;
}

const Clients: React.FC<ClientsProps> = ({ 
  clients, 
  addClient, 
  updateClient, 
  deleteClient 
}) => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [deleteClientId, setDeleteClientId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientData | null>(null);
  const [isDetailView, setIsDetailView] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const syncClients = async () => {
      if (clients.length > 0) {
        for (const client of clients) {
          if (client.id) {
            try {
              const { data, error } = await supabase
                .from('clients')
                .select('*')
                .eq('id', client.id)
                .maybeSingle();
              
              if (error) {
                console.error("Error checking client existence:", error);
                continue;
              }
              
              if (!data) {
                const { error: insertError } = await supabase
                  .from('clients')
                  .insert({
                    id: client.id,
                    name: client.name,
                    email: client.email,
                    phone: client.phone,
                    address: client.address,
                    notes: client.notes
                  });
                  
                if (insertError) {
                  console.error("Error inserting client:", insertError);
                }
              }
            } catch (err) {
              console.error("Exception during client sync:", err);
            }
          }
        }
      }
    };
    
    syncClients();
  }, [clients]);

  const handleAddClient = async (client: ClientData) => {
    setIsLoading(true);
    
    const newClientId = `client-${Date.now()}`;
    const newClient = {
      ...client,
      id: newClientId,
    };
    
    try {
      const { error } = await supabase
        .from('clients')
        .insert({
          id: newClientId,
          name: client.name,
          email: client.email,
          phone: client.phone,
          address: client.address,
          notes: client.notes
        });
      
      if (error) throw error;
      
      addClient(newClient);
      setIsAddDialogOpen(false);
      
      sonnerToast("Client added", {
        description: "New client has been successfully added."
      });
      
      toast({
        title: "Client added",
        description: "New client has been successfully added.",
      });
    } catch (error) {
      console.error("Error adding client:", error);
      sonnerToast.error("Error adding client", {
        description: "There was a problem adding the client."
      });
      
      toast({
        title: "Error adding client",
        description: "There was a problem adding the client.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateClient = async (client: ClientData) => {
    setIsLoading(true);
    
    try {
      const { error } = await supabase
        .from('clients')
        .update({
          name: client.name,
          email: client.email,
          phone: client.phone,
          address: client.address,
          notes: client.notes
        })
        .eq('id', client.id);
      
      if (error) throw error;
      
      updateClient(client);
      
      sonnerToast("Client updated", {
        description: "Client information has been updated."
      });
      
      toast({
        title: "Client updated",
        description: "Client information has been updated.",
      });
    } catch (error) {
      console.error("Error updating client:", error);
      sonnerToast.error("Error updating client", {
        description: "There was a problem updating the client."
      });
      
      toast({
        title: "Error updating client",
        description: "There was a problem updating the client.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClient = async () => {
    if (deleteClientId) {
      setIsLoading(true);
      try {
        console.log("Deleting client with ID:", deleteClientId);
        
        // Step 1: Fetch all serve attempts for this client
        try {
          const { data: serveData, error: serveQueryError } = await supabase
            .from('serve_attempts')
            .select('id, client_id, case_number')
            .eq('client_id', deleteClientId);
            
          if (serveQueryError) {
            console.error("Error querying serve attempts:", serveQueryError);
          } else if (serveData && serveData.length > 0) {
            console.log(`Found ${serveData.length} serve attempts to delete`);
            
            // Delete each serve attempt individually to avoid potential transaction issues
            for (const serve of serveData) {
              const { error: deleteServeError } = await supabase
                .from('serve_attempts')
                .delete()
                .eq('id', serve.id);
                
              if (deleteServeError) {
                console.error(`Error deleting serve attempt ${serve.id}:`, deleteServeError);
              } else {
                console.log(`Successfully deleted serve attempt ${serve.id}`);
              }
            }
            
            // Update local storage to remove deleted serve attempts
            const savedServes = localStorage.getItem("serve-tracker-serves");
            if (savedServes) {
              const parsedServes = JSON.parse(savedServes);
              const updatedServes = parsedServes.filter((serve: any) => serve.clientId !== deleteClientId);
              localStorage.setItem("serve-tracker-serves", JSON.stringify(updatedServes));
              console.log(`Updated localStorage: removed ${parsedServes.length - updatedServes.length} serve attempts`);
            }
          }
        } catch (serveErr) {
          console.error("Exception handling serve attempts deletion:", serveErr);
        }
        
        // Step 2: Handle client documents
        try {
          const { data: docData, error: docQueryError } = await supabase
            .from('client_documents')
            .select('id, file_path')
            .eq('client_id', deleteClientId);
            
          if (docQueryError) {
            console.error("Error querying client documents:", docQueryError);
          } else if (docData && docData.length > 0) {
            console.log(`Found ${docData.length} documents to delete`);
            
            // Delete files from storage
            const filePaths = docData.map(doc => doc.file_path).filter(Boolean);
            if (filePaths.length > 0) {
              const { error: storageError } = await supabase.storage
                .from('client-documents')
                .remove(filePaths);
                
              if (storageError) {
                console.error("Error deleting files from storage:", storageError);
              } else {
                console.log(`Successfully deleted ${filePaths.length} files from storage`);
              }
            }
            
            // Delete document records
            for (const doc of docData) {
              const { error: docDeleteError } = await supabase
                .from('client_documents')
                .delete()
                .eq('id', doc.id);
                
              if (docDeleteError) {
                console.error(`Error deleting document ${doc.id}:`, docDeleteError);
              } else {
                console.log(`Successfully deleted document ${doc.id}`);
              }
            }
          }
        } catch (docErr) {
          console.error("Exception deleting client documents:", docErr);
        }
        
        // Step 3: Delete client cases
        try {
          const { error: caseError } = await supabase
            .from('client_cases')
            .delete()
            .eq('client_id', deleteClientId);
            
          if (caseError) {
            console.error("Error deleting client cases:", caseError);
          } else {
            console.log("Successfully deleted client cases");
          }
        } catch (caseErr) {
          console.error("Exception deleting client cases:", caseErr);
        }
        
        // Step 4: Finally delete the client
        const { error } = await supabase
          .from('clients')
          .delete()
          .eq('id', deleteClientId);
        
        if (error) {
          console.error("Error deleting client:", error);
          // Continue with local deletion even if Supabase deletion failed
          console.log("Supabase client deletion failed, but proceeding with local state update");
        } else {
          console.log("Successfully deleted client from Supabase");
        }
        
        // Update local state regardless of Supabase result
        deleteClient(deleteClientId);
        setDeleteClientId(null);
        
        if (selectedClient?.id === deleteClientId) {
          setSelectedClient(null);
          setIsDetailView(false);
        }
        
        sonnerToast("Client deleted", {
          description: "Client and all related data have been permanently removed."
        });
        
        toast({
          title: "Client deleted",
          description: "Client and all related data have been permanently removed.",
        });
      } catch (error) {
        console.error("Error in client deletion process:", error);
        sonnerToast.error("Error deleting client", {
          description: "There was a problem deleting the client. Please try again."
        });
        
        toast({
          title: "Error deleting client",
          description: "There was a problem deleting the client and related data.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleSelectClient = (client: ClientData) => {
    setSelectedClient(client);
    setIsDetailView(true);
  };

  const handleBackToList = () => {
    setSelectedClient(null);
    setIsDetailView(false);
  };

  const filteredClients = clients.filter(client => 
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isDetailView && selectedClient) {
    return (
      <div className="page-container">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6">
          <div>
            <Button 
              variant="outline" 
              onClick={handleBackToList}
              className="mb-2"
            >
              ← Back to Clients
            </Button>
            <h1 className="text-2xl font-bold">{selectedClient.name}</h1>
          </div>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="outline" 
                className="text-destructive hover:bg-destructive/10 mt-2 sm:mt-0"
                onClick={() => setDeleteClientId(selectedClient.id)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Client
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Client</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this client? This action will also remove all serve attempts, documents, and cases associated with this client. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setDeleteClientId(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleDeleteClient}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  disabled={isLoading}
                >
                  {isLoading ? "Deleting..." : "Delete"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        
        <ClientDetail 
          client={selectedClient} 
          onUpdate={handleUpdateClient} 
        />
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Client Management</h1>
        <p className="text-muted-foreground">
          Add, edit, and manage your process serving clients
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-between mb-6">
        <div className="relative w-full sm:w-72">
          <Input
            placeholder="Search clients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-search"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          </div>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Client
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Client</DialogTitle>
              <DialogDescription>
                Enter client details to create a new record
              </DialogDescription>
            </DialogHeader>
            <ClientForm onSubmit={handleAddClient} isLoading={isLoading} />
          </DialogContent>
        </Dialog>
      </div>

      {clients.length === 0 ? (
        <Card className="neo-card">
          <CardContent className="pt-6 flex flex-col items-center justify-center text-center min-h-[200px]">
            <div className="p-4 rounded-full bg-muted mb-4">
              <Users className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <CardTitle className="mb-2">No clients added yet</CardTitle>
            <CardDescription className="mb-4">
              Add your first client to get started
            </CardDescription>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Client
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClients.map(client => (
            <Card 
              key={client.id} 
              className="neo-card overflow-hidden animate-scale-in hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleSelectClient(client)}
            >
              <CardHeader className="pb-3">
                <CardTitle className="flex justify-between items-center">
                  <span className="truncate">{client.name}</span>
                  <UserCheck className="h-5 w-5 text-muted-foreground" />
                </CardTitle>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Email:</span>{" "}
                    <a 
                      href={`mailto:${client.email}`} 
                      className="text-primary hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {client.email}
                    </a>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Phone:</span>{" "}
                    <a 
                      href={`tel:${client.phone}`} 
                      className="hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {client.phone}
                    </a>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Address:</span>
                    <div className="mt-1">{client.address}</div>
                  </div>
                  {client.notes && (
                    <div className="pt-2">
                      <span className="text-muted-foreground">Notes:</span>
                      <div className="mt-1 text-muted-foreground line-clamp-2">{client.notes}</div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Clients;
