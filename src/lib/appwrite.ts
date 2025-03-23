
import { Client, Account, Databases, Storage, ID, Query, Models } from 'appwrite';
import { Client as ClientType, Case, ServeAttempt, Document as DocumentType } from './types';
import { ensureString } from './utils';

// Appwrite configuration - Updated with values from screenshots
const endpoint = 'https://cloud.appwrite.io/v1';
const projectId = '67e084ba0008d42c7799'; // From your screenshots
const databaseId = 'ProcessServer'; // From your screenshots
const storageId = '67e08aeb0010e3a474db'; // From your storage bucket ID

// Initialize the Appwrite client
const client = new Client()
  .setEndpoint(endpoint)
  .setProject(projectId);

// Initialize services
const account = new Account(client);
const databases = new Databases(client);
const storage = new Storage(client);

// Collection IDs from your screenshots
const CLIENTS_COLLECTION_ID = '67e0882e0012f8eb7059';
const CASES_COLLECTION_ID = '67e088f0001f95a083ab';
const SERVE_ATTEMPTS_COLLECTION_ID = '67e089ed001b95fbecf7';
const DOCUMENTS_COLLECTION_ID = '67e08a97001e389eb962';
const STORAGE_BUCKET_ID = storageId;

// Client functions
export const createClient = async (name: string, email: string, phone: string, address: string) => {
  try {
    return await databases.createDocument(
      databaseId,
      CLIENTS_COLLECTION_ID,
      ID.unique(),
      {
        name,
        email,
        phone,
        address,
        createdAt: new Date().toISOString(),
      }
    );
  } catch (error) {
    console.error('Error creating client:', error);
    throw error;
  }
};

export const getClients = async (): Promise<ClientType[]> => {
  try {
    const response = await databases.listDocuments(
      databaseId,
      CLIENTS_COLLECTION_ID,
      [Query.orderDesc('createdAt')]
    );
    return response.documents as unknown as ClientType[];
  } catch (error) {
    console.error('Error fetching clients:', error);
    throw error;
  }
};

export const getClient = async (clientId: string): Promise<ClientType> => {
  try {
    const response = await databases.getDocument(
      databaseId,
      CLIENTS_COLLECTION_ID,
      clientId
    );
    return response as unknown as ClientType;
  } catch (error) {
    console.error('Error fetching client:', error);
    throw error;
  }
};

export const updateClient = async (clientId: string, data: {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
}) => {
  try {
    return await databases.updateDocument(
      databaseId,
      CLIENTS_COLLECTION_ID,
      clientId,
      data
    );
  } catch (error) {
    console.error('Error updating client:', error);
    throw error;
  }
};

export const deleteClient = async (clientId: string) => {
  try {
    // First get cases for this client
    const cases = await databases.listDocuments(
      databaseId,
      CASES_COLLECTION_ID,
      [Query.equal('clientId', clientId)]
    );
    
    // Delete each case and its related data
    for (const caseDoc of cases.documents) {
      await deleteCase(caseDoc.$id);
    }
    
    // Delete the client
    return await databases.deleteDocument(
      databaseId,
      CLIENTS_COLLECTION_ID,
      clientId
    );
  } catch (error) {
    console.error('Error deleting client:', error);
    throw error;
  }
};

// Case functions
export const createCase = async (
  clientId: string,
  caseNumber: string,
  caseName: string,
  defendantName: string,
  serviceAddress: string
) => {
  try {
    return await databases.createDocument(
      databaseId,
      CASES_COLLECTION_ID,
      ID.unique(),
      {
        clientId,
        caseNumber,
        caseName,
        defendantName,
        serviceAddress,
        status: 'pending',
        createdAt: new Date().toISOString(),
      }
    );
  } catch (error) {
    console.error('Error creating case:', error);
    throw error;
  }
};

export const getCases = async (filters: { clientId?: string } = {}): Promise<Case[]> => {
  try {
    const queries = [];
    
    if (filters.clientId) {
      queries.push(Query.equal('clientId', filters.clientId));
    }
    
    queries.push(Query.orderDesc('createdAt'));
    
    const response = await databases.listDocuments(
      databaseId,
      CASES_COLLECTION_ID,
      queries
    );
    
    return response.documents as unknown as Case[];
  } catch (error) {
    console.error('Error fetching cases:', error);
    throw error;
  }
};

export const getCase = async (caseId: string): Promise<Case> => {
  try {
    const response = await databases.getDocument(
      databaseId,
      CASES_COLLECTION_ID,
      caseId
    );
    return response as unknown as Case;
  } catch (error) {
    console.error('Error fetching case:', error);
    throw error;
  }
};

export const updateCase = async (caseId: string, data: {
  caseNumber?: string;
  caseName?: string;
  defendantName?: string;
  serviceAddress?: string;
  status?: string;
}) => {
  try {
    return await databases.updateDocument(
      databaseId,
      CASES_COLLECTION_ID,
      caseId,
      data
    );
  } catch (error) {
    console.error('Error updating case:', error);
    throw error;
  }
};

