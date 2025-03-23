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
import { supabase } from "./lib/supabase";
import { useToast } from "./hooks/use-toast";

const queryClient = new QueryClient();

// Wrap routes with transition animations
const AnimatedRoutes = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  
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

  // Fetch all clients from Supabase to ensure we have the most up-to-date data
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
          // Update local clients with Supabase data
          const clientsData = data as ClientData[];
          
          // Only update local storage if there's a difference
          const localClientsJSON = JSON.stringify(clientsData);
          const currentClientsJSON = localStorage.getItem("serve-tracker-clients");
          
          if (localClientsJSON !== currentClientsJSON) {
            localStorage.setItem("serve-tracker-clients", localClientsJSON);
            setClients(clientsData);
            console.log("Updated clients from Supabase:", clientsData);
          }
        }
      } catch (error) {
        console.error("Error fetching clients from Supabase:", error);
        toast({
          title: "Error syncing clients",
          description: "Unable to sync with the database. Some client data may be outdated.",
          variant: "destructive"
        });
      }
    };
    
    fetchClients();
  }, []);

  // Fetch serve attempts if the table exists in Supabase
  useEffect(() => {
    const fetchServes = async () => {
      try {
        // Check if the serve_attempts table exists by attempting to query it
        const { data, error } = await supabase
          .from('serve_attempts')
          .select('*')
          .limit(1);
        
        if (error) {
          // If table doesn't exist, we'll use localStorage only
          console.log("serve_attempts table not found, using localStorage only");
          return;
        }
        
        // If we get here, the table exists, so fetch all serve attempts
        const { data: allServes, error: fetchError } = await supabase
          .from('serve_attempts')
          .select('*')
          .order('timestamp', { ascending: false });
          
        if (fetchError) {
          throw fetchError;
        }
        
        if (allServes && allServes.length > 0) {
          console.log("Fetched serve attempts from Supabase:", allServes);
          
          // Convert to ServeAttemptData format
          const formattedServes = allServes.map((serve: any) => ({
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
          
          // Update local storage and state
          localStorage.setItem("serve-tracker-serves", JSON.stringify(formattedServes));
          setServes(formattedServes);
        }
      } catch (error) {
        console.error("Error fetching serve attempts:", error);
        // Fall back to localStorage data
      }
    };
    
    fetchServes();
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
  const addClient = (client: ClientData) => {
    setClients([...clients, client]);
  };

  const updateClient = (updatedClient: ClientData) => {
    setClients(clients.map(client => 
      client.id === updatedClient.id ? updatedClient : client
    ));
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
      
      toast({
        title: "Client deleted",
        description: "Client has been permanently removed.",
      });
    } catch (error) {
      console.error("Error deleting client:", error);
      toast({
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
      id: `serve-${Date.now()}`,
    };
    
    // Try to save to Supabase first if serve_attempts table exists
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
        console.error("Error saving serve attempt to Supabase, falling back to localStorage:", error);
      } else {
        console.log("Successfully saved serve attempt to Supabase:", data);
      }
    } catch (error) {
      console.error("Exception saving serve attempt:", error);
    }
    
    // Always update local state regardless of Supabase result
    setServes([newServe, ...serves]);
    console.log("Updated serves array, new length:", serves.length + 1);
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
