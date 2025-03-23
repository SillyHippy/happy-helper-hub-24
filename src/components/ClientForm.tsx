
import React, { useState } from "react";
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
import { v4 as uuidv4 } from "uuid";
import { useIsMobile } from "@/hooks/use-mobile";

export interface ClientData {
  id?: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
}

interface ClientFormProps {
  onSubmit: (data: ClientData) => void;
  initialData?: ClientData;
  isLoading?: boolean;
}

const clientFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  email: z.string().email({ message: "Please enter a valid email" }),
  phone: z.string().min(10, { message: "Please enter a valid phone number" }),
  address: z.string().min(5, { message: "Address must be at least 5 characters" }),
  notes: z.string().optional(),
});

const ClientForm: React.FC<ClientFormProps> = ({ 
  onSubmit, 
  initialData,
  isLoading = false
}) => {
  const isMobile = useIsMobile();
  
  const defaultValues: ClientData = initialData || {
    name: "",
    email: "",
    phone: "",
    address: "",
    notes: ""
  };

  const form = useForm<ClientData>({
    resolver: zodResolver(clientFormSchema),
    defaultValues,
  });

  const handleSubmit = (data: ClientData) => {
    // If creating a new client, generate a unique ID
    // Make sure we're using a stable ID system to prevent duplicates
    if (!initialData?.id) {
      data.id = `client-${uuidv4()}`;
    } else {
      data.id = initialData.id;
    }
    
    onSubmit(data);
  };

  return (
    <Card className={`neo-card w-full ${isMobile ? "" : "max-w-md mx-auto"} animate-scale-in`}>
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
