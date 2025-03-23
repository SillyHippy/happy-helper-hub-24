
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash, Folder, AlertCircle, RefreshCw } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import Layout from '@/components/Layout';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import ClientForm from '@/components/ClientForm';
import { getClients, createClient, updateClient, deleteClient } from '@/lib/appwrite';
import { testAppwriteConnection } from '@/lib/utils';
import { Client } from '@/lib/types';

const Clients = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{connected: boolean, message: string} | null>(null);
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  // Test the connection on component mount
  useEffect(() => {
    testConnection();
  }, []);

  // Function to test connection to Appwrite
  const testConnection = async () => {
    setIsTestingConnection(true);
    const status = await testAppwriteConnection();
    setConnectionStatus(status);
    setIsTestingConnection(false);
    
    if (!status.connected) {
      toast.error(status.message);
    }
  };

  // Fetch clients with React Query
  const { data: clients = [], isLoading, error, refetch } = useQuery({
    queryKey: ['clients'],
    queryFn: getClients,
    retry: 3, // Retry failed requests 3 times
    staleTime: 60000, // Consider data fresh for 1 minute
    enabled: connectionStatus?.connected !== false, // Only run if connection is confirmed
  });

  // Mutations
  const createClientMutation = useMutation({
    mutationFn: (data: { name: string; email: string; phone: string; address: string }) => 
      createClient(data.name, data.email, data.phone, data.address),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Client created successfully');
      setIsFormOpen(false);
    },
    onError: (error) => {
      console.error('Error creating client:', error);
      toast.error('Failed to create client');
    },
  });

  const updateClientMutation = useMutation({
    mutationFn: (data: { id: string; name?: string; email?: string; phone?: string; address?: string }) => 
      updateClient(data.id, { name: data.name, email: data.email, phone: data.phone, address: data.address }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Client updated successfully');
      setIsFormOpen(false);
    },
    onError: (error) => {
      console.error('Error updating client:', error);
      toast.error('Failed to update client');
    },
  });

  const deleteClientMutation = useMutation({
    mutationFn: (id: string) => deleteClient(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Client deleted successfully');
      setIsDeleteDialogOpen(false);
    },
    onError: (error) => {
      console.error('Error deleting client:', error);
      toast.error('Failed to delete client');
    },
  });

  // Event handlers
  const handleCreateClient = async (data: Partial<Client>) => {
    createClientMutation.mutate({ 
      name: data.name!, 
      email: data.email!, 
      phone: data.phone || '', 
      address: data.address || '' 
    });
  };

  const handleUpdateClient = async (data: Partial<Client>) => {
    if (!selectedClient) return;
    
    updateClientMutation.mutate({
      id: selectedClient.$id,
      name: data.name,
      email: data.email,
      phone: data.phone,
      address: data.address,
    });
  };

  const handleDeleteClient = async () => {
    if (!selectedClient) return;
    deleteClientMutation.mutate(selectedClient.$id);
  };

  const openCreateForm = () => {
    // If connection isn't established, test it first
    if (connectionStatus?.connected === false) {
      testConnection();
      if (!connectionStatus?.connected) {
        toast.error("Cannot add clients while offline. Please check your connection.");
        return;
      }
    }
    
    setSelectedClient(null);
    setIsFormOpen(true);
  };

  const openEditForm = (client: Client) => {
    setSelectedClient(client);
    setIsFormOpen(true);
  };

  const openDeleteDialog = (client: Client) => {
    setSelectedClient(client);
    setIsDeleteDialogOpen(true);
  };

  const viewClientCases = (clientId: string) => {
    navigate(`/clients/${clientId}/cases`);
  };

  const handleRetry = () => {
    testConnection().then(() => {
      if (connectionStatus?.connected) {
        refetch();
      }
    });
  };

  // If there was a connection error
  if (connectionStatus?.connected === false) {
    return (
      <Layout>
        <PageHeader
          title="Clients"
          description="Manage your clients and their cases."
          action={{
            label: "Check Connection",
            onClick: handleRetry,
            icon: <RefreshCw size={16} />,
          }}
        />
        <div className="bg-white rounded-md shadow p-6 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-red-600 mb-2">Connection Error</h3>
          <p className="text-gray-600 mb-4">
            {connectionStatus.message || "Could not connect to the database. Please check your network connection and Appwrite configuration."}
          </p>
          <Button 
            onClick={handleRetry}
            disabled={isTestingConnection}
            className="mx-auto"
          >
            {isTestingConnection ? 'Testing Connection...' : 'Retry Connection'}
          </Button>
        </div>
      </Layout>
    );
  }

  // If there was an error fetching clients
  if (error && !isLoading) {
    return (
      <Layout>
        <PageHeader
          title="Clients"
          description="Manage your clients and their cases."
          action={{
            label: "Retry",
            onClick: () => refetch(),
            icon: <RefreshCw size={16} />,
          }}
        />
        <div className="bg-white rounded-md shadow p-6 text-center">
          <h3 className="text-lg font-medium text-red-600 mb-2">Error Loading Clients</h3>
          <p className="text-gray-600 mb-4">
            {error instanceof Error ? error.message : "An unknown error occurred while loading clients."}
          </p>
          <Button onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <PageHeader
        title="Clients"
        description="Manage your clients and their cases."
        action={{
          label: "Add Client",
          onClick: openCreateForm,
          icon: <Plus size={16} />,
        }}
      />

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="w-full h-10" />
          <Skeleton className="w-full h-32" />
          <Skeleton className="w-full h-32" />
        </div>
      ) : clients.length === 0 ? (
        <EmptyState
          title="No clients"
          description="You haven't added any clients yet. Start by adding your first client."
          action={{
            label: "Add Client",
            onClick: openCreateForm,
          }}
          icon={<Plus size={48} />}
          className="h-[400px]"
        />
      ) : (
        <div className="bg-white rounded-md shadow-sm border animate-in">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="hidden md:table-cell">Address</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client) => (
                <TableRow key={client.$id}>
                  <TableCell className="font-medium">{client.name}</TableCell>
                  <TableCell>{client.email}</TableCell>
                  <TableCell>{client.phone || '-'}</TableCell>
                  <TableCell className="hidden md:table-cell">{client.address || '-'}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => viewClientCases(client.$id)}
                        title="View Cases"
                      >
                        <Folder size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditForm(client)}
                        title="Edit Client"
                      >
                        <Pencil size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openDeleteDialog(client)}
                        title="Delete Client"
                      >
                        <Trash size={16} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Client Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {selectedClient ? 'Edit Client' : 'Add New Client'}
            </DialogTitle>
            <DialogDescription>
              {selectedClient 
                ? "Update client details below." 
                : "Fill in the client information below."}
            </DialogDescription>
          </DialogHeader>
          <ClientForm
            defaultValues={selectedClient || {}}
            onSubmit={selectedClient ? handleUpdateClient : handleCreateClient}
            isSubmitting={createClientMutation.isPending || updateClientMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog 
        open={isDeleteDialogOpen} 
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the client and all associated cases and service attempts.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteClientMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteClient}
              disabled={deleteClientMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteClientMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
};

export default Clients;
