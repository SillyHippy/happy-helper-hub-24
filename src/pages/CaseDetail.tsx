import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, FileText, Pencil, MapPin, Clock, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import Layout from '@/components/Layout';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { getCase, getClient, getServeAttempts, getCaseDocuments, getFilePreview, updateCase } from '@/lib/appwrite';
import { Case, Client, ServeAttempt, Document as DocumentType } from '@/lib/types';
import { ensureString } from '@/lib/utils';

const CaseDetail = () => {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();
  
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [serveAttempts, setServeAttempts] = useState<ServeAttempt[]>([]);
  const [documents, setDocuments] = useState<DocumentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('details');
  const [statusUpdating, setStatusUpdating] = useState(false);

  useEffect(() => {
    if (caseId) {
      loadCaseData();
    }
  }, [caseId]);

  const loadCaseData = async () => {
    setLoading(true);
    try {
      const caseDetail = await getCase(caseId!);
      setCaseData(caseDetail);
      
      const clientData = await getClient(caseDetail.clientId);
      setClient(clientData);
      
      const attempts = await getServeAttempts(caseId!);
      setServeAttempts(attempts);
      
      const docs = await getCaseDocuments(caseId!);
      setDocuments(docs);
    } catch (error) {
      console.error('Error loading case data:', error);
      toast.error('Failed to load case data');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: 'pending' | 'attempted' | 'served' | 'canceled') => {
    if (!caseData) return;
    
    setStatusUpdating(true);
    try {
      await updateCase(caseData.$id, { status: newStatus });
      setCaseData({ ...caseData, status: newStatus });
      toast.success('Case status updated');
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    } finally {
      setStatusUpdating(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
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

  const downloadDocument = (url: string | URL, fileName: string) => {
    const urlString = ensureString(url);
    const a = document.createElement('a');
    a.href = urlString;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const getGoogleMapsUrl = (latitude: number, longitude: number) => {
    return `https://www.google.com/maps?q=${latitude},${longitude}`;
  };

  if (loading) {
    return (
      <Layout>
        <div className="space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </Layout>
    );
  }

  if (!caseData || !client) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h2 className="text-xl font-medium">Case not found</h2>
          <p className="text-muted-foreground mt-2">The case you're looking for doesn't exist or you don't have access to it.</p>
          <Button onClick={() => navigate('/cases')} className="mt-4">
            Back to Cases
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/cases')}
          className="text-muted-foreground mb-2"
        >
          <ArrowLeft size={16} className="mr-1" /> Back to Cases
        </Button>
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{caseData.caseName}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Case #: {caseData.caseNumber} • Client: {client.name}
            </p>
          </div>
          
          <div className="flex items-center mt-4 sm:mt-0">
            <Badge variant="outline" className={`mr-4 ${getStatusBadgeStyles(caseData.status)}`}>
              {caseData.status.charAt(0).toUpperCase() + caseData.status.slice(1)}
            </Badge>
            
            <Button
              onClick={() => navigate(`/serve/${caseData.$id}`)}
              size="sm"
              className="ml-2"
            >
              <Upload size={16} className="mr-2" />
              Serve
            </Button>
          </div>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="attempts">Service Attempts ({serveAttempts.length})</TabsTrigger>
          <TabsTrigger value="documents">Documents ({documents.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Case Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Case Number</p>
                  <p>{caseData.caseNumber}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Case Name</p>
                  <p>{caseData.caseName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Created On</p>
                  <p>{formatDate(caseData.createdAt)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <p>{caseData.status.charAt(0).toUpperCase() + caseData.status.slice(1)}</p>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <p className="text-sm font-medium text-muted-foreground">Defendant</p>
                <p>{caseData.defendantName}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-muted-foreground">Service Address</p>
                <p>{caseData.serviceAddress}</p>
              </div>
            </CardContent>
            <CardFooter>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleStatusChange('pending')}
                  disabled={caseData.status === 'pending' || statusUpdating}
                >
                  Mark as Pending
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleStatusChange('attempted')}
                  disabled={caseData.status === 'attempted' || statusUpdating}
                >
                  Mark as Attempted
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleStatusChange('served')}
                  disabled={caseData.status === 'served' || statusUpdating}
                >
                  Mark as Served
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleStatusChange('canceled')}
                  disabled={caseData.status === 'canceled' || statusUpdating}
                >
                  Mark as Canceled
                </Button>
              </div>
            </CardFooter>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Client Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Name</p>
                  <p>{client.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Email</p>
                  <p>{client.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Phone</p>
                  <p>{client.phone || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Address</p>
                  <p>{client.address || 'Not provided'}</p>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/clients/${client.$id}/cases`)}
              >
                View All Client Cases
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="attempts" className="space-y-4">
          {serveAttempts.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>No Service Attempts</CardTitle>
                <CardDescription>
                  No service attempts have been recorded for this case yet.
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <Button onClick={() => navigate(`/serve/${caseData.$id}`)}>
                  <Upload size={16} className="mr-2" />
                  Record Service Attempt
                </Button>
              </CardFooter>
            </Card>
          ) : (
            serveAttempts.map((attempt) => (
              <Card key={attempt.$id} className="animate-in">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>Attempt #{attempt.attemptNumber}</CardTitle>
                      <CardDescription>
                        <div className="flex items-center mt-1">
                          <Clock size={14} className="mr-1" />
                          {formatDate(attempt.createdAt)}
                        </div>
                      </CardDescription>
                    </div>
                    <a
                      href={getGoogleMapsUrl(attempt.latitude, attempt.longitude)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary/80 flex items-center text-sm"
                    >
                      <MapPin size={14} className="mr-1" />
                      View on Map
                    </a>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {attempt.photoUrl && (
                    <div className="mb-4">
                      <img 
                        src={attempt.photoUrl} 
                        alt={`Service attempt ${attempt.attemptNumber}`}
                        className="w-full max-h-80 object-cover rounded-md border"
                      />
                    </div>
                  )}
                  
                  <div>
                    <h4 className="text-sm font-medium mb-1">Notes</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {attempt.notes || 'No notes provided.'}
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium mb-1">Location Details</h4>
                    <div className="text-sm text-muted-foreground">
                      <p>Latitude: {attempt.latitude}</p>
                      <p>Longitude: {attempt.longitude}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
        
        <TabsContent value="documents" className="space-y-4">
          {documents.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>No Documents</CardTitle>
                <CardDescription>
                  No documents have been uploaded for this case yet.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  You can upload documents when editing the case details.
                </p>
              </CardContent>
              <CardFooter>
                <Button onClick={() => navigate(`/cases/${caseId}/edit`)}>
                  <Pencil size={16} className="mr-2" />
                  Edit Case
                </Button>
              </CardFooter>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {documents.map((doc) => (
                <Card key={doc.$id} className="animate-in">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center">
                      <FileText size={18} className="mr-2" />
                      {doc.fileName}
                    </CardTitle>
                    <CardDescription>
                      Uploaded on {formatDate(doc.createdAt)}
                    </CardDescription>
                  </CardHeader>
                  <CardFooter className="pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadDocument(getFilePreview(doc.fileId), doc.fileName)}
                    >
                      <Download size={14} className="mr-2" />
                      Download
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </Layout>
  );
};

export default CaseDetail;
