
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash, Upload, ArrowLeft } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import Layout from '@/components/Layout';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import CaseForm from '@/components/CaseForm';
import { getClient, getCases, getClients, createCase, updateCase, deleteCase } from '@/lib/appwrite';
import { Client, Case } from '@/lib/types';

const ClientCases = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const [client, setClient] = useState<Client | null>(null);
  const [cases, setCases] = useState<Case[]>([]);
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (clientId) {
      loadData();
    }
  }, [clientId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load client details
      const clientData = await getClient(clientId!);
      setClient(clientData);
      
      // Load client cases
      const casesData = await getCases({ clientId: clientId! });
      setCases(casesData);
      
      // Load all clients for the case form
      const clientsData = await getClients();
      setAllClients(clientsData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load client data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCase = async (data: Partial<Case>) => {
    setIsSubmitting(true);
    try {
      await createCase(
        data.clientId!,
        data.caseNumber!,
        data.caseName!,
        data.defendantName!,
        data.serviceAddress!
      );
      toast.success('Case created successfully');
      setIsFormOpen(false);
      loadData();
    } catch (error) {
      console.error('Error creating case:', error);
      toast.error('Failed to create case');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateCase = async (data: Partial<Case>) => {
    if (!selectedCase) return;
    
    setIsSubmitting(true);
    try {
      await updateCase(selectedCase.$id, {
        caseNumber: data.caseNumber,
        caseName: data.caseName,
        defendantName: data.defendantName,
        serviceAddress: data.serviceAddress,
      });
      toast.success('Case updated successfully');
      setIsFormOpen(false);
      loadData();
    } catch (error) {
      console.error('Error updating case:', error);
      toast.error('Failed to update case');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCase = async () => {
    if (!selectedCase) return;
    
    setIsSubmitting(true);
    try {
      await deleteCase(selectedCase.$id);
      toast.success('Case deleted successfully');
      setIsDeleteDialogOpen(false);
      loadData();
    } catch (error) {
      console.error('Error deleting case:', error);
      toast.error('Failed to delete case');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openCreateForm = () => {
    setSelectedCase(null);
    setIsFormOpen(true);
  };

  const openEditForm = (caseData: Case) => {
    setSelectedCase(caseData);
    setIsFormOpen(true);
  };

  const openDeleteDialog = (caseData: Case) => {
    setSelectedCase(caseData);
    setIsDeleteDialogOpen(true);
  };

  const goToServe = (caseData: Case) => {
    navigate(`/serve/${caseData.$id}`);
  };

  const viewCaseDetails = (caseId: string) => {
    navigate(`/cases/${caseId}`);
  };

  const getStatusBadgeStyles = (status: string) => {
    switch (status) {
      case 'served':
        return 'bg-green-500/10 text-green-600 hover:bg-green-500/20';
      case 'attempted':
        return 'bg-amber-500/10 text-amber-600 hover:bg-amber-500/20';
      case 'pending':
        return 'bg-blue-500/10 text-blue-600 hover:bg-blue-500/20';
      case 'canceled':
        return 'bg-red-500/10 text-red-600 hover:bg-red-500/20';
      default:
        return 'bg-gray-500/10 text-gray-600 hover:bg-gray-500/20';
    }
  };

  return (
    <Layout>
      <PageHeader
        title={client ? `Cases for ${client.name}` : 'Client Cases'}
        description={client?.email || 'Loading client details...'}
        action={{
          label: "Add Case",
          onClick: openCreateForm,
          icon: <Plus size={16} />,
        }}
        className="relative"
      />
      
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/clients')}
        className="mb-4 text-muted-foreground"
      >
        <ArrowLeft size={16} className="mr-1" /> Back to Clients
      </Button>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="w-full h-10" />
          <Skeleton className="w-full h-32" />
          <Skeleton className="w-full h-32" />
        </div>
      ) : cases.length === 0 ? (
        <EmptyState
          title="No cases"
          description={`You haven't added any cases for ${client?.name || 'this client'} yet.`}
          action={{
            label: "Add Case",
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
                <TableHead>Case Number</TableHead>
                <TableHead>Case Name</TableHead>
                <TableHead className="hidden md:table-cell">Defendant</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cases.map((caseData) => (
                <TableRow key={caseData.$id} className="cursor-pointer hover:bg-muted/50" onClick={() => viewCaseDetails(caseData.$id)}>
                  <TableCell className="font-medium">{caseData.caseNumber}</TableCell>
                  <TableCell>{caseData.caseName}</TableCell>
                  <TableCell className="hidden md:table-cell">{caseData.defendantName}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getStatusBadgeStyles(caseData.status)}>
                      {caseData.status.charAt(0).toUpperCase() + caseData.status.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-primary"
                        onClick={() => goToServe(caseData)}
                        title="Record Service Attempt"
                      >
                        <Upload size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditForm(caseData)}
                        title="Edit Case"
                      >
                        <Pencil size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openDeleteDialog(caseData)}
                        title="Delete Case"
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

      {/* Case Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {selectedCase ? 'Edit Case' : 'Add New Case'}
            </DialogTitle>
            <DialogDescription>
              {selectedCase 
                ? "Update case details below." 
                : "Fill in the case information below."}
            </DialogDescription>
          </DialogHeader>
          <CaseForm
            defaultValues={selectedCase || { clientId: clientId }}
            clients={allClients}
            onSubmit={selectedCase ? handleUpdateCase : handleCreateCase}
            isSubmitting={isSubmitting}
            caseId={selectedCase?.$id}
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
              This will permanently delete the case and all associated service attempts and documents.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCase}
              disabled={isSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
};

export default ClientCases;
