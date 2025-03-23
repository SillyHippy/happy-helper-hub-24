
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Case, Client } from '@/lib/types';
import { uploadDocument } from '@/lib/appwrite';
import { toast } from 'sonner';

const formSchema = z.object({
  clientId: z.string().min(1, { message: 'Client is required' }),
  caseNumber: z.string().min(1, { message: 'Case number is required' }),
  caseName: z.string().min(1, { message: 'Case name is required' }),
  defendantName: z.string().min(1, { message: 'Defendant name is required' }),
  serviceAddress: z.string().min(1, { message: 'Service address is required' }),
});

type FormValues = z.infer<typeof formSchema>;

interface CaseFormProps {
  defaultValues?: Partial<Case>;
  clients: Client[];
  onSubmit: (values: FormValues) => void;
  isSubmitting: boolean;
  caseId?: string;
}

const CaseForm: React.FC<CaseFormProps> = ({
  defaultValues = {},
  clients,
  onSubmit,
  isSubmitting,
  caseId,
}) => {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientId: defaultValues.clientId || '',
      caseNumber: defaultValues.caseNumber || '',
      caseName: defaultValues.caseName || '',
      defendantName: defaultValues.defendantName || '',
      serviceAddress: defaultValues.serviceAddress || '',
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFiles = Array.from(event.target.files);
      setFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const handleSubmit = async (values: FormValues) => {
    // First submit the form
    onSubmit(values);

    // Then upload any files if we have a caseId
    if (caseId && files.length > 0) {
      setUploading(true);
      try {
        const uploadPromises = files.map(file => uploadDocument(caseId, file));
        await Promise.all(uploadPromises);
        toast.success(`${files.length} document(s) uploaded successfully`);
        setFiles([]);
      } catch (error) {
        console.error('Error uploading documents:', error);
        toast.error('Failed to upload documents');
      } finally {
        setUploading(false);
      }
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="clientId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Client</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                disabled={isSubmitting}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.$id} value={client.$id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="caseNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Case Number</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. CV-2023-12345" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="caseName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Case Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Smith v. Jones" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <FormField
          control={form.control}
          name="defendantName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Defendant Name</FormLabel>
              <FormControl>
                <Input placeholder="Defendant's full name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="serviceAddress"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Service Address</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Full address where service will be attempted"
                  className="resize-none"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {caseId && (
          <div className="space-y-3">
            <FormLabel>Documents</FormLabel>
            <div className="border rounded-md p-4 bg-muted/30">
              <Input
                type="file"
                multiple
                onChange={handleFileChange}
                className="mb-2"
              />
              
              {files.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm font-medium mb-2">Selected files:</p>
                  <ul className="text-sm space-y-1">
                    {files.map((file, index) => (
                      <li key={index} className="text-muted-foreground">
                        {file.name}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
        
        <div className="flex justify-end space-x-2">
          <Button
            type="submit"
            disabled={isSubmitting || uploading}
          >
            {isSubmitting || uploading
              ? 'Saving...'
              : defaultValues.$id
              ? 'Update Case'
              : 'Create Case'}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default CaseForm;
