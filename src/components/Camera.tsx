
import React, { useRef, useState, useEffect } from "react";
import { Camera, X, Image, MapPin, CheckCircle, AlertCircle, RefreshCw, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getGpsPosition, getVideoDevices, isIOSDevice, isAndroidDevice } from "@/utils/gps";
import { useIsMobile } from "@/hooks/use-mobile";

interface CameraComponentProps {
  onCapture: (imageData: string, location: GeolocationCoordinates) => void;
}

const CameraComponent: React.FC<CameraComponentProps> = ({ onCapture }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [location, setLocation] = useState<GeolocationCoordinates | null>(null);
  const [locationStatus, setLocationStatus] = useState<"loading" | "success" | "error" | null>(null);
  const [cameraStatus, setCameraStatus] = useState<"loading" | "active" | "error" | "inactive">("inactive");
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string | null>(null);
  const [useNativeCamera, setUseNativeCamera] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    const fetchCameraDevices = async () => {
      try {
        const devices = await getVideoDevices();
        setCameraDevices(devices);
        console.log("Available camera devices:", devices);
        
        const rearCameraKeywords = [
          'back', 'rear', 'environment', 'exterior', 'world', 
          'trasera', 'arrière', 'hinten', 'задний', '后置', '後'
        ];
        
        const backCameras = devices.filter(d => {
          const label = d.label.toLowerCase();
          return rearCameraKeywords.some(keyword => label.includes(keyword));
        });
        
        if (backCameras.length > 0) {
          const preferredKeywords = ['ultra', 'wide', 'high', 'hd', '4k', 'main'];
          const bestRearCamera = backCameras.find(d => {
            const label = d.label.toLowerCase();
            return preferredKeywords.some(keyword => label.includes(keyword));
          }) || backCameras[0];
          
          setSelectedCamera(bestRearCamera.deviceId);
          console.log("Selected rear camera:", bestRearCamera.label);
        } else {
          const lastDevice = devices[devices.length - 1];
          setSelectedCamera(lastDevice.deviceId);
          console.log("No labeled rear camera found, using last device:", lastDevice.label);
        }
      } catch (error) {
        console.error("Error fetching camera devices:", error);
      }
    };
    
    fetchCameraDevices();
  }, []);

  useEffect(() => {
    if (!useNativeCamera) {
      startCamera();
    }
    
    getLocation();
    
    return () => {
      stopCamera();
    };
  }, [selectedCamera, useNativeCamera]);

  const startCamera = async () => {
    if (stream) {
      stopCamera();
    }
    
    setCameraStatus("loading");
    
    try {
      if (isIOSDevice() || isAndroidDevice() || isMobile) {
        try {
          console.log("Forcing environment/rear camera on mobile device");
          const constraints = {
            video: { 
              facingMode: { exact: "environment" },
              width: { ideal: 1920 },
              height: { ideal: 1080 }
            },
            audio: false
          };
          
          const envStream = await navigator.mediaDevices.getUserMedia(constraints);
          console.log("Successfully accessed rear camera with environment mode");
          handleCameraStartSuccess(envStream);
          return;
        } catch (err) {
          console.log("Environment camera failed with exact constraint, trying without 'exact':", err);
          
          try {
            const envStream = await navigator.mediaDevices.getUserMedia({
              video: { 
                facingMode: "environment",
                width: { ideal: 1280 },
                height: { ideal: 720 }
              },
              audio: false
            });
            
            console.log("Successfully accessed rear camera with relaxed environment mode");
            handleCameraStartSuccess(envStream);
            return;
          } catch (err2) {
            console.log("Environment camera failed with relaxed constraint:", err2);
          }
        }
      }
      
      if (selectedCamera) {
        console.log("Using selected camera device:", selectedCamera);
        try {
          const deviceStream = await navigator.mediaDevices.getUserMedia({
            video: { 
              deviceId: { exact: selectedCamera },
              width: { ideal: 1280 },
              height: { ideal: 720 }
            },
            audio: false
          });
          
          handleCameraStartSuccess(deviceStream);
          return;
        } catch (deviceErr) {
          console.log("Selected device failed, trying basic fallback:", deviceErr);
        }
      }
      
      console.log("Using basic camera constraints as fallback");
      const fallbackStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false
      });
      
      handleCameraStartSuccess(fallbackStream);
      
    } catch (err) {
      console.error("All camera access attempts failed:", err);
      setCameraStatus("error");
      
      setUseNativeCamera(true);
      
      console.log("Camera error: Using device camera app instead. Please take a photo when prompted.");
    }
  };

  const handleCameraStartSuccess = (mediaStream: MediaStream) => {
    setStream(mediaStream);
    
    if (videoRef.current) {
      videoRef.current.srcObject = mediaStream;
      
      videoRef.current.onloadedmetadata = () => {
        if (videoRef.current) {
          videoRef.current.play()
            .then(() => {
              console.log("Camera preview started successfully");
              setCameraActive(true);
              setCameraStatus("active");
            })
            .catch(e => {
              console.error("Error playing video:", e);
              setCameraStatus("error");
              setUseNativeCamera(true);
              console.log("Video playback error: Using device camera app instead. Please take a photo when prompted.");
            });
        }
      };
      
      videoRef.current.onerror = (e) => {
        console.error("Video element error:", e);
        setCameraStatus("error");
        setUseNativeCamera(true);
      };
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setCameraActive(false);
      setCameraStatus("inactive");
      
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }
  };

  const switchCamera = () => {
    if (cameraDevices.length <= 1) return;
    
    const currentIndex = cameraDevices.findIndex(device => device.deviceId === selectedCamera);
    const nextIndex = (currentIndex + 1) % cameraDevices.length;
    setSelectedCamera(cameraDevices[nextIndex].deviceId);
  };

  const switchToNativeCamera = () => {
    stopCamera();
    setUseNativeCamera(true);
  };

  const switchToInlineCamera = () => {
    setUseNativeCamera(false);
  };

  const getLocation = async () => {
    setLocationStatus("loading");
    try {
      const position = await getGpsPosition();
      setLocation(position.coords);
      setLocationStatus("success");
    } catch (error) {
      console.error("Error getting GPS:", error);
      setLocationStatus("error");
      console.log("Location error: Unable to get your location. GPS may be disabled.");
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current && location) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const context = canvas.getContext("2d");
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const imageData = canvas.toDataURL("image/jpeg", 0.8);
        setCapturedImage(imageData);
        stopCamera();
      }
    } else if (!location) {
      console.log("GPS required: Please wait for GPS location before capturing.");
    } else if (!videoRef.current || !canvasRef.current) {
      console.log("Camera error: The camera preview is not ready. Please restart the camera.");
    }
  };

  const useDeviceCamera = () => {
    if (fileInputRef.current && location) {
      fileInputRef.current.click();
    } else if (!location) {
      console.log("GPS required: Please wait for GPS location before capturing.");
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0 && location) {
      const file = files[0];
      
      if (!file.type.startsWith("image/")) {
        console.log("Invalid file: Please select an image file.");
        return;
      }
      
      const reader = new FileReader();
      reader.onload = () => {
        const imageData = reader.result as string;
        setCapturedImage(imageData);
      };
      reader.readAsDataURL(file);
    }
  };

  const resetCamera = () => {
    setCapturedImage(null);
    if (useNativeCamera) {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } else {
      startCamera();
    }
  };

  const confirmCapture = () => {
    if (capturedImage && location) {
      onCapture(capturedImage, location);
      setCapturedImage(null);
    }
  };

  return (
    <Card className="overflow-hidden neo-card animate-scale-in">
      <div className="relative">
        {!capturedImage ? (
          <>
            {useNativeCamera ? (
              <div className="aspect-[4/3] bg-black/10 flex items-center justify-center">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <div className="text-center p-8">
                  <Image className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-muted-foreground">Tap the button below to open your camera</p>
                </div>
              </div>
            ) : (
              <div className="aspect-[4/3] bg-black/90 flex items-center justify-center">
                {cameraStatus === "loading" && (
                  <div className="text-center p-8">
                    <RefreshCw className="w-12 h-12 mx-auto mb-4 text-white/50 animate-spin" />
                    <p className="text-white/70">Starting camera...</p>
                  </div>
                )}
                
                {cameraStatus === "error" && (
                  <div className="text-center p-8">
                    <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500/70" />
                    <p className="text-white/70">Camera error</p>
                    <p className="text-xs text-white/50 mt-2">Check permissions and try again</p>
                    <div className="flex gap-2 justify-center mt-4">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={startCamera}
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Retry
                      </Button>
                      <Button 
                        variant="default" 
                        size="sm" 
                        onClick={switchToNativeCamera}
                      >
                        <Camera className="w-4 h-4 mr-2" />
                        Use Device Camera
                      </Button>
                    </div>
                  </div>
                )}
                
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className={cn(
                    "w-full h-full object-cover transition-opacity duration-500",
                    cameraStatus === "active" ? "opacity-100" : "opacity-0"
                  )}
                />
              </div>
            )}
            
            <div className="absolute bottom-3 right-3 flex items-center gap-2">
              {locationStatus && (
                <div className={cn(
                  "px-3 py-1 rounded-full text-xs flex items-center gap-1.5 backdrop-blur-lg shadow-sm", 
                  locationStatus === "loading" ? "bg-muted/70 text-muted-foreground" :
                  locationStatus === "success" ? "bg-green-500/20 text-green-700" :
                  "bg-destructive/20 text-destructive"
                )}>
                  {locationStatus === "loading" ? (
                    <MapPin className="w-3 h-3 animate-pulse" />
                  ) : locationStatus === "success" ? (
                    <CheckCircle className="w-3 h-3" />
                  ) : (
                    <AlertCircle className="w-3 h-3" />
                  )}
                  <span>
                    {locationStatus === "loading" ? "Getting location..." :
                     locationStatus === "success" ? "GPS Ready" :
                     "GPS Error"}
                  </span>
                </div>
              )}
            </div>
            
            <div className="absolute top-3 left-3">
              <Button 
                variant="secondary" 
                size="sm" 
                className="rounded-full bg-black/30 backdrop-blur-sm border-0 text-white text-xs" 
                onClick={useNativeCamera ? switchToInlineCamera : switchToNativeCamera}
              >
                {useNativeCamera ? "Use In-App Camera" : "Use Device Camera"}
              </Button>
            </div>
            
            {!useNativeCamera && cameraDevices.length > 1 && cameraStatus === "active" && (
              <div className="absolute top-3 right-3">
                <Button 
                  variant="secondary" 
                  size="icon" 
                  className="rounded-full h-8 w-8 bg-black/30 backdrop-blur-sm border-0" 
                  onClick={switchCamera}
                >
                  <RefreshCw className="h-4 w-4 text-white" />
                </Button>
              </div>
            )}
            
            <canvas ref={canvasRef} className="hidden" />
          </>
        ) : (
          <div className="aspect-[4/3] bg-black/10">
            <img 
              src={capturedImage} 
              alt="Captured" 
              className="w-full h-full object-cover" 
            />
          </div>
        )}
      </div>

      <div className="p-4 flex gap-2 justify-between">
        {!cameraActive && !capturedImage && cameraStatus !== "loading" && !useNativeCamera ? (
          <Button onClick={startCamera} className="w-full" size="lg">
            <Camera className="w-4 h-4 mr-2" />
            Start Camera
          </Button>
        ) : capturedImage ? (
          <>
            <Button 
              variant="outline" 
              onClick={resetCamera}
              className="flex-1"
            >
              <X className="w-4 h-4 mr-2" />
              Retake
            </Button>
            <Button 
              variant="default"
              onClick={confirmCapture}
              className="flex-1"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Use Photo
            </Button>
          </>
        ) : useNativeCamera ? (
          <>
            <Button 
              variant="outline" 
              onClick={() => setUseNativeCamera(false)}
              className="flex-1"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button 
              variant="default"
              onClick={useDeviceCamera}
              disabled={locationStatus !== "success"}
              className="flex-1"
            >
              <Camera className="w-4 h-4 mr-2" />
              Take Photo
            </Button>
          </>
        ) : (
          <>
            <Button 
              variant="outline" 
              onClick={stopCamera}
              className="flex-1"
              disabled={cameraStatus === "loading"}
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button 
              variant="default"
              onClick={capturePhoto}
              disabled={locationStatus !== "success" || cameraStatus !== "active"}
              className="flex-1"
            >
              <Camera className="w-4 h-4 mr-2" />
              Capture
            </Button>
          </>
        )}
      </div>
    </Card>
  );
};

export default CameraComponent;

const cn = (...classes: (string | boolean | undefined)[]) => {
  return classes.filter(Boolean).join(" ");
};
