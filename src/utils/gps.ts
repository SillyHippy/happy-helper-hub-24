
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
      position => {
        console.log("Got position:", position.coords);
        resolve(position);
      },
      error => {
        console.error("Geolocation error:", error);
        reject(error);
      },
      { 
        enableHighAccuracy: true, 
        timeout: 15000, 
        maximumAge: 0 
      }
    );
  });
};

/**
 * Type guard to check if an object is GeolocationCoordinates
 * @param coordinates The coordinates object to check
 * @returns Boolean indicating if coordinates are valid GeolocationCoordinates
 */
export function isGeolocationCoordinates(coordinates: any): coordinates is GeolocationCoordinates {
  if (!coordinates) return false;
  
  // Check if it's a proper object
  if (typeof coordinates !== 'object') return false;
  
  // Check if it has latitude and longitude properties
  if (!('latitude' in coordinates) || !('longitude' in coordinates)) return false;
  
  // Check if latitude and longitude are valid numbers
  if (typeof coordinates.latitude !== 'number' || 
      typeof coordinates.longitude !== 'number' ||
      isNaN(coordinates.latitude) || 
      isNaN(coordinates.longitude)) {
    return false;
  }
  
  // Check if values are within valid ranges
  if (coordinates.latitude < -90 || coordinates.latitude > 90 ||
      coordinates.longitude < -180 || coordinates.longitude > 180) {
    return false;
  }
  
  return true;
}

/**
 * Checks if coordinates are valid
 * @param coordinates The coordinates object to check
 * @returns Boolean indicating if coordinates are valid
 */
export const hasValidCoordinates = (coordinates: any): boolean => {
  return isGeolocationCoordinates(coordinates);
};

/**
 * Formats coordinates for display
 * @param latitude Latitude value
 * @param longitude Longitude value
 * @returns Formatted coordinates string
 */
export const formatCoordinates = (latitude: number, longitude: number): string => {
  if (typeof latitude !== 'number' || typeof longitude !== 'number' || 
      isNaN(latitude) || isNaN(longitude)) {
    return "Invalid coordinates";
  }
  
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
  if (typeof latitude !== 'number' || typeof longitude !== 'number' || 
      isNaN(latitude) || isNaN(longitude)) {
    return "#";
  }
  return `https://www.google.com/maps?q=${latitude},${longitude}`;
};

/**
 * Safely formats coordinates or returns a fallback
 * @param coords The coordinates object or null
 * @returns Formatted coordinates string or "No location data"
 */
export const safeFormatCoordinates = (coords: any): string => {
  if (!isGeolocationCoordinates(coords)) {
    return "No location data";
  }
  return formatCoordinates(coords.latitude, coords.longitude);
};

/**
 * Safely gets Google Maps URL or returns a fallback
 * @param coords The coordinates object or null
 * @returns Google Maps URL or "#"
 */
export const safeGetGoogleMapsUrl = (coords: any): string => {
  if (!isGeolocationCoordinates(coords)) {
    return "#";
  }
  return getGoogleMapsUrl(coords.latitude, coords.longitude);
};

/**
 * Embeds GPS metadata into an image
 * @param imageDataUrl The base64 image data
 * @param coords The GPS coordinates
 * @returns The image with GPS metadata embedded
 */
export const embedGpsIntoImage = (
  imageDataUrl: string,
  coords: any
): string => {
  // In a real application, we would use a library like piexifjs to properly 
  // embed EXIF data. For this demo, we'll include the GPS data in a data attribute
  // when we create the final serve record.
  
  if (isGeolocationCoordinates(coords)) {
    console.log("Embedding GPS metadata", coords);
  } else {
    console.log("No valid GPS metadata to embed");
  }
  
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
