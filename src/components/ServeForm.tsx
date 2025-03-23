
import React, { useState, useEffect } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Camera } from 'lucide-react';
import CameraCapture from './CameraCapture';
import { Case, Client } from '@/lib/types';
import { storage, ID } from '@/lib/appwrite';

const formSchema = z.object({
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface ServeFormProps {
  caseData: Case;
  clientData: Client;
  onSubmit: (values: FormValues & { photoFileId: string; latitude: number; longitude: number }) => Promise<void>;
  isSubmitting: boolean;
}

const ServeForm: React.FC<ServeFormProps> = ({
  caseData,
  clientData,
  onSubmit,
  isSubmitting,
}) => {
  const [showCamera, setShowCamera] = useState(false);
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [position, setPosition] = useState<{ latitude: number; longitude: number } | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      notes: '',
    },
  });

  useEffect(() => {
    // Get current position when component mounts
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
      },
      (error) => {
        console.error('Error getting location:', error);
      },
      { enableHighAccuracy: true }
    );
  }, []);

  const handleCameraCapture = (blob: Blob) => {
    setPhotoBlob(blob);
    setPhotoPreview(URL.createObjectURL(blob));
  };

  const handleSubmit = async (values: FormValues) => {
    if (!photoBlob || !position) {
      return;
    }

    setUploadingPhoto(true);
    
    try {
      // First upload the photo to storage
      const file = new File([photoBlob], `serve-attempt-${Date.now()}.jpg`, {
        type: 'image/jpeg',
      });
      
      const uploadedFile = await storage.createFile(
        '67e08aeb0010e3a474db', // documents bucket
        ID.unique(),
        file
      );
      
      // Then submit the form with the file ID
      await onSubmit({
        ...values,
        photoFileId: uploadedFile.$id,
        latitude: position.latitude,
        longitude: position.longitude,
      });
      
      // Reset form state
      setPhotoBlob(null);
      setPhotoPreview(null);
      form.reset();
    } catch (error) {
      console.error('Error uploading photo:', error);
    } finally {
      setUploadingPhoto(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-medium">Case Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/30 rounded-md">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Case Number</p>
            <p>{caseData.caseNumber}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Case Name</p>
            <p>{caseData.caseName}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Client</p>
            <p>{clientData.name}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Defendant</p>
            <p>{caseData.defendantName}</p>
          </div>
          <div className="col-span-1 md:col-span-2">
            <p className="text-sm font-medium text-muted-foreground">Service Address</p>
            <p>{caseData.serviceAddress}</p>
          </div>
        </div>
      </div>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <div className="space-y-4">
            <FormLabel>Service Photo</FormLabel>
            
            {photoPreview ? (
              <div className="relative">
                <img 
                  src={photoPreview} 
                  alt="Service attempt" 
                  className="w-full h-48 object-cover rounded-md border"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="absolute bottom-2 right-2"
                  onClick={() => setShowCamera(true)}
                >
                  Retake
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="w-full h-48 flex flex-col items-center justify-center gap-2 border-dashed"
                onClick={() => setShowCamera(true)}
              >
                <Camera size={32} />
                <span>Capture Photo</span>
              </Button>
            )}
            
            {position && (
              <div className="text-xs text-muted-foreground">
                GPS Coordinates: {position.latitude.toFixed(6)}, {position.longitude.toFixed(6)}
              </div>
            )}
          </div>
          
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Enter any notes about the service attempt"
                    className="resize-none h-24"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <Button
            type="submit"
            disabled={isSubmitting || uploadingPhoto || !photoBlob || !position}
            className="w-full"
          >
            {isSubmitting || uploadingPhoto ? 'Submitting...' : 'Record Service Attempt'}
          </Button>
        </form>
      </Form>
      
      {showCamera && (
        <CameraCapture
          onCapture={handleCameraCapture}
          onClose={() => setShowCamera(false)}
        />
      )}
    </div>
  );
};

export default ServeForm;
