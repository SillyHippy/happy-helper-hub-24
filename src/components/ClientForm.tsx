
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

export interface ClientData {
  id?: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
  additionalEmails?: string[]; // Add this back but don't display it in the UI
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
  phone: z.string().min(10, { message: "Please enter a valid phone number" }),
  address: z.string().min(5, { message: "Address must be at least 5 characters" }),
  notes: z.string().optional(),
});

const ClientForm: React.FC<ClientFormProps> = ({ 
  onSubmit, 
  initialData,
  isLoading = false
}) => {
  const defaultValues: ClientData = initialData || {
    name: "",
    email: "",
    phone: "",
    address: "",
    notes: "",
    additionalEmails: [] // Initialize as empty array
  };

  const form = useForm<ClientData>({
    resolver: zodResolver(clientFormSchema),
    defaultValues,
  });

  const handleSubmit = (data: ClientData) => {
    const updatedData = {
      ...data,
      id: initialData?.id,
      additionalEmails: initialData?.additionalEmails || [] // Preserve existing additionalEmails
    };
    onSubmit(updatedData);
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
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="client@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
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
