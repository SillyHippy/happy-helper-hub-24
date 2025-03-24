import React, { useState, useEffect } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
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
import { useToast } from "@/components/ui/use-toast";
import ResponsiveDialog from "./ResponsiveDialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  File, 
  FileText, 
  Upload, 
  Download, 
  Trash2, 
  AlertCircle,
  FileCheck,
  Briefcase
} from "lucide-react";
import { 
  uploadClientDocument, 
  getClientDocuments, 
  getDocumentUrl, 
  deleteClientDocument,
  getClientCases,
  type UploadedDocument 
} from "@/utils/supabaseStorage";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";

interface ClientDocumentsProps {
  clientId: string;
  clientName?: string;
  caseNumber?: string;
  onUploadSuccess?: () => void;
  hideHeader?: boolean;
}

export default function ClientDocuments({ clientId, clientName, caseNumber, onUploadSuccess, hideHeader = false }: ClientDocumentsProps) {
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [cases, setCases] = useState<{ caseNumber: string; caseName?: string }[]>([]);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedCase, setSelectedCase] = useState(caseNumber || "");
  const [description, setDescription] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const isMobile = useIsMobile();
  
  useEffect(() => {
    if (clientId) {
      loadDocuments();
      loadCases();
    }
  }, [clientId, caseNumber]);

  useEffect(() => {
    if (caseNumber) {
      setSelectedCase(caseNumber);
    }
  }, [caseNumber]);

  const loadDocuments = async () => {
    setIsLoading(true);
    try {
      const docs = await getClientDocuments(clientId, caseNumber);
      setDocuments(docs);
    } catch (error) {
      console.error("Error loading documents:", error);
      toast.error("Failed to load documents", {
        position: "bottom-right"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadCases = async () => {
    try {
      const clientCases = await getClientCases(clientId);
      setCases(clientCases);
    } catch (error) {
      console.error("Error loading cases:", error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFile) {
      toast.error("No file selected", {
        description: "Please select a file to upload",
        position: "bottom-right"
      });
      return;
    }

    if (isUploading) return;
    
    setIsUploading(true);
    
    try {
      const uploaded = await uploadClientDocument(
        clientId,
        selectedFile,
        selectedCase || undefined,
        description || undefined
      );
      
      if (uploaded) {
        toast.success("Document uploaded successfully", {
          position: "bottom-right"
        });
        
        setDocuments([uploaded, ...documents]);
        setSelectedFile(null);
        if (!caseNumber) {
          setSelectedCase("");
        }
        setDescription("");
        setUploadDialogOpen(false);
        
        const fileInput = document.getElementById('file') as HTMLInputElement;
        if (fileInput) {
          fileInput.value = '';
        }
        
        if (onUploadSuccess) {
          onUploadSuccess();
        }
      } else {
        toast.error("Upload failed", {
          description: "There was a problem uploading the document",
          position: "bottom-right"
        });
      }
    } catch (error) {
      console.error("Error in upload handler:", error);
      toast.error("Upload failed", {
        description: "There was a problem uploading the document",
        position: "bottom-right"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = async (document: UploadedDocument) => {
    try {
      const url = await getDocumentUrl(document.filePath);
      
      if (url) {
        const a = window.document.createElement('a');
        a.href = url;
        a.download = document.fileName;
        window.document.body.appendChild(a);
        a.click();
        window.document.body.removeChild(a);
        
        toast.success("Document download started", {
          position: "bottom-right"
        });
      } else {
        toast.error("Download failed", {
          description: "Unable to generate download link",
          position: "bottom-right"
        });
      }
    } catch (error) {
      console.error("Error downloading document:", error);
      toast.error("Download failed", {
        description: "An error occurred while downloading",
        position: "bottom-right"
      });
    }
  };

  const handleDelete = async (document: UploadedDocument) => {
    try {
      const success = await deleteClientDocument(document.id, document.filePath);
      
      if (success) {
        setDocuments(documents.filter(doc => doc.id !== document.id));
        toast.success("Document deleted successfully", {
          position: "bottom-right"
        });
      } else {
        toast.error("Delete failed", {
          description: "There was a problem deleting the document",
          position: "bottom-right"
        });
      }
    } catch (error) {
      console.error("Error deleting document:", error);
      toast.error("Delete failed", {
        description: "An error occurred while deleting",
        position: "bottom-right"
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' bytes';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getCaseDisplayName = (caseNumber?: string, caseName?: string) => {
    if (!caseNumber) return null;
    if (caseName) return `${caseNumber} - ${caseName}`;
    return caseNumber;
  };

  const cardTitle = clientName 
    ? `Documents for ${clientName}${caseNumber ? ` - Case #${caseNumber}` : ""}`
    : `Documents${caseNumber ? ` for Case #${caseNumber}` : ""}`;

  const uploadButton = (
    <ResponsiveDialog
      open={uploadDialogOpen}
      onOpenChange={setUploadDialogOpen}
      trigger={
        <Button>
          <Upload className="mr-2 h-4 w-4" />
          Upload Document
        </Button>
      }
      title="Upload Document"
      description={`Upload a document${clientName ? ` for ${clientName}` : ""}${caseNumber ? ` - Case #${caseNumber}` : ""}`}
    >
      <form onSubmit={handleUpload} className="space-y-4 py-2">
        <div className="space-y-2">
          <Label htmlFor="file">Document</Label>
          <Input
            id="file"
            type="file"
            onChange={handleFileChange}
            required
            className="cursor-pointer"
            onClick={isMobile ? (e) => {
              const target = e.target as HTMLInputElement;
              target.value = '';
            } : undefined}
          />
          {selectedFile && (
            <p className="text-xs text-muted-foreground">
              Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
            </p>
          )}
        </div>
        
        {!caseNumber && (
          <div className="space-y-2">
            <Label htmlFor="case">Case</Label>
            <Select
              value={selectedCase}
              onValueChange={setSelectedCase}
            >
              <SelectTrigger id="case">
                <SelectValue placeholder="Select a case (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No case</SelectItem>
                {cases.map((c) => (
                  <SelectItem key={c.caseNumber} value={c.caseNumber}>
                    {getCaseDisplayName(c.caseNumber, c.caseName) || c.caseNumber}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Associating a document with a case helps with organization
            </p>
          </div>
        )}
        
        <div className="space-y-2">
          <Label htmlFor="description">Description (Optional)</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of this document"
            rows={3}
          />
        </div>
        
        <div className="flex justify-end gap-2 mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => setUploadDialogOpen(false)}
            disabled={isUploading}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={isUploading || !selectedFile}
            className={isUploading ? "opacity-50 cursor-not-allowed" : ""}
          >
            {isUploading ? "Uploading..." : "Upload"}
          </Button>
        </div>
      </form>
    </ResponsiveDialog>
  );

  return (
    <Card className="neo-card">
      {!hideHeader && (
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span>{cardTitle}</span>
            {uploadButton}
          </CardTitle>
          <CardDescription>
            View, upload and manage documents{caseNumber ? ` for this case` : ` for this client`}
          </CardDescription>
        </CardHeader>
      )}
      
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading documents...</p>
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-8 sm:py-12 border rounded-md border-dashed">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No documents yet</h3>
            <p className="text-muted-foreground mb-4">
              Upload your first document to get started
            </p>
            <Button onClick={() => setUploadDialogOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Upload Document
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File</TableHead>
                  {!caseNumber && <TableHead>Case</TableHead>}
                  <TableHead className="hidden md:table-cell">Description</TableHead>
                  <TableHead className="hidden md:table-cell">Size</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <div className="flex items-center">
                        <File className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span className="truncate max-w-[150px]" title={doc.fileName}>
                          {doc.fileName}
                        </span>
                      </div>
                    </TableCell>
                    {!caseNumber && (
                      <TableCell>
                        {doc.caseNumber ? (
                          <div className="flex items-center">
                            <Briefcase className="h-4 w-4 mr-2 text-muted-foreground" />
                            <span title={getCaseDisplayName(doc.caseNumber, doc.caseName) || ""}>
                              {getCaseDisplayName(doc.caseNumber, doc.caseName) || doc.caseNumber}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic">None</span>
                        )}
                      </TableCell>
                    )}
                    <TableCell className="hidden md:table-cell">
                      <span className="truncate max-w-[200px] block" title={doc.description || ""}>
                        {doc.description || <span className="text-muted-foreground italic">No description</span>}
                      </span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{formatFileSize(doc.fileSize)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleDownload(doc)}
                          title="Download"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(doc)}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
