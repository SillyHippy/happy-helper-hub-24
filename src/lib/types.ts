
export interface Client {
  $id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  createdAt: string;
}

export interface Case {
  $id: string;
  clientId: string;
  caseNumber: string;
  caseName: string;
  defendantName: string;
  serviceAddress: string;
  status: 'pending' | 'served' | 'attempted' | 'canceled';
  createdAt: string;
}

export interface ServeAttempt {
  $id: string;
  caseId: string;
  attemptNumber: number;
  latitude: number;
  longitude: number;
  photoUrl: string;
  notes: string;
  createdAt: string;
}

export interface Document {
  $id: string;
  caseId: string;
  fileName: string;
  fileId: string;
  createdAt: string;
}

export interface CaseWithClient extends Case {
  client?: Client;
}

export interface ClientWithCases extends Client {
  cases?: Case[];
}

// Add Appwrite-specific properties that all documents have
export interface AppwriteDocument {
  $id: string;
  $collectionId: string;
  $databaseId: string;
  $createdAt: string;
  $updatedAt: string;
  $permissions: string[];
}
