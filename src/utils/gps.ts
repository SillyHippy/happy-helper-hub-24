
/**
 * Gets the current GPS position
 * @returns Promise with the current position
 */
export const getGpsPosition = (): Promise<GeolocationPosition> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by this browser."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      position => resolve(position),
      error => reject(error),
      { 
        enableHighAccuracy: true, 
        timeout: 15000, 
        maximumAge: 0 
      }
    );
  });
};

/**
 * Formats coordinates for display
 * @param latitude Latitude value
 * @param longitude Longitude value
 * @returns Formatted coordinates string
 */
export const formatCoordinates = (latitude: number, longitude: number): string => {
  const latDir = latitude >= 0 ? "N" : "S";
  const longDir = longitude >= 0 ? "E" : "W";
  
  const latDeg = Math.abs(latitude).toFixed(6);
  const longDeg = Math.abs(longitude).toFixed(6);
  
  return `${latDeg}° ${latDir}, ${longDeg}° ${longDir}`;
};

/**
 * Creates a Google Maps URL for the given coordinates
 * @param latitude Latitude value
 * @param longitude Longitude value
 * @returns Google Maps URL
 */
export const getGoogleMapsUrl = (latitude: number, longitude: number): string => {
  return `https://www.google.com/maps?q=${latitude},${longitude}`;
};

/**
 * Embeds GPS metadata into an image
 * @param imageDataUrl The base64 image data
 * @param coords The GPS coordinates
 * @returns The image with GPS metadata embedded
 */
export const embedGpsIntoImage = (
  imageDataUrl: string,
  coords: GeolocationCoordinates
): string => {
  // In a real application, we would use a library like piexifjs to properly 
  // embed EXIF data. For this demo, we'll include the GPS data in a data attribute
  // when we create the final serve record.
  
  console.log("Embedding GPS metadata", coords);
  return imageDataUrl;
};

/**
 * Helper to check if the device has a rear camera
 * @returns Promise resolving to a list of available video devices
 */
export const getVideoDevices = async (): Promise<MediaDeviceInfo[]> => {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter(device => device.kind === 'videoinput');
  } catch (error) {
    console.error('Error enumerating devices:', error);
    return [];
  }
};

/**
 * Checks if the app is running on an iOS device
 * @returns boolean indicating if the device is iOS
 */
export const isIOSDevice = (): boolean => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
};

/**
 * Checks if the app is running on an Android device
 * @returns boolean indicating if the device is Android
 */
export const isAndroidDevice = (): boolean => {
  return /Android/.test(navigator.userAgent);
};
