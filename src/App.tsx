import React, { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { TransitionGroup, CSSTransition } from "react-transition-group";
import NotFound from "./pages/NotFound";
import Dashboard from "./pages/Dashboard";
import NewServe from "./pages/NewServe";
import DataExport from "./pages/DataExport";
import Clients from "./pages/Clients";
import History from "./pages/History";
import Layout from "./components/Layout";
import { ClientData } from "./components/ClientForm";
import { ServeAttemptData } from "./components/ServeAttempt";
import { 
  supabase, 
  setupRealtimeSubscription, 
  syncLocalServesToSupabase, 
  syncSupabaseServesToLocal,
  deleteServeAttempt
} from "./lib/supabase";
import { toast } from "sonner";

const queryClient = new QueryClient();

const AnimatedRoutes = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [clients, setClients] = useState<ClientData[]>(() => {
    const savedClients = localStorage.getItem("serve-tracker-clients");
    return savedClients ? JSON.parse(savedClients) : [];
  });
  
  const [serves, setServes] = useState<ServeAttemptData[]>(() => {
    const savedServes = localStorage.getItem("serve-tracker-serves");
    console.log("Initial load from localStorage serve-tracker-serves:", 
      savedServes ? JSON.parse(savedServes).length : 0, "entries");
    return savedServes ? JSON.parse(savedServes) : [];
  });

  const [isInitialSync, setIsInitialSync] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const cleanupSubscription = setupRealtimeSubscription();
    
    return () => {
      cleanupSubscription();
    };
  }, []);

  useEffect(() => {
    const performInitialSync = async () => {
      if (isInitialSync) {
        setIsSyncing(true);
        try {
          console.log("Performing initial sync from Supabase to local storage");
          
          const supabaseServes = await syncSupabaseServesToLocal();
          
          if (supabaseServes && supabaseServes.length > 0) {
            setServes(supabaseServes);
            console.log(`Synced ${supabaseServes.length} serves from Supabase`);
            toast.success(`Synced ${supabaseServes.length} records from database`);
          } else {
            setServes([]);
            localStorage.setItem("serve-tracker-serves", JSON.stringify([]));
            console.log("No serves in Supabase, cleared local storage");
          }
          
          setIsInitialSync(false);
        } catch (error) {
          console.error("Error during initial sync:", error);
          toast.error("Failed to sync with database");
        } finally {
          setIsSyncing(false);
        }
      }
    };
    
    performInitialSync();
  }, [isInitialSync]);

  useEffect(() => {
    const syncInterval = setInterval(async () => {
      try {
        console.log("Running periodic sync...");
        const supabaseServes = await syncSupabaseServesToLocal();
        if (supabaseServes) {
          setServes(supabaseServes);
          console.log(`Periodic sync: updated with ${supabaseServes.length} serves from Supabase`);
        }
      } catch (error) {
        console.error("Error during periodic sync:", error);
      }
    }, 10000); // Sync every 10 seconds
    
    return () => {
      clearInterval(syncInterval);
    };
  }, []);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const { data, error } = await supabase
          .from('clients')
          .select('*');
          
        if (error) {
          throw error;
        }
        
        if (data && data.length > 0) {
          localStorage.setItem("serve-tracker-clients", JSON.stringify(data));
          setClients(data);
          console.log(`Loaded ${data.length} clients from Supabase`);
        } else {
          setClients([]);
          localStorage.setItem("serve-tracker-clients", JSON.stringify([]));
          console.log("No clients in Supabase, cleared local storage");
        }
      } catch (error) {
        console.error("Error fetching clients from Supabase:", error);
        toast.error("Failed to load clients from database");
      }
    };
    
    fetchClients();
  }, []);

  useEffect(() => {
    localStorage.setItem("serve-tracker-clients", JSON.stringify(clients));
  }, [clients]);

  useEffect(() => {
    localStorage.setItem("serve-tracker-serves", JSON.stringify(serves));
    console.log("Updated localStorage serve-tracker-serves:", serves.length, "entries");
  }, [serves]);

  const addClient = async (client: ClientData) => {
    try {
      const { error } = await supabase
        .from('clients')
        .insert(client);
        
      if (error) {
        console.error("Error saving client to Supabase:", error);
        toast.error("Failed to save client to database", {
          description: error.message
        });
      } else {
        console.log("Successfully saved client to Supabase:", client);
        toast.success("Client saved successfully");
        setClients([...clients, client]);
      }
    } catch (error) {
      console.error("Exception saving client:", error);
      toast.error("An unexpected error occurred");
    }
  };

  const updateClient = async (updatedClient: ClientData) => {
    try {
      const { error } = await supabase
        .from('clients')
        .update(updatedClient)
        .eq('id', updatedClient.id);
        
      if (error) {
        console.error("Error updating client in Supabase:", error);
        toast.error("Failed to update client in database", {
          description: error.message
        });
      } else {
        console.log("Successfully updated client in Supabase:", updatedClient);
        toast.success("Client updated successfully");
        setClients(clients.map(client => 
          client.id === updatedClient.id ? updatedClient : client
        ));
      }
    } catch (error) {
      console.error("Exception updating client:", error);
      toast.error("An unexpected error occurred");
    }
  };

  const deleteClient = async (clientId: string) => {
    try {
      console.log("Deleting client with ID:", clientId);
      
      const { data: serveData, error: serveError } = await supabase
        .from('serve_attempts')
        .select('id')
        .eq('client_id', clientId);

      if (serveError) {
        console.error("Error finding serve attempts for client:", serveError);
      } else if (serveData && serveData.length > 0) {
        console.log(`Found ${serveData.length} serve attempts to delete`);
        for (const serve of serveData) {
          await deleteServeAttempt(serve.id);
        }
        console.log("Successfully deleted client serve attempts");
      }
      
      const { error: casesError } = await supabase
        .from('client_cases')
        .delete()
        .eq('client_id', clientId);
        
      if (casesError) {
        console.error("Error deleting client cases:", casesError);
      } else {
        console.log("Successfully deleted client cases");
      }
      
      const { data: docsData, error: docsError } = await supabase
        .from('client_documents')
        .select('id, file_path')
        .eq('client_id', clientId);
        
      if (docsError) {
        console.error("Error finding client documents:", docsError);
      } else if (docsData && docsData.length > 0) {
        for (const doc of docsData) {
          if (doc.file_path) {
            await supabase.storage
              .from('client-documents')
              .remove([doc.file_path]);
          }
          
          await supabase
            .from('client_documents')
            .delete()
            .eq('id', doc.id);
        }
        console.log("Successfully deleted client documents");
      }
      
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientId);
        
      if (error) {
        console.error("Error deleting client from Supabase:", error);
        toast.error("Failed to delete client from database", {
          description: error.message
        });
        return false;
      }
      
      const updatedClients = clients.filter(client => client.id !== clientId);
      setClients(updatedClients);
      
      const updatedServes = await syncSupabaseServesToLocal();
      setServes(updatedServes || []);
      
      console.log(`Removed client from state and localStorage. Remaining clients: ${updatedClients.length}`);
      toast.success("Client deleted successfully");
      return true;
    } catch (error) {
      console.error("Error updating local state after client deletion:", error);
      toast.error("An unexpected error occurred");
      return false;
    }
  };

  const addServe = async (serve: ServeAttemptData) => {
    console.log("Adding new serve:", serve);
    const newServe = {
      ...serve,
      id: serve.id || `serve-${Date.now()}`,
    };
    
    try {
      const { data, error } = await supabase
        .from('serve_attempts')
        .insert({
          id: newServe.id,
          client_id: newServe.clientId,
          case_number: newServe.caseNumber,
          status: newServe.status,
          notes: newServe.notes,
          coordinates: newServe.coordinates,
          timestamp: newServe.timestamp,
          image_data: newServe.imageData,
          attempt_number: newServe.attemptNumber
        })
        .select();
      
      if (error) {
        console.error("Error saving serve attempt to Supabase:", error);
        toast.error("Failed to save serve attempt to database", {
          description: error.message
        });
      } else {
        console.log("Successfully saved serve attempt to Supabase:", data);
        toast.success("Serve attempt saved successfully");
        
        const supabaseServes = await syncSupabaseServesToLocal();
        if (supabaseServes && supabaseServes.length > 0) {
          setServes(supabaseServes);
        } else {
          setServes(prevServes => [newServe, ...prevServes]);
        }
      }
    } catch (error) {
      console.error("Exception saving serve attempt:", error);
      toast.error("An unexpected error occurred");
      setServes(prevServes => [newServe, ...prevServes]);
    }
  };

  const deleteServe = async (serveId: string) => {
    try {
      console.log("Removing serve attempt from state:", serveId);
      
      const result = await deleteServeAttempt(serveId);
      
      if (!result.success) {
        console.error("Error deleting serve attempt:", result.error);
        toast.error("Failed to delete record", {
          description: result.error || "Please try again"
        });
        return false;
      }
      
      setServes(serves.filter(serve => serve.id !== serveId));
      
      return true;
    } catch (error) {
      console.error("Error removing serve attempt from state:", error);
      return false;
    }
  };

  useEffect(() => {
    if (location.pathname === "/new-serve" && location.search) {
      const params = new URLSearchParams(location.search);
      const clientId = params.get("clientId");
      const attempts = params.get("attempts");
      
      if (!clientId || !clients.some(c => c.id === clientId)) {
        navigate("/new-serve");
      }
    }
  }, [location, clients, navigate]);

  return (
    <TransitionGroup component={null}>
      <CSSTransition key={location.key} classNames="page" timeout={400}>
        <Routes location={location}>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard clients={clients} serves={serves} />} />
            <Route path="new-serve" element={
              <NewServe 
                clients={clients} 
                addServe={addServe} 
                clientId={new URLSearchParams(location.search).get("clientId") || undefined}
                previousAttempts={Number(new URLSearchParams(location.search).get("attempts")) || 0}
              />
            } />
            <Route path="clients" element={
              <Clients 
                clients={clients}
                addClient={addClient}
                updateClient={updateClient}
                deleteClient={deleteClient}
              />
            } />
            <Route path="history" element={
              <History 
                serves={serves} 
                clients={clients} 
                deleteServe={deleteServe}
              />
            } />
            <Route path="export" element={<DataExport />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </CSSTransition>
    </TransitionGroup>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AnimatedRoutes />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
