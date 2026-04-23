/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { db, auth } from '@/src/lib/firebase';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocFromServer
} from 'firebase/firestore';
import { Client, Job, Candidate, Application, ActivityLog } from '@/src/types';
import { toast } from 'sonner';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  toast.error(`Firestore Error: ${errInfo.error}`);
  throw new Error(JSON.stringify(errInfo));
}

interface DataContextType {
  clients: Client[];
  jobs: Job[];
  candidates: Candidate[];
  applications: Application[];
  activityLogs: ActivityLog[];
  loading: boolean;
  addClient: (client: Omit<Client, 'id' | 'createdAt'>) => Promise<void>;
  addJob: (job: Omit<Job, 'id' | 'createdAt'>) => Promise<void>;
  addCandidate: (candidate: Omit<Candidate, 'id' | 'createdAt'>) => Promise<void>;
  addApplication: (application: Omit<Application, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateJobStatus: (jobId: string, status: Job['status']) => Promise<void>;
  updateApplicationStatus: (appId: string, status: Application['status'], extra?: Partial<Application>) => Promise<void>;
  deleteClient: (clientId: string) => Promise<void>;
  deleteJob: (jobId: string) => Promise<void>;
  deleteCandidate: (candidateId: string) => Promise<void>;
  addActivityLog: (log: Omit<ActivityLog, 'id' | 'timestamp'>) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Test connection
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    };
    testConnection();

    const unsubClients = onSnapshot(
      query(collection(db, 'clients'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        setClients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client)));
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'clients')
    );

    const unsubJobs = onSnapshot(
      query(collection(db, 'jobs'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        setJobs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Job)));
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'jobs')
    );

    const unsubCandidates = onSnapshot(
      query(collection(db, 'candidates'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        setCandidates(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Candidate)));
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'candidates')
    );

    const unsubApps = onSnapshot(
      query(collection(db, 'applications'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        setApplications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Application)));
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'applications');
      }
    );

    const unsubLogs = onSnapshot(
      query(collection(db, 'activityLogs'), orderBy('timestamp', 'desc')),
      (snapshot) => {
        setActivityLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ActivityLog)));
        setLoading(false);
      },
      (error) => {
        setLoading(false);
        handleFirestoreError(error, OperationType.LIST, 'activityLogs');
      }
    );

    return () => {
      unsubClients();
      unsubJobs();
      unsubCandidates();
      unsubApps();
      unsubLogs();
    };
  }, []);

  const addClient = async (client: Omit<Client, 'id' | 'createdAt'>) => {
    try {
      await addDoc(collection(db, 'clients'), {
        ...client,
        createdAt: Date.now()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'clients');
    }
  };

  const addJob = async (job: Omit<Job, 'id' | 'createdAt'>) => {
    try {
      await addDoc(collection(db, 'jobs'), {
        ...job,
        createdAt: Date.now()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'jobs');
    }
  };

  const addCandidate = async (candidate: Omit<Candidate, 'id' | 'createdAt'>) => {
    try {
      await addDoc(collection(db, 'candidates'), {
        ...candidate,
        createdAt: Date.now()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'candidates');
    }
  };

  const addApplication = async (application: Omit<Application, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      await addDoc(collection(db, 'applications'), {
        ...application,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      // Automatically log application created
      if (auth.currentUser) {
        await addActivityLog({
          candidateId: application.candidateId,
          action: 'Applied to Job',
          details: `Application created for job ${application.jobId}.`,
          userName: auth.currentUser.displayName || 'Unknown User'
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'applications');
    }
  };

  const addActivityLog = async (log: Omit<ActivityLog, 'id' | 'timestamp'>) => {
    try {
      await addDoc(collection(db, 'activityLogs'), {
        ...log,
        timestamp: Date.now()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'activityLogs');
    }
  };

  const updateApplicationStatus = async (appId: string, status: Application['status'], extra?: Partial<Application>) => {
    try {
      await updateDoc(doc(db, 'applications', appId), {
        status,
        updatedAt: Date.now(),
        ...extra,
      });
      
      const app = applications.find(a => a.id === appId);
      if (app && auth.currentUser) {
        await addActivityLog({
          candidateId: app.candidateId,
          action: 'Status Updated',
          details: `Moved from ${app.status} to ${status}.`,
          userName: auth.currentUser.displayName || 'Unknown User'
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `applications/${appId}`);
    }
  };

  const updateJobStatus = async (jobId: string, status: Job['status']) => {
    try {
      await updateDoc(doc(db, 'jobs', jobId), { status });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `jobs/${jobId}`);
    }
  };

  const deleteClient = async (clientId: string) => {
    try {
      await deleteDoc(doc(db, 'clients', clientId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `clients/${clientId}`);
    }
  };

  const deleteJob = async (jobId: string) => {
    try {
      await deleteDoc(doc(db, 'jobs', jobId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `jobs/${jobId}`);
    }
  };

  const deleteCandidate = async (candidateId: string) => {
    try {
      await deleteDoc(doc(db, 'candidates', candidateId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `candidates/${candidateId}`);
    }
  };

  return (
    <DataContext.Provider value={{ 
      clients, 
      jobs, 
      candidates, 
      applications,
      activityLogs,
      loading,
      addClient,
      addJob,
      addCandidate,
      addApplication,
      updateJobStatus,
      updateApplicationStatus,
      deleteClient,
      deleteJob,
      deleteCandidate,
      addActivityLog
    }}>
      {children}
    </DataContext.Provider>
  );
};
