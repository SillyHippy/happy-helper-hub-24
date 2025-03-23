
import React, { useRef, useEffect, useState } from 'react';
import { Camera, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CameraCaptureProps {
  onCapture: (blob: Blob) => void;
  onClose: () => void;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [position, setPosition] = useState<GeolocationPosition | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  // Start the camera
  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setIsCameraActive(true);
        }
      } catch (err) {
        console.error('Error accessing camera:', err);
        setError('Could not access camera. Please ensure you have granted permission.');
      }
    };

    startCamera();

    // Get location
    navigator.geolocation.getCurrentPosition(
      (position) => setPosition(position),
      (err) => {
        console.error('Error getting location:', err);
        setError('Could not access your location. Please ensure location services are enabled.');
      },
      { enableHighAccuracy: true }
    );

    // Cleanup
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current && position) {
      setIsCapturing(true);
      
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Set canvas size to match video dimensions
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw video frame to canvas
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Add location and timestamp to the image
        context.fillStyle = 'rgba(0, 0, 0, 0.5)';
        context.fillRect(0, canvas.height - 60, canvas.width, 60);
        
        context.fillStyle = 'white';
        context.font = '14px Arial';
        
        const timestamp = new Date().toLocaleString();
        const coords = `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`;
        
        context.fillText(`Time: ${timestamp}`, 10, canvas.height - 40);
        context.fillText(`Location: ${coords}`, 10, canvas.height - 20);
        
        // Convert to blob and pass to parent
        canvas.toBlob((blob) => {
          if (blob) {
            const imageUrl = URL.createObjectURL(blob);
            setCapturedImage(imageUrl);
            onCapture(blob);
          }
          setIsCapturing(false);
        }, 'image/jpeg', 0.95);
      }
    } else {
      setError('Camera or location not available.');
      setIsCapturing(false);
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      <div className="flex justify-between items-center p-4 bg-black/80">
        <h3 className="text-white font-medium">Capture Photo</h3>
        <Button variant="ghost" size="icon" onClick={onClose} className="text-white">
          <X />
        </Button>
      </div>
      
      <div className="relative flex-1 flex items-center justify-center overflow-hidden">
        {!capturedImage ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className={cn(
                "w-full h-full object-cover",
                !isCameraActive && "hidden"
              )}
            />
            
            {error && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80 text-white p-4 text-center">
                <div>
                  <p className="mb-4">{error}</p>
                  <Button onClick={onClose}>Close</Button>
                </div>
              </div>
            )}
            
            {position && (
              <div className="absolute bottom-20 left-0 right-0 bg-black/50 text-white p-2 text-xs">
                <p>Location: {position.coords.latitude.toFixed(6)}, {position.coords.longitude.toFixed(6)}</p>
                <p>Accuracy: ±{position.coords.accuracy.toFixed(1)}m</p>
              </div>
            )}
          </>
        ) : (
          <img 
            src={capturedImage} 
            alt="Captured" 
            className="w-full h-full object-contain bg-black" 
          />
        )}
        
        <canvas ref={canvasRef} className="hidden" />
      </div>
      
      <div className="p-4 bg-black/80 flex justify-center">
        {!capturedImage ? (
          <Button 
            onClick={capturePhoto} 
            disabled={!isCameraActive || !position || isCapturing}
            className="rounded-full w-16 h-16 flex items-center justify-center"
          >
            <Camera size={24} />
          </Button>
        ) : (
          <div className="flex space-x-4">
            <Button onClick={retakePhoto} variant="outline" className="text-white">
              Retake
            </Button>
            <Button onClick={onClose}>Done</Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CameraCapture;
