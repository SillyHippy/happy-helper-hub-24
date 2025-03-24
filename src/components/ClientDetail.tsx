
import React, { useState } from "react";
import { 
  Card, 
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  FileText,
  Briefcase,
  Upload
} from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import ClientForm from "./ClientForm";
import ClientDocuments from "./ClientDocuments";
import ClientCases from "./ClientCases";
import { ClientData } from "./ClientForm";
import { useToast } from "@/components/ui/use-toast";
import ResponsiveDialog from "./ResponsiveDialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { uploadClientDocument } from "@/utils/supabaseStorage";

interface ClientDetailProps {
  client: ClientData;
  onUpdate: (client: ClientData) => void;
}

export default function ClientDetail({ client, onUpdate }: ClientDetailProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const handleUpdateClient = (updatedClient: ClientData) => {
    onUpdate(updatedClient);
    setIsEditing(false);
    toast({
      title: "Client updated",
      description: "Client information has been updated."
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please select a file to upload",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    
    try {
      const uploaded = await uploadClientDocument(
        client.id!,
        selectedFile,
        undefined,
        description || undefined
      );
      
      if (uploaded) {
        toast({
          title: "Document uploaded",
          description: "Document uploaded successfully"
        });
        
        setSelectedFile(null);
        setDescription("");
        setUploadDialogOpen(false);
      } else {
        toast({
          title: "Upload failed",
          description: "There was a problem uploading the document",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error in upload handler:", error);
      toast({
        title: "Upload failed",
        description: "There was a problem uploading the document",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const uploadDialog = (
    <ResponsiveDialog
      open={uploadDialogOpen}
      onOpenChange={setUploadDialogOpen}
      trigger={
        <Button variant="outline" size="sm" className="ml-2">
          <Upload className="h-4 w-4 mr-2" />
          Upload Document
        </Button>
      }
      title="Upload Document"
      description={`Upload a document for ${client.name}`}
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
          />
          {selectedFile && (
            <p className="text-xs text-muted-foreground">
              Selected: {selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)
            </p>
          )}
        </div>
        
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
          <Button type="submit" disabled={isUploading || !selectedFile}>
            {isUploading ? "Uploading..." : "Upload"}
          </Button>
        </div>
      </form>
    </ResponsiveDialog>
  );

  return (
    <div className="space-y-6">
      <Tabs defaultValue="details" value={activeTab} onValueChange={setActiveTab}>
        <div className="flex justify-between items-center mb-4">
          <TabsList>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="cases">Cases & Documents</TabsTrigger>
          </TabsList>
          
          <div className="flex">
            {activeTab === "details" && (
              <>
                <Dialog open={isEditing} onOpenChange={setIsEditing}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <FileText className="h-4 w-4 mr-2" />
                      Edit Client
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <ClientForm
                      onSubmit={handleUpdateClient}
                      initialData={client}
                    />
                  </DialogContent>
                </Dialog>
                {uploadDialog}
              </>
            )}
          </div>
        </div>
        
        <TabsContent value="details" className="mt-0">
          <Card className="neo-card">
            <CardHeader>
              <CardTitle>Client Information</CardTitle>
              <CardDescription>
                Contact details and other information for this client
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <div className="font-medium">{client.name}</div>
                    <div className="text-sm text-muted-foreground">Full Name</div>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <div>
                      <a href={`mailto:${client.email}`} className="text-primary hover:underline">
                        {client.email}
                      </a>
                    </div>
                    <div className="text-sm text-muted-foreground">Primary Email</div>
                  </div>
                </div>
                
                {/* Display Additional Emails */}
                {client.additionalEmails && client.additionalEmails.length > 0 && (
                  <div className="flex items-start gap-3">
                    <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="w-full">
                      <div className="space-y-1">
                        {client.additionalEmails.map((email, index) => (
                          <div key={index}>
                            <a href={`mailto:${email}`} className="text-primary hover:underline">
                              {email}
                            </a>
                          </div>
                        ))}
                      </div>
                      <div className="text-sm text-muted-foreground">Additional Emails</div>
                    </div>
                  </div>
                )}
                
                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <div>
                      <a href={`tel:${client.phone}`} className="hover:underline">
                        {client.phone}
                      </a>
                    </div>
                    <div className="text-sm text-muted-foreground">Phone</div>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <div className="whitespace-pre-wrap">{client.address}</div>
                    <div className="text-sm text-muted-foreground">Address</div>
                  </div>
                </div>
                
                {client.notes && (
                  <div className="flex items-start gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <div className="whitespace-pre-wrap">{client.notes}</div>
                      <div className="text-sm text-muted-foreground">Notes</div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="cases" className="mt-0">
          <ClientCases clientId={client.id!} clientName={client.name} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
