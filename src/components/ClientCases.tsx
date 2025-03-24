
import React, { useState, useEffect } from "react";
import { 
  Card, 
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Plus,
  FileEdit,
  Trash2,
  Clock,
  Upload,
  File,
  Paperclip,
  Home,
  Building,
  MapPin,
  ExternalLink
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { uploadClientDocument, getClientDocuments, getDocumentUrl, deleteClientDocument, UploadedDocument } from "@/utils/supabaseStorage";
import ClientDocuments from "@/components/ClientDocuments";
import { useIsMobile } from "@/hooks/use-mobile";

interface ClientCase {
  id: string;
  client_id: string;
  case_number: string;
  case_name: string | null;
  description: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  home_address?: string;
  work_address?: string;
}

interface ClientCasesProps {
  clientId: string;
  clientName: string;
}

export default function ClientCases({ clientId, clientName }: ClientCasesProps) {
  const [cases, setCases] = useState<ClientCase[]>([]);
  const [addCaseDialogOpen, setAddCaseDialogOpen] = useState(false);
  const [editCaseDialogOpen, setEditCaseDialogOpen] = useState(false);
  const [deleteCaseDialogOpen, setDeleteCaseDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("cases");
  const [activeCase, setActiveCase] = useState<string | null>(null);
  const isMobile = useIsMobile();
  
  // Form state
  const [caseNumber, setCaseNumber] = useState("");
  const [caseName, setCaseName] = useState("");
  const [description, setDescription] = useState("");
  const [homeAddress, setHomeAddress] = useState("");
  const [workAddress, setWorkAddress] = useState("");
  const [status, setStatus] = useState("Active");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedCase, setSelectedCase] = useState<ClientCase | null>(null);
  
  // Upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileDescription, setFileDescription] = useState("");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [viewDocumentUrl, setViewDocumentUrl] = useState<string | null>(null);
  const [viewDocumentName, setViewDocumentName] = useState("");
  const [viewDocumentDialogOpen, setViewDocumentDialogOpen] = useState(false);
  const [deleteDocumentId, setDeleteDocumentId] = useState<string | null>(null);
  const [deleteDocumentPath, setDeleteDocumentPath] = useState<string | null>(null);
  const [deleteDocumentDialogOpen, setDeleteDocumentDialogOpen] = useState(false);

  // Load client's cases
  useEffect(() => {
    const fetchCases = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('client_cases')
          .select('*')
          .eq('client_id', clientId)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        setCases(data);
        
        // Set the first case as active
        if (data.length > 0 && !activeCase) {
          setActiveCase(data[0].id);
        }
      } catch (error) {
        console.error("Error fetching client cases:", error);
        toast.error("Error fetching cases", {
          description: "There was a problem loading cases for this client."
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchCases();
  }, [clientId, activeCase]);

  // Reset form
  const resetForm = () => {
    setCaseNumber("");
    setCaseName("");
    setDescription("");
    setHomeAddress("");
    setWorkAddress("");
    setStatus("Active");
    setSelectedCase(null);
    setSelectedFile(null);
    setFileDescription("");
  };

  // Add case
  const handleAddCase = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsSaving(true);
    
    try {
      // Insert case into database
      const { data, error } = await supabase
        .from('client_cases')
        .insert({
          client_id: clientId,
          case_number: caseNumber,
          case_name: caseName,
          description,
          home_address: homeAddress,
          work_address: workAddress,
          status
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Update local state
      setCases(prevCases => [data, ...prevCases]);
      
      // Auto-set as active case if it's the first one
      if (cases.length === 0) {
        setActiveCase(data.id);
      }
      
      setAddCaseDialogOpen(false);
      resetForm();
      
      toast.success("Case added", {
        description: "New case has been added for this client."
      });
    } catch (error) {
      console.error("Error adding case:", error);
      toast.error("Error adding case", {
        description: "There was a problem adding the case."
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Edit case
  const handleUpdateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCase) return;
    
    setIsSaving(true);
    
    try {
      const { data, error } = await supabase
        .from('client_cases')
        .update({
          case_number: caseNumber,
          case_name: caseName,
          description,
          home_address: homeAddress,
          work_address: workAddress,
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedCase.id)
        .select()
        .single();
      
      if (error) throw error;
      
      // Update local state
      setCases(prevCases => 
        prevCases.map(c => c.id === selectedCase.id ? data : c)
      );
      
      setEditCaseDialogOpen(false);
      resetForm();
      
      toast.success("Case updated", {
        description: "Case information has been updated."
      });
    } catch (error) {
      console.error("Error updating case:", error);
      toast.error("Error updating case", {
        description: "There was a problem updating the case."
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Delete case
  const handleDeleteCase = async () => {
    if (!selectedCase) return;
    
    try {
      const { error } = await supabase
        .from('client_cases')
        .delete()
        .eq('id', selectedCase.id);
      
      if (error) throw error;
      
      // Update local state
      setCases(prevCases => prevCases.filter(c => c.id !== selectedCase.id));
      
      // If we deleted the active case, select a new one
      if (activeCase === selectedCase.id) {
        const remainingCases = cases.filter(c => c.id !== selectedCase.id);
        setActiveCase(remainingCases.length > 0 ? remainingCases[0].id : null);
      }
      
      setDeleteCaseDialogOpen(false);
      resetForm();
      
      toast.success("Case deleted", {
        description: "Case has been permanently removed."
      });
    } catch (error) {
      console.error("Error deleting case:", error);
      toast.error("Error deleting case", {
        description: "There was a problem deleting the case."
      });
    }
  };

  // Edit case button handler
  const handleEditCase = (clientCase: ClientCase) => {
    setSelectedCase(clientCase);
    setCaseNumber(clientCase.case_number);
    setCaseName(clientCase.case_name);
    setDescription(clientCase.description);
    setHomeAddress(clientCase.home_address || "");
    setWorkAddress(clientCase.work_address || "");
    setStatus(clientCase.status);
    setEditCaseDialogOpen(true);
  };

  // Delete case button handler
  const handleDeleteCaseButton = (clientCase: ClientCase) => {
    setSelectedCase(clientCase);
    setDeleteCaseDialogOpen(true);
  };

  // File input change handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  // Upload document
  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFile || !activeCase) return;
    
    setIsUploading(true);
    
    try {
      const activeClientCase = cases.find(c => c.id === activeCase);
      if (!activeClientCase) throw new Error("Case not found");
      
      const document = await uploadClientDocument(
        clientId,
        selectedFile,
        activeClientCase.case_number,
        fileDescription
      );
      
      if (!document) throw new Error("Upload failed");
      
      // Refresh documents
      const documents = await getClientDocuments(clientId);
      setDocuments(documents);
      
      setUploadDialogOpen(false);
      setSelectedFile(null);
      setFileDescription("");
      
      toast.success("Document uploaded", {
        description: "Document has been successfully uploaded."
      });
    } catch (error) {
      console.error("Error uploading document:", error);
      toast.error("Error uploading document", {
        description: "There was a problem uploading the document."
      });
    } finally {
      setIsUploading(false);
    }
  };

  // View document
  const handleViewDocument = async (doc: UploadedDocument) => {
    try {
      const url = await getDocumentUrl(doc.filePath);
      if (url) {
        setViewDocumentUrl(url);
        setViewDocumentName(doc.fileName);
        setViewDocumentDialogOpen(true);
      } else {
        throw new Error("Could not get document URL");
      }
    } catch (error) {
      console.error("Error viewing document:", error);
      toast.error("Error viewing document", {
        description: "There was a problem accessing the document."
      });
    }
  };

  // Delete document button handler
  const handleDeleteDocumentButton = (id: string, filePath: string) => {
    setDeleteDocumentId(id);
    setDeleteDocumentPath(filePath);
    setDeleteDocumentDialogOpen(true);
  };

  // Delete document
  const handleDeleteDocument = async () => {
    if (!deleteDocumentId || !deleteDocumentPath) return;
    
    try {
      const success = await deleteClientDocument(deleteDocumentId, deleteDocumentPath);
      
      if (!success) throw new Error("Delete failed");
      
      // Refresh documents
      const documents = await getClientDocuments(clientId);
      setDocuments(documents);
      
      setDeleteDocumentDialogOpen(false);
      setDeleteDocumentId(null);
      setDeleteDocumentPath(null);
      
      toast.success("Document deleted", {
        description: "Document has been permanently removed."
      });
    } catch (error) {
      console.error("Error deleting document:", error);
      toast.error("Error deleting document", {
        description: "There was a problem deleting the document."
      });
    }
  };

  // Get active case
  const getActiveCase = () => {
    return cases.find(c => c.id === activeCase);
  };

  // Helper function to generate a Google Maps link from an address
  const getMapLink = (address: string) => {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  };
  
  // Function to handle address clicks
  const handleAddressClick = (address: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent case card click event
    // Open in a new tab
    window.open(getMapLink(address), '_blank', 'noopener,noreferrer');
    
    toast.success("Opening map", {
      description: "Opening address location in Google Maps"
    });
  };

  // Handle upload document button click from edit case dialog
  const handleUploadFromEditDialog = () => {
    if (selectedCase) {
      setActiveCase(selectedCase.id);
      setEditCaseDialogOpen(false);
      setUploadDialogOpen(true);
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="cases" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="cases">Cases</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>
        
        <TabsContent value="cases" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold truncate">{clientName}'s Cases</h2>
            
            <Dialog open={addCaseDialogOpen} onOpenChange={setAddCaseDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Case
                </Button>
              </DialogTrigger>
              <DialogContent className="h-[95vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New Case</DialogTitle>
                  <DialogDescription>
                    Enter the details for a new case for {clientName}
                  </DialogDescription>
                </DialogHeader>
                
                <form onSubmit={handleAddCase}>
                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="case-number">Case Number</Label>
                      <Input
                        id="case-number"
                        value={caseNumber}
                        onChange={(e) => setCaseNumber(e.target.value)}
                        placeholder="e.g., CV-2023-0001"
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="case-name">Case Name/Title</Label>
                      <Input
                        id="case-name"
                        value={caseName}
                        onChange={(e) => setCaseName(e.target.value)}
                        placeholder="e.g., Smith v. Jones"
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="home-address">Home Address</Label>
                        <Input
                          id="home-address"
                          value={homeAddress}
                          onChange={(e) => setHomeAddress(e.target.value)}
                          placeholder="Enter home address"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="work-address">Work Address</Label>
                        <Input
                          id="work-address"
                          value={workAddress}
                          onChange={(e) => setWorkAddress(e.target.value)}
                          placeholder="Enter work address"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="description">Notes</Label>
                      <Textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Additional case information"
                        rows={3}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select value={status} onValueChange={setStatus}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Active">Active</SelectItem>
                          <SelectItem value="Pending">Pending</SelectItem>
                          <SelectItem value="Closed">Closed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <DialogFooter className="mt-8">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => {
                        resetForm();
                        setAddCaseDialogOpen(false);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSaving}>
                      {isSaving ? "Saving..." : "Add Case"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          
          {isLoading ? (
            <div className="text-center py-10">
              <div role="status" className="inline-block">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
                <span className="sr-only">Loading...</span>
              </div>
              <p className="mt-2 text-muted-foreground">Loading cases...</p>
            </div>
          ) : cases.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center">
                <p className="text-muted-foreground mb-4">No cases found for this client.</p>
                <Button 
                  variant="outline" 
                  onClick={() => setAddCaseDialogOpen(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add First Case
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
                {cases.map((c) => (
                  <Card 
                    key={c.id} 
                    className={`overflow-hidden cursor-pointer transition-all hover:shadow-md w-full ${activeCase === c.id ? 'ring-2 ring-primary' : ''}`}
                    onClick={() => setActiveCase(c.id)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex justify-between">
                        <CardTitle className="flex-1 truncate">
                          {c.case_name || c.case_number}
                        </CardTitle>
                        
                        <div className="flex items-center gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditCase(c);
                            }}
                          >
                            <FileEdit className="h-4 w-4" />
                          </Button>
                          
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteCaseButton(c);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <CardDescription className="flex items-center justify-between">
                        <span className="truncate">Case #{c.case_number}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          c.status === 'Active' ? 'bg-green-100 text-green-800' :
                          c.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {c.status}
                        </span>
                      </CardDescription>
                    </CardHeader>
                    
                    <CardContent className="pb-3">
                      {c.description && (
                        <div className="space-y-2">
                          <h4 className="font-medium">Notes</h4>
                          <p className="text-sm text-muted-foreground line-clamp-2 whitespace-pre-wrap">{c.description}</p>
                        </div>
                      )}
                      
                      {(c.home_address || c.work_address) && (
                        <div className="space-y-2 mt-2">
                          <h4 className="font-medium">Addresses</h4>
                          <div className="space-y-2">
                            {c.home_address && (
                              <a 
                                href={getMapLink(c.home_address)}
                                className="text-sm text-primary hover:underline flex items-center group"
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => handleAddressClick(c.home_address, e)}
                              >
                                <Home className="h-3 w-3 mr-1 inline flex-shrink-0" />
                                <span className="flex-1 truncate">{c.home_address}</span>
                                <ExternalLink className="h-3 w-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                              </a>
                            )}
                            
                            {c.work_address && (
                              <a 
                                href={getMapLink(c.work_address)}
                                className="text-sm text-primary hover:underline flex items-center group"
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => handleAddressClick(c.work_address, e)}
                              >
                                <Building className="h-3 w-3 mr-1 inline flex-shrink-0" />
                                <span className="flex-1 truncate">{c.work_address}</span>
                                <ExternalLink className="h-3 w-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                              </a>
                            )}
                          </div>
                        </div>
                      )}
                      
                      <div className="flex items-center space-x-2 mt-3 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3 flex-shrink-0" />
                        <span>Created {new Date(c.created_at).toLocaleDateString()}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              {activeCase && (
                <Card className="mt-6">
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle className="truncate">
                        {getActiveCase()?.case_name || getActiveCase()?.case_number}
                      </CardTitle>
                    </div>
                    <CardDescription className="flex items-center justify-between">
                      <span>
                        Case #{getActiveCase()?.case_number} - 
                        <span className={`ml-2 ${
                          getActiveCase()?.status === 'Active' ? 'text-green-600' :
                          getActiveCase()?.status === 'Pending' ? 'text-yellow-600' :
                          'text-gray-600'
                        }`}>
                          {getActiveCase()?.status}
                        </span>
                      </span>
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="space-y-6">
                      <ClientDocuments 
                        clientId={clientId}
                        caseNumber={getActiveCase()?.case_number}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>
        
        <TabsContent value="documents">
          <ClientDocuments 
            clientId={clientId}
          />
        </TabsContent>
      </Tabs>
      
      {/* Edit Case Dialog */}
      <Dialog open={editCaseDialogOpen} onOpenChange={setEditCaseDialogOpen}>
        <DialogContent className="h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex justify-between items-center">
              <span>Edit Case</span>
            </DialogTitle>
            <DialogDescription>
              Update case information
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleUpdateCase}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-case-number">Case Number</Label>
                <Input
                  id="edit-case-number"
                  value={caseNumber}
                  onChange={(e) => setCaseNumber(e.target.value)}
                  placeholder="e.g., CV-2023-0001"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-case-name">Case Name/Title</Label>
                <Input
                  id="edit-case-name"
                  value={caseName}
                  onChange={(e) => setCaseName(e.target.value)}
                  placeholder="e.g., Smith v. Jones"
                />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-home-address">Home Address</Label>
                  <Input
                    id="edit-home-address"
                    value={homeAddress}
                    onChange={(e) => setHomeAddress(e.target.value)}
                    placeholder="Enter home address"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-work-address">Work Address</Label>
                  <Input
                    id="edit-work-address"
                    value={workAddress}
                    onChange={(e) => setWorkAddress(e.target.value)}
                    placeholder="Enter work address"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-description">Notes</Label>
                <Textarea
                  id="edit-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Additional case information"
                  rows={3}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <DialogFooter className="mt-8">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  resetForm();
                  setEditCaseDialogOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : "Update Case"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Delete Case Dialog */}
      <AlertDialog open={deleteCaseDialogOpen} onOpenChange={setDeleteCaseDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Case</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this case? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setSelectedCase(null);
              setDeleteCaseDialogOpen(false);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCase} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* View Document Dialog */}
      <Dialog open={viewDocumentDialogOpen} onOpenChange={setViewDocumentDialogOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{viewDocumentName}</DialogTitle>
          </DialogHeader>
          {viewDocumentUrl && (
            <div className="w-full max-h-[70vh] overflow-auto border rounded-lg">
              <iframe
                src={viewDocumentUrl}
                className="w-full h-[70vh]"
                title="Document Preview"
              />
            </div>
          )}
          <DialogFooter>
            <a
              href={viewDocumentUrl || "#"}
              download={viewDocumentName}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
            >
              Download
            </a>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Document Dialog */}
      <AlertDialog open={deleteDocumentDialogOpen} onOpenChange={setDeleteDocumentDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this document? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setDeleteDocumentId(null);
              setDeleteDocumentPath(null);
              setDeleteDocumentDialogOpen(false);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteDocument} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
