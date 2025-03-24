
import React from "react";
import { 
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter
} from "@/components/ui/card";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, X } from "lucide-react";

export interface ClientData {
  id?: string;
  name: string;
  email: string;  // We'll keep this as the primary email
  additionalEmails?: string[];  // New field for additional emails
  phone: string;
  address: string;
  notes: string;
}

interface ClientFormProps {
  onSubmit: (data: ClientData) => void;
  initialData?: ClientData;
  isLoading?: boolean;
}

const emailSchema = z.string().email({ message: "Please enter a valid email" }).or(z.string().length(0));

const clientFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  email: emailSchema,
  additionalEmails: z.array(emailSchema).optional(),
  phone: z.string().min(10, { message: "Please enter a valid phone number" }),
  address: z.string().min(5, { message: "Address must be at least 5 characters" }),
  notes: z.string().optional(),
});

const ClientForm: React.FC<ClientFormProps> = ({ 
  onSubmit, 
  initialData,
  isLoading = false
}) => {
  const [additionalEmails, setAdditionalEmails] = React.useState<string[]>(
    initialData?.additionalEmails || []
  );
  const [newEmail, setNewEmail] = React.useState<string>("");
  const [emailError, setEmailError] = React.useState<string | null>(null);

  const defaultValues: ClientData = initialData || {
    name: "",
    email: "",
    additionalEmails: [],
    phone: "",
    address: "",
    notes: ""
  };

  const form = useForm<ClientData>({
    resolver: zodResolver(clientFormSchema),
    defaultValues,
  });

  const handleAddEmail = () => {
    if (!newEmail) {
      setEmailError("Email cannot be empty");
      return;
    }
    
    // Basic email validation
    if (!/\S+@\S+\.\S+/.test(newEmail)) {
      setEmailError("Please enter a valid email address");
      return;
    }
    
    // Check for duplicates
    if (additionalEmails.includes(newEmail) || newEmail === form.getValues().email) {
      setEmailError("This email is already added");
      return;
    }
    
    setAdditionalEmails([...additionalEmails, newEmail]);
    setNewEmail("");
    setEmailError(null);
  };

  const handleRemoveEmail = (index: number) => {
    const updatedEmails = [...additionalEmails];
    updatedEmails.splice(index, 1);
    setAdditionalEmails(updatedEmails);
  };

  const handleSubmit = (data: ClientData) => {
    const updatedData = {
      ...data,
      additionalEmails,
      id: initialData?.id
    };
    console.log("Submitting client with additionalEmails:", additionalEmails);
    onSubmit(updatedData);
  };

  // Trap Enter key in the email input to add email instead of submitting form
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddEmail();
    }
  };

  return (
    <Card className="neo-card w-full max-w-md mx-auto animate-scale-in">
      <CardHeader>
        <CardTitle>{initialData ? "Edit Client" : "Add New Client"}</CardTitle>
        <CardDescription>
          {initialData 
            ? "Update client information below" 
            : "Enter client details to create a new record"}
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Primary Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="client@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div>
              <FormLabel>Additional Emails</FormLabel>
              <div className="space-y-2 mt-1.5">
                {additionalEmails.map((email, index) => (
                  <div key={index} className="flex items-center">
                    <div className="flex-1 p-2 bg-muted rounded-md text-sm">
                      {email}
                    </div>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      className="ml-2"
                      onClick={() => handleRemoveEmail(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                
                <div className="flex gap-2 mt-2">
                  <Input
                    type="email"
                    placeholder="Add another email"
                    value={newEmail}
                    onChange={(e) => {
                      setNewEmail(e.target.value);
                      setEmailError(null);
                    }}
                    onKeyDown={handleKeyDown}
                    className="flex-1"
                  />
                  <Button 
                    type="button" 
                    onClick={handleAddEmail} 
                    variant="outline"
                    size="icon"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {emailError && (
                  <p className="text-sm font-medium text-destructive mt-1">{emailError}</p>
                )}
              </div>
            </div>
            
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input placeholder="(555) 123-4567" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input placeholder="123 Main St, City, State 12345" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Any additional information about this client..." 
                      rows={3}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <CardFooter className="px-0 pt-4">
              <Button 
                type="submit" 
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? "Saving..." : (initialData ? "Update Client" : "Add Client")}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default ClientForm;
