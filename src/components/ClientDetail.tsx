
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
  ArrowLeft
} from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import ClientForm from "./ClientForm";
import ClientCases from "./ClientCases";
import { ClientData } from "./ClientForm";
import { useIsMobile } from "@/hooks/use-mobile";

interface ClientDetailProps {
  client: ClientData;
  onUpdate: (client: ClientData) => void;
  onBack?: () => void;
}

export default function ClientDetail({ client, onUpdate, onBack }: ClientDetailProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  const isMobile = useIsMobile();

  const handleUpdateClient = (updatedClient: ClientData) => {
    onUpdate(updatedClient);
    setIsEditing(false);
  };

  return (
    <div className="space-y-6 w-full">
      {/* Back button always visible on mobile */}
      {onBack && (
        <Button 
          variant="outline" 
          onClick={onBack}
          className="mb-4 flex items-center"
          size="sm"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
      )}
      
      <Tabs defaultValue="details" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
          <TabsList className="h-auto">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="cases">Cases & Documents</TabsTrigger>
          </TabsList>
          
          <div className="flex flex-wrap gap-2">
            {activeTab === "details" && (
              <Dialog open={isEditing} onOpenChange={setIsEditing}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <FileText className="h-4 w-4 mr-2" />
                    Edit Client
                  </Button>
                </DialogTrigger>
                <DialogContent className="h-[95vh] overflow-y-auto">
                  <ClientForm
                    onSubmit={handleUpdateClient}
                    initialData={client}
                  />
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
        
        <TabsContent value="details" className="mt-0">
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle>Client Information</CardTitle>
              <CardDescription>
                Contact details and other information for this client
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <User className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium break-words">{client.name}</div>
                    <div className="text-sm text-muted-foreground">Full Name</div>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="w-full">
                    <div className="break-words">
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
                    <Mail className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div className="w-full">
                      <div className="space-y-1">
                        {client.additionalEmails.map((email, index) => (
                          <div key={index} className="break-words">
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
                  <Phone className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
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
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="w-full">
                    <div className="whitespace-pre-wrap break-words">{client.address}</div>
                    <div className="text-sm text-muted-foreground">Address</div>
                  </div>
                </div>
                
                {client.notes && (
                  <div className="flex items-start gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div className="w-full">
                      <div className="whitespace-pre-wrap break-words">{client.notes}</div>
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
