
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import Layout from '@/components/Layout';
import PageHeader from '@/components/PageHeader';
import ServeForm from '@/components/ServeForm';
import { getCase, getClient, searchCases, createServeAttempt, updateCase } from '@/lib/appwrite';
import { sendServeAttemptEmail } from '@/lib/email';
import { Case, Client } from '@/lib/types';

const Serve = () => {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Case[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(!caseId);
  
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(!!caseId);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (caseId) {
      loadCaseData(caseId);
    }
  }, [caseId]);

  const loadCaseData = async (id: string) => {
    setLoading(true);
    try {
      // Get case data
      const caseData = await getCase(id);
      setSelectedCase(caseData);
      
      // Get client data
      const clientData = await getClient(caseData.clientId);
      setSelectedClient(clientData);
    } catch (error) {
      console.error('Error loading case:', error);
      toast.error('Failed to load case data');
      setIsSearchOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const results = await searchCases(searchQuery);
      setSearchResults(results);
      
      if (results.length === 0) {
        toast('No cases found matching your search.', {
          description: 'Try a different search term or check spelling.',
        });
      }
    } catch (error) {
      console.error('Error searching cases:', error);
      toast.error('Failed to search cases');
    } finally {
      setIsSearching(false);
    }
  };

  const selectCase = async (caseData: Case) => {
    try {
      // Get client data
      const clientData = await getClient(caseData.clientId);
      setSelectedClient(clientData);
      setSelectedCase(caseData);
      setIsSearchOpen(false);
      
      // Update URL
      navigate(`/serve/${caseData.$id}`);
    } catch (error) {
      console.error('Error loading client data:', error);
      toast.error('Failed to load client data');
    }
  };

  const handleServeAttempt = async (data: {
    notes: string;
    photoFileId: string;
    latitude: number;
    longitude: number;
  }) => {
    if (!selectedCase || !selectedClient) return;
    
    setIsSubmitting(true);
    try {
      // Create serve attempt record
      const attempt = await createServeAttempt(
        selectedCase.$id,
        data.latitude,
        data.longitude,
        data.notes || '',
        data.photoFileId
      );
      
      // Update case status to attempted
      await updateCase(selectedCase.$id, { status: 'attempted' });
      
      // Send email notification
      const photoUrl = attempt.photoUrl;
      
      await sendServeAttemptEmail({
        to: selectedClient.email,
        caseNumber: selectedCase.caseNumber,
        attemptNumber: attempt.attemptNumber,
        caseName: selectedCase.caseName,
        defendantName: selectedCase.defendantName,
        serviceAddress: selectedCase.serviceAddress,
        photoUrl,
        latitude: data.latitude,
        longitude: data.longitude,
        notes: data.notes || '',
        date: new Date().toLocaleString(),
      });
      
      toast.success('Service attempt recorded successfully');
      
      // Navigate to case detail page
      navigate(`/cases/${selectedCase.$id}`);
    } catch (error) {
      console.error('Error recording service attempt:', error);
      toast.error('Failed to record service attempt');
    } finally {
      setIsSubmitting(false);
    }
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
        title="Serve Case"
        description="Record service attempts with photo and GPS data."
        action={
          !selectedCase
            ? undefined
            : {
                label: "Change Case",
                onClick: () => setIsSearchOpen(true),
                icon: <Search size={16} />,
              }
        }
      />

      {!selectedCase && !loading ? (
        <Card>
          <CardHeader>
            <CardTitle>Select a Case</CardTitle>
            <CardDescription>Search for a case to serve.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex space-x-2">
              <Input
                placeholder="Search by case name, number, or service address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
              />
              <Button onClick={handleSearch} disabled={isSearching}>
                {isSearching ? 'Searching...' : 'Search'}
              </Button>
            </div>
          </CardContent>
          {searchResults.length > 0 && (
            <CardFooter className="flex flex-col items-stretch pt-0">
              <Separator className="my-4" />
              <div className="space-y-3 w-full">
                {searchResults.map((caseData) => (
                  <Button
                    key={caseData.$id}
                    variant="outline"
                    className="w-full justify-start h-auto py-3 px-4"
                    onClick={() => selectCase(caseData)}
                  >
                    <div className="flex flex-col items-start">
                      <div className="flex items-center justify-between w-full">
                        <span className="font-medium">{caseData.caseName}</span>
                        <Badge variant="outline" className={getStatusBadgeStyles(caseData.status)}>
                          {caseData.status.charAt(0).toUpperCase() + caseData.status.slice(1)}
                        </Badge>
                      </div>
                      <span className="text-sm text-muted-foreground mt-1">
                        Case #: {caseData.caseNumber}
                      </span>
                      <span className="text-sm text-muted-foreground mt-1">
                        Service Address: {caseData.serviceAddress}
                      </span>
                    </div>
                  </Button>
                ))}
              </div>
            </CardFooter>
          )}
        </Card>
      ) : loading ? (
        <div className="space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : selectedCase && selectedClient ? (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
              <div>
                <CardTitle>{selectedCase.caseName}</CardTitle>
                <CardDescription>
                  Case #{selectedCase.caseNumber} • Client: {selectedClient.name}
                </CardDescription>
              </div>
              <Badge 
                variant="outline" 
                className={`mt-2 sm:mt-0 ${getStatusBadgeStyles(selectedCase.status)}`}
              >
                {selectedCase.status.charAt(0).toUpperCase() + selectedCase.status.slice(1)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ServeForm
              caseData={selectedCase}
              clientData={selectedClient}
              onSubmit={handleServeAttempt}
              isSubmitting={isSubmitting}
            />
          </CardContent>
        </Card>
      ) : null}

      {/* Search Dialog */}
      <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Case to Serve</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex space-x-2">
              <Input
                placeholder="Search by case name, number, or address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
                autoFocus
              />
              <Button onClick={handleSearch} disabled={isSearching}>
                {isSearching ? 'Searching...' : 'Search'}
              </Button>
            </div>
            
            {searchResults.length > 0 ? (
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {searchResults.map((caseData) => (
                  <Button
                    key={caseData.$id}
                    variant="outline"
                    className="w-full justify-start h-auto py-3 px-4"
                    onClick={() => {
                      selectCase(caseData);
                      setIsSearchOpen(false);
                    }}
                  >
                    <div className="flex flex-col items-start">
                      <div className="flex items-center justify-between w-full">
                        <span className="font-medium">{caseData.caseName}</span>
                        <Badge variant="outline" className={getStatusBadgeStyles(caseData.status)}>
                          {caseData.status.charAt(0).toUpperCase() + caseData.status.slice(1)}
                        </Badge>
                      </div>
                      <span className="text-sm text-muted-foreground mt-1">
                        Case #: {caseData.caseNumber}
                      </span>
                      <span className="text-sm text-muted-foreground mt-1">
                        Service Address: {caseData.serviceAddress}
                      </span>
                    </div>
                  </Button>
                ))}
              </div>
            ) : (
              searchQuery && !isSearching && (
                <div className="text-center py-6 text-muted-foreground">
                  No cases found. Try a different search term.
                </div>
              )
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Serve;
