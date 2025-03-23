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
    return () => {};
  }, []);

  useEffect(() => {
    const performInitialSync = async () => {
      if (isInitialSync) {
        setIsSyncing(true);
        try {
          console.log("Performing initial sync from Supabase to local storage");
          
          const { data: supabaseServes, error } = await supabase
            .from('serve_attempts')
            .select('*')
            .order('timestamp', { ascending: false });
            
          if (error) {
            console.error("Error fetching serve attempts:", error);
          } else if (supabaseServes && supabaseServes.length > 0) {
            const formattedServes = supabaseServes.map(serve => ({
              id: serve.id,
              clientId: serve.client_id,
              caseNumber: serve.case_number,
              status: serve.status,
              notes: serve.notes,
              coordinates: serve.coordinates,
              timestamp: serve.timestamp,
              imageData: serve.image_data,
              attemptNumber: serve.attempt_number
            }));
            
            localStorage.setItem("serve-tracker-serves", JSON.stringify(formattedServes));
            setServes(formattedServes);
          }
          
          setIsInitialSync(false);
        } catch (error) {
          console.error("Error during initial sync:", error);
        } finally {
          setIsSyncing(false);
        }
      }
    };
    
    performInitialSync();
  }, [isInitialSync]);

  useEffect(() => {
    return () => {};
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
        }
      } catch (error) {
        console.error("Error fetching clients from Supabase:", error);
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
    setClients([...clients, client]);
    
    try {
      const { error } = await supabase
        .from('clients')
        .insert(client);
        
      if (error) {
        console.error("Error saving client to Supabase:", error);
      } else {
        console.log("Successfully saved client to Supabase:", client);
      }
    } catch (error) {
      console.error("Exception saving client:", error);
    }
  };

  const updateClient = async (updatedClient: ClientData) => {
    setClients(clients.map(client => 
      client.id === updatedClient.id ? updatedClient : client
    ));
    
    try {
      const { error } = await supabase
        .from('clients')
        .update(updatedClient)
        .eq('id', updatedClient.id);
        
      if (error) {
        console.error("Error updating client in Supabase:", error);
      } else {
        console.log("Successfully updated client in Supabase:", updatedClient);
      }
    } catch (error) {
      console.error("Exception updating client:", error);
    }
  };

  const deleteClient = async (clientId: string) => {
    try {
      console.log("Deleting client with ID:", clientId);
      
      const updatedClients = clients.filter(client => client.id !== clientId);
      setClients(updatedClients);
      
      const updatedServes = serves.filter(serve => serve.clientId !== clientId);
      setServes(updatedServes);
      
      localStorage.setItem("serve-tracker-clients", JSON.stringify(updatedClients));
      localStorage.setItem("serve-tracker-serves", JSON.stringify(updatedServes));
      
      console.log(`Removed client from state and localStorage. Remaining clients: ${updatedClients.length}`);
    } catch (error) {
      console.error("Error updating local state after client deletion:", error);
    }
  };

  const addServe = async (serve: ServeAttemptData) => {
    console.log("Adding new serve:", serve);
    const newServe = {
      ...serve,
      id: serve.id || `serve-${Date.now()}`,
    };
    
    setServes(prevServes => [newServe, ...prevServes]);
    
    try {
      const savedServes = localStorage.getItem("serve-tracker-serves");
      const parsedServes = savedServes ? JSON.parse(savedServes) : [];
      localStorage.setItem("serve-tracker-serves", JSON.stringify([newServe, ...parsedServes]));
      
      console.log("Updated serves array, new length:", serves.length + 1);
      
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
      } else {
        console.log("Successfully saved serve attempt to Supabase:", data);
      }
    } catch (error) {
      console.error("Exception saving serve attempt:", error);
    }
  };

  const deleteServe = async (serveId: string) => {
    try {
      console.log("Removing serve attempt from state:", serveId);
      
      const updatedServes = serves.filter(serve => serve.id !== serveId);
      setServes(updatedServes);
      
      localStorage.setItem("serve-tracker-serves", JSON.stringify(updatedServes));
      
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
