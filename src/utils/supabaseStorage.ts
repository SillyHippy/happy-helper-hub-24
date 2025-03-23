
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";

const STORAGE_BUCKET = "client-documents";

export interface UploadedDocument {
  id: string;
  clientId: string;
  fileName: string;
  filePath: string;
  fileType: string;
  fileSize: number;
  caseNumber?: string;
  description?: string;
  caseName?: string; // Added to store case name
}

export async function uploadClientDocument(
  clientId: string,
  file: File,
  caseNumber?: string,
  description?: string
): Promise<UploadedDocument | null> {
  try {
    // Create a unique file path to prevent collisions
    const fileExt = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExt}`;
    const filePath = `${clientId}/${fileName}`;
    
    // Upload the file to Supabase Storage
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });
    
    if (error) {
      console.error("Error uploading document:", error);
      return null;
    }
    
    // If a case number is provided, fetch the case name
    let caseName = undefined;
    if (caseNumber) {
      const { data: caseData, error: caseError } = await supabase
        .from('client_cases')
        .select('case_name')
        .eq('client_id', clientId)
        .eq('case_number', caseNumber)
        .maybeSingle();
      
      if (caseData && !caseError) {
        caseName = caseData.case_name;
      }
    }
    
    // Create a record in the client_documents table
    const { data: documentData, error: documentError } = await supabase
      .from('client_documents')
      .insert({
        client_id: clientId,
        file_name: file.name,
        file_path: data.path,
        file_type: file.type,
        file_size: file.size,
        case_number: caseNumber,
        description: description
      })
      .select()
      .single();
    
    if (documentError) {
      console.error("Error creating document record:", documentError);
      return null;
    }
    
    return {
      id: documentData.id,
      clientId: documentData.client_id,
      fileName: documentData.file_name,
      filePath: documentData.file_path,
      fileType: documentData.file_type,
      fileSize: documentData.file_size,
      caseNumber: documentData.case_number,
      description: documentData.description,
      caseName: caseName
    };
  } catch (error) {
    console.error("Unexpected error uploading document:", error);
    return null;
  }
}

export async function getClientDocuments(clientId: string, caseNumber?: string): Promise<UploadedDocument[]> {
  try {
    // Fetch document records
    const { data: documentsData, error } = await supabase
      .from('client_documents')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error("Error fetching client documents:", error);
      return [];
    }
    
    // If no documents are found, return empty array
    if (!documentsData) {
      return [];
    }
    
    // Fetch all case numbers and names for this client to enrich the document data
    const { data: cases, error: casesError } = await supabase
      .from('client_cases')
      .select('case_number, case_name')
      .eq('client_id', clientId);
    
    if (casesError) {
      console.error("Error fetching client cases:", casesError);
    }
    
    // Create a map of case numbers to case names for quick lookup
    const caseMap = new Map();
    if (cases) {
      cases.forEach(c => caseMap.set(c.case_number, c.case_name));
    }
    
    // Map documents to UploadedDocument interface and include case names
    // If caseNumber is provided, filter the documents during the mapping phase
    const mappedDocuments = documentsData.map(doc => ({
      id: doc.id,
      clientId: doc.client_id,
      fileName: doc.file_name,
      filePath: doc.file_path,
      fileType: doc.file_type,
      fileSize: doc.file_size,
      caseNumber: doc.case_number,
      description: doc.description,
      caseName: doc.case_number ? caseMap.get(doc.case_number) : undefined
    }));
    
    // Apply caseNumber filter if provided
    if (caseNumber) {
      return mappedDocuments.filter(doc => doc.caseNumber === caseNumber);
    }
    
    return mappedDocuments;
  } catch (error) {
    console.error("Unexpected error fetching documents:", error);
    return [];
  }
}

export async function getDocumentUrl(filePath: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(filePath, 60 * 5); // 5 minutes expiry
    
    if (error) {
      console.error("Error creating signed URL:", error);
      return null;
    }
    
    return data.signedUrl;
  } catch (error) {
    console.error("Unexpected error getting document URL:", error);
    return null;
  }
}

export async function deleteClientDocument(id: string, filePath: string): Promise<boolean> {
  try {
    console.log(`Attempting to delete document with ID: ${id} and filePath: ${filePath}`);
    
    // Delete from storage first
    if (filePath) {
      const { error: storageError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove([filePath]);
      
      if (storageError) {
        console.error("Error deleting document from storage:", storageError);
        // Continue to delete the database record even if storage deletion fails
        console.log("Continuing to delete database record despite storage error");
      } else {
        console.log("Successfully deleted file from storage");
      }
    } else {
      console.log("No file path provided, skipping storage deletion");
    }
    
    // Then delete the database record
    const { error: dbError } = await supabase
      .from('client_documents')
      .delete()
      .eq('id', id);
    
    if (dbError) {
      console.error("Error deleting document record:", dbError);
      toast("Error deleting document", {
        description: "Document record could not be deleted. Please try again."
      });
      return false;
    }
    
    console.log("Successfully deleted document record from database");
    toast("Document deleted", {
      description: "Document has been permanently removed."
    });
    
    return true;
  } catch (error) {
    console.error("Unexpected error deleting document:", error);
    toast("Error deleting document", {
      description: "An unexpected error occurred. Please try again."
    });
    return false;
  }
}

export async function getClientCases(clientId: string): Promise<{ caseNumber: string; caseName?: string }[]> {
  try {
    const { data, error } = await supabase
      .from('client_cases')
      .select('case_number, case_name')
      .eq('client_id', clientId)
      .not('status', 'eq', 'Closed') // Exclude Closed cases
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error("Error fetching client cases:", error);
      return [];
    }
    
    return data.map(c => ({
      caseNumber: c.case_number,
      caseName: c.case_name
    }));
  } catch (error) {
    console.error("Unexpected error fetching cases:", error);
    return [];
  }
}

export async function getServeAttemptsCount(clientId: string, caseNumber: string): Promise<number> {
  try {
    console.log(`Checking serve attempts for client ${clientId} and case ${caseNumber}`);
    
    // First try to load from Supabase if available
    try {
      const { data, error } = await supabase
        .from('serve_attempts')
        .select('id')
        .eq('client_id', clientId)
        .eq('case_number', caseNumber);
      
      if (!error && data) {
        console.log(`Found ${data.length} attempts in Supabase`);
        return data.length;
      }
    } catch (e) {
      console.log("Supabase serve_attempts table doesn't exist yet, using local storage instead");
    }
    
    // Fallback to local storage
    const serveAttemptsStr = localStorage.getItem("serve-tracker-serves");
    if (!serveAttemptsStr) return 0;
    
    const serveAttempts = JSON.parse(serveAttemptsStr);
    const caseAttempts = serveAttempts.filter(
      (serve: any) => serve.clientId === clientId && serve.caseNumber === caseNumber
    );
    
    console.log(`Found ${caseAttempts.length} attempts in local storage for client ${clientId} and case ${caseNumber}`);
    return caseAttempts.length;
  } catch (error) {
    console.error("Error counting serve attempts:", error);
    return 0;
  }
}

export async function updateCaseStatus(clientId: string, caseNumber: string, serveStatus: string): Promise<boolean> {
  try {
    let newStatus = 'Pending';
    
    // If served successfully, mark as Closed
    if (serveStatus === 'Served') {
      newStatus = 'Closed';
    } 
    // If failed attempt, keep as Pending
    else if (serveStatus === 'Failed') {
      newStatus = 'Pending';
    }
    
    console.log(`Updating case status for client ${clientId}, case ${caseNumber} to ${newStatus}`);
    
    const { error } = await supabase
      .from('client_cases')
      .update({ status: newStatus })
      .eq('client_id', clientId)
      .eq('case_number', caseNumber);
    
    if (error) {
      console.error("Error updating case status:", error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Unexpected error updating case status:", error);
    return false;
  }
}

export async function exportServeData(startDate?: Date, endDate?: Date): Promise<{ 
  success: boolean; 
  data?: string; 
  error?: string;
}> {
  try {
    // Set default date range if not provided
    const end = endDate || new Date();
    const start = startDate || new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000); // Default 30 days back
    
    console.log(`Exporting serve data from ${start.toISOString()} to ${end.toISOString()}`);
    
    // First try to load from Supabase if available
    let serveData = [];
    try {
      const { data, error } = await supabase
        .from('serve_attempts')
        .select('*, clients(*)')
        .gte('timestamp', start.toISOString())
        .lte('timestamp', end.toISOString())
        .order('timestamp', { ascending: false });
      
      if (!error && data) {
        console.log(`Found ${data.length} serve attempts in Supabase`);
        serveData = data;
      } else {
        throw new Error("Falling back to local storage");
      }
    } catch (e) {
      console.log("Using local storage for serve data export");
      
      // Fall back to local storage
      const serveAttemptsStr = localStorage.getItem("serve-tracker-serves");
      if (!serveAttemptsStr) {
        return { success: false, error: "No serve data found" };
      }
      
      const allServes = JSON.parse(serveAttemptsStr);
      
      // Filter by date
      serveData = allServes.filter((serve: any) => {
        const serveDate = new Date(serve.timestamp);
        return serveDate >= start && serveDate <= end;
      });
      
      // For each serve, get the client info
      const clientsStr = localStorage.getItem("serve-tracker-clients");
      const clients = clientsStr ? JSON.parse(clientsStr) : [];
      
      serveData = serveData.map((serve: any) => {
        const client = clients.find((c: any) => c.id === serve.clientId) || {};
        return {
          ...serve,
          client
        };
      });
    }
    
    if (serveData.length === 0) {
      return { success: false, error: "No serve data found in the specified date range" };
    }
    
    // Generate CSV header
    const csvHeader = [
      'Date', 
      'Time', 
      'Client Name', 
      'Client Address', 
      'Case Number', 
      'Status', 
      'Notes', 
      'GPS Coordinates', 
      'Attempt #'
    ].join(',') + '\n';
    
    // Generate CSV rows
    const csvRows = serveData.map((serve: any) => {
      const date = new Date(serve.timestamp);
      const clientName = (serve.clients ? serve.clients.name : serve.client?.name) || 'Unknown';
      const clientAddress = (serve.clients ? serve.clients.address : serve.client?.address) || 'Unknown';
      
      return [
        date.toLocaleDateString(),
        date.toLocaleTimeString(),
        `"${clientName.replace(/"/g, '""')}"`,
        `"${clientAddress.replace(/"/g, '""')}"`,
        `"${(serve.case_number || serve.caseNumber || '').replace(/"/g, '""')}"`,
        `"${(serve.status || '').replace(/"/g, '""')}"`,
        `"${(serve.notes || '').replace(/"/g, '""')}"`,
        serve.coordinates ? `"${serve.coordinates.latitude},${serve.coordinates.longitude}"` : '',
        serve.attempt_number || serve.attemptNumber || 1
      ].join(',');
    }).join('\n');
    
    // Combine header and rows
    const csv = csvHeader + csvRows;
    
    return { 
      success: true, 
      data: csv 
    };
  } catch (error) {
    console.error("Error exporting serve data:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error exporting data" 
    };
  }
}
