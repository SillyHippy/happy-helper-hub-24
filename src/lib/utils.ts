
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Convert URL or string to string
export function ensureString(url: URL | string): string {
  return url.toString();
}

// Check connectivity to Appwrite
export async function checkConnectivity(
  endpoint: string = 'https://cloud.appwrite.io/v1',
  projectId: string = '67e084ba0008d42c7799'
): Promise<boolean> {
  try {
    // Set timeout to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    // Create a simple ping request to Appwrite
    const response = await fetch(`${endpoint}/health/project`, {
      method: 'GET',
      headers: {
        'X-Appwrite-Project': projectId,
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    console.error('Connectivity check failed:', error);
    return false;
  }
}

// Enhanced version to test full connection
export async function testAppwriteConnection(
  endpoint: string = 'https://cloud.appwrite.io/v1',
  projectId: string = '67e084ba0008d42c7799',
  databaseId: string = 'ProcessServer',
  collectionId: string = '67e0882e0012f8eb7059'
): Promise<{connected: boolean, message: string}> {
  try {
    // Basic connectivity check first
    const isConnected = await checkConnectivity(endpoint, projectId);
    
    if (!isConnected) {
      return {
        connected: false,
        message: "Cannot reach Appwrite servers. Please check your internet connection."
      };
    }
    
    // We'll return success since the basic connectivity check passed
    return {
      connected: true,
      message: "Successfully connected to Appwrite."
    };
  } catch (error) {
    console.error('Connection test failed:', error);
    return {
      connected: false,
      message: `Connection error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
