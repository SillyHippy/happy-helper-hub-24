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
  syncSupabaseServesToLocal 
} from "./lib/supabase";
import { useToast } from "./hooks/use-toast";
import { toast } from "sonner";

const queryClient = new QueryClient();

// Wrap routes with transition animations
const AnimatedRoutes = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast: uiToast } = useToast();
  
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

  // Setup realtime subscription for serve attempts
  useEffect(() => {
    const cleanupSubscription = setupRealtimeSubscription();
    return () => cleanupSubscription();
  }, []);

  // Initial sync from Supabase to local when app loads
  useEffect(() => {
    const performInitialSync = async () => {
      if (isInitialSync) {
        setIsSyncing(true);
        try {
          console.log("Performing initial sync from Supabase to local storage");
          
          // First sync any missing local serves to Supabase
          await syncLocalServesToSupabase();
          
          // Then sync any missing Supabase serves to local
          const mergedServes = await syncSupabaseServesToLocal();
          if (mergedServes && mergedServes.length > 0) {
            setServes(mergedServes);
            toast("Data synchronized", {
              description: "Serve data has been synced between your devices"
            });
          }
          
          setIsInitialSync(false);
        } catch (error) {
          console.error("Error during initial sync:", error);
          toast("Sync error", {
            description: "There was an error syncing data. Some information may be out of date."
          });
        } finally {
          setIsSyncing(false);
        }
      }
    };
    
    performInitialSync();
  }, [isInitialSync]);

  // Force re-sync when page becomes visible again (user returns to tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log("Page became visible, triggering re-sync");
        setIsInitialSync(true);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Fetch all clients from Supabase to ensure we have the most up-to-date data
  useEffect(() => {
    const fetchClients = async () => {
      try {
        // First get existing local clients
        const localClientsJSON = localStorage.getItem("serve-tracker-clients");
        const localClients = localClientsJSON ? JSON.parse(localClientsJSON) : [];
        const localClientIds = new Set(localClients.map(client => client.id));
        
        // Fetch clients from Supabase
        const { data, error } = await supabase
          .from('clients')
          .select('*');
          
        if (error) {
          throw error;
        }
        
        if (data && data.length > 0) {
          // Merge Supabase clients with local clients
          const mergedClients = [...localClients];
          let hasNewClients = false;
          
          for (const supabaseClient of data) {
            if (!localClientIds.has(supabaseClient.id)) {
              // This is a new client from Supabase
              mergedClients.push(supabaseClient);
              hasNewClients = true;
            }
          }
          
          // Only update state and localStorage if we have new clients
          if (hasNewClients) {
            localStorage.setItem("serve-tracker-clients", JSON.stringify(mergedClients));
            setClients(mergedClients);
            console.log("Merged clients from Supabase with local clients:", mergedClients);
            
            // Notify user of new clients
            toast("Clients synchronized", {
              description: "New client data has been synced from the cloud"
            });
          }
        }
        
        // Also sync local clients to Supabase
        for (const client of localClients) {
          const { data: existingClient, error: checkError } = await supabase
            .from('clients')
            .select('id')
            .eq('id', client.id)
            .maybeSingle();
            
          if (checkError) {
            console.error("Error checking if client exists:", checkError);
            continue;
          }
          
          if (!existingClient) {
            // Client doesn't exist in Supabase, insert it
            const { error: insertError } = await supabase
              .from('clients')
              .insert(client);
              
            if (insertError) {
              console.error("Error inserting client to Supabase:", insertError);
            } else {
              console.log(`Successfully synced client ${client.id} to Supabase`);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching clients from Supabase:", error);
        uiToast({
          title: "Error syncing clients",
          description: "Unable to sync with the database. Some client data may be outdated.",
          variant: "destructive"
        });
      }
    };
    
    fetchClients();
  }, []);

  // Persist data to localStorage when it changes
  useEffect(() => {
    localStorage.setItem("serve-tracker-clients", JSON.stringify(clients));
  }, [clients]);

  useEffect(() => {
    localStorage.setItem("serve-tracker-serves", JSON.stringify(serves));
    console.log("Updated localStorage serve-tracker-serves:", serves.length, "entries");
  }, [serves]);

  // Client CRUD operations
  const addClient = async (client: ClientData) => {
    // Update local state first for immediate feedback
    setClients([...clients, client]);
    
    // Then try to save to Supabase
    try {
      const { error } = await supabase
        .from('clients')
        .insert(client);
        
      if (error) {
        console.error("Error saving client to Supabase:", error);
        toast("Sync warning", {
          description: "Client saved locally but couldn't sync to cloud. It will sync later.",
          duration: 5000
        });
      } else {
        console.log("Successfully saved client to Supabase:", client);
      }
    } catch (error) {
      console.error("Exception saving client:", error);
    }
  };

  const updateClient = async (updatedClient: ClientData) => {
    // Update local state
    setClients(clients.map(client => 
      client.id === updatedClient.id ? updatedClient : client
    ));
    
    // Then update in Supabase
    try {
      const { error } = await supabase
        .from('clients')
        .update(updatedClient)
        .eq('id', updatedClient.id);
        
      if (error) {
        console.error("Error updating client in Supabase:", error);
        toast("Sync warning", {
          description: "Client updated locally but couldn't sync to cloud. It will sync later.",
          duration: 5000
        });
      } else {
        console.log("Successfully updated client in Supabase:", updatedClient);
      }
    } catch (error) {
      console.error("Exception updating client:", error);
    }
  };

  const deleteClient = async (clientId: string) => {
    try {
      // Delete from Supabase first
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientId);
      
      if (error) throw error;
      
      // Then update the local state
      setClients(clients.filter(client => client.id !== clientId));
      
      // Also remove any serves associated with this client
      setServes(serves.filter(serve => serve.clientId !== clientId));
      
      uiToast({
        title: "Client deleted",
        description: "Client has been permanently removed.",
      });
    } catch (error) {
      console.error("Error deleting client:", error);
      uiToast({
        title: "Error deleting client",
        description: "There was a problem deleting the client. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Serve operations
  const addServe = async (serve: ServeAttemptData) => {
    console.log("Adding new serve:", serve);
    const newServe = {
      ...serve,
      id: serve.id || `serve-${Date.now()}`,
    };
    
    // Update local state first for immediate feedback
    setServes([newServe, ...serves]);
    console.log("Updated serves array, new length:", serves.length + 1);
    
    // Try to save to Supabase
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
        toast("Sync warning", {
          description: "Serve saved locally but couldn't sync to cloud. It will sync later.",
          duration: 5000
        });
      } else {
        console.log("Successfully saved serve attempt to Supabase:", data);
        toast("Serve synced", {
          description: "Serve attempt saved and synced to cloud",
          duration: 3000
        });
      }
    } catch (error) {
      console.error("Exception saving serve attempt:", error);
    }
  };

  // Parse URL query parameters on new serve page
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
            <Route path="history" element={<History serves={serves} clients={clients} />} />
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