export const deleteCase = async (caseId: string) => {
  try {
    // Delete serve attempts for this case
    const attempts = await databases.listDocuments(
      databaseId,
      SERVE_ATTEMPTS_COLLECTION_ID,
      [Query.equal('caseId', caseId)]
    );
    
    for (const attempt of attempts.documents) {
      await databases.deleteDocument(
        databaseId,
        SERVE_ATTEMPTS_COLLECTION_ID,
        attempt.$id
      );
    }
    
    // Delete documents for this case
    const documents = await databases.listDocuments(
      databaseId,
      DOCUMENTS_COLLECTION_ID,
      [Query.equal('caseId', caseId)]
    );
    
    for (const doc of documents.documents) {
      // Delete the file from storage
      try {
        await storage.deleteFile(STORAGE_BUCKET_ID, doc.fileId);
      } catch (e) {
        console.error('Error deleting file:', e);
      }
      
      // Delete the document record
      await databases.deleteDocument(
        databaseId,
        DOCUMENTS_COLLECTION_ID,
        doc.$id
      );
    }
    
    // Delete the case
    return await databases.deleteDocument(
      databaseId,
      CASES_COLLECTION_ID,
      caseId
    );
  } catch (error) {
    console.error('Error deleting case:', error);
    throw error;
  }
};

// Serve attempt functions
export const getServeAttempts = async (caseId: string): Promise<ServeAttempt[]> => {
  try {
    const response = await databases.listDocuments(
      databaseId,
      SERVE_ATTEMPTS_COLLECTION_ID,
      [
        Query.equal('caseId', caseId),
        Query.orderDesc('createdAt')
      ]
    );
    
    return response.documents as unknown as ServeAttempt[];
  } catch (error) {
    console.error('Error fetching serve attempts:', error);
    throw error;
  }
};

export const createServeAttempt = async (
  caseId: string,
  latitude: number,
  longitude: number,
  notes: string,
  photoFileId: string
) => {
  try {
    // Get the existing attempts to determine attempt number
    const attempts = await getServeAttempts(caseId);
    const attemptNumber = attempts.length + 1;
    
    // Create the photo URL
    const photoUrl = storage.getFileView(STORAGE_BUCKET_ID, photoFileId);
    
    // Create the serve attempt
    return await databases.createDocument(
      databaseId,
      SERVE_ATTEMPTS_COLLECTION_ID,
      ID.unique(),
      {
        caseId,
        attemptNumber,
        latitude,
        longitude,
        photoUrl: ensureString(photoUrl),
        notes,
        createdAt: new Date().toISOString(),
      }
    );
  } catch (error) {
    console.error('Error creating serve attempt:', error);
    throw error;
  }
};

// Document functions
export const uploadDocument = async (caseId: string, file: File) => {
  try {
    // Upload the file to storage
    const fileUpload = await storage.createFile(
      STORAGE_BUCKET_ID,
      ID.unique(),
      file
    );
    
    // Create document record
    await databases.createDocument(
      databaseId,
      DOCUMENTS_COLLECTION_ID,
      ID.unique(),
      {
        caseId,
        fileName: file.name,
        fileId: fileUpload.$id,
        createdAt: new Date().toISOString(),
      }
    );
    
    return fileUpload;
  } catch (error) {
    console.error('Error uploading document:', error);
    throw error;
  }
};

export const getCaseDocuments = async (caseId: string): Promise<DocumentType[]> => {
  try {
    const response = await databases.listDocuments(
      databaseId,
      DOCUMENTS_COLLECTION_ID,
      [
        Query.equal('caseId', caseId),
        Query.orderDesc('createdAt')
      ]
    );
    
    return response.documents as unknown as DocumentType[];
  } catch (error) {
    console.error('Error fetching documents:', error);
    throw error;
  }
};

export const deleteDocument = async (documentId: string, fileId: string) => {
  try {
    // Delete the file from storage
    await storage.deleteFile(STORAGE_BUCKET_ID, fileId);
    
    // Delete the document record
    return await databases.deleteDocument(
      databaseId,
      DOCUMENTS_COLLECTION_ID,
      documentId
    );
  } catch (error) {
    console.error('Error deleting document:', error);
    throw error;
  }
};

// Search function
export const searchCases = async (query: string) => {
  try {
    // Search by case name
    const caseNameResults = await databases.listDocuments(
      databaseId,
      CASES_COLLECTION_ID,
      [Query.search('caseName', query)]
    );
    
    // Search by service address
    const addressResults = await databases.listDocuments(
      databaseId,
      CASES_COLLECTION_ID,
      [Query.search('serviceAddress', query)]
    );
    
    // Get unique results
    const allResults = [...caseNameResults.documents, ...addressResults.documents];
    const uniqueResults = allResults.filter((v, i, a) => a.findIndex(t => t.$id === v.$id) === i);
    
    return uniqueResults as unknown as Case[];
  } catch (error) {
    console.error('Error searching cases:', error);
    throw error;
  }
};

// Helper to get file URL
export const getFilePreview = (fileId: string): string => {
  const url = storage.getFileView(STORAGE_BUCKET_ID, fileId);
  return ensureString(url);
};

export { client, account, databases, storage, ID };
