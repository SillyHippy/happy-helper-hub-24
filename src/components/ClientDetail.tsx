
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
} from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import ClientForm from "./ClientForm";
import ClientDocuments from "./ClientDocuments";
import ClientCases from "./ClientCases";
import { ClientData } from "./ClientForm";
import { useToast } from "@/components/ui/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";

interface ClientDetailProps {
  client: ClientData;
  onUpdate: (client: ClientData) => void;
}

export default function ClientDetail({ client, onUpdate }: ClientDetailProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const handleUpdateClient = (updatedClient: ClientData) => {
    onUpdate(updatedClient);
    setIsEditing(false);
    toast({
      title: "Client updated",
      description: "Client information has been updated."
    });
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="details" value={activeTab} onValueChange={setActiveTab}>
        <div className={`flex ${isMobile ? 'flex-col gap-3' : 'justify-between items-center'} mb-4`}>
          <TabsList>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="cases">Cases & Documents</TabsTrigger>
          </TabsList>
          
          {activeTab === "details" && (
            <Dialog open={isEditing} onOpenChange={setIsEditing}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <FileText className="h-4 w-4 mr-2" />
                  Edit Client
                </Button>
              </DialogTrigger>
              <DialogContent className={isMobile ? "w-[95%] max-w-md" : ""}>
                <ClientForm
                  onSubmit={handleUpdateClient}
                  initialData={client}
                />
              </DialogContent>
            </Dialog>
          )}
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
                    <div className="text-sm text-muted-foreground">Email</div>
                  </div>
                </div>
                
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
