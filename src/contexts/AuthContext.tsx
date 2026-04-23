/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '@/src/lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { User, Role } from '@/src/types';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  firebaseUser: null,
  loading: true,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fUser) => {
      try {
        setFirebaseUser(fUser);
        
        if (fUser) {
          // Fetch user role from Firestore
          const userRef = doc(db, 'users', fUser.uid);
          const userSnap = await getDoc(userRef);
          
          if (userSnap.exists()) {
            setUser(userSnap.data() as User);
          } else {
            // Create default user document
            let assignedRole: Role = 'Guest';

            if (fUser.email === 'twgcrp@gmail.com') {
              assignedRole = 'Admin';
            } else if (fUser.email) {
              // Check for pending invitation
              const invRef = doc(db, 'invitations', fUser.email.toLowerCase());
              const invSnap = await getDoc(invRef);

              if (invSnap.exists() && invSnap.data().status === 'Pending') {
                assignedRole = invSnap.data().role as Role;
                // Mark invite as accepted
                await updateDoc(invRef, { status: 'Accepted' });
              }
            }

            const newUser: User = {
              uid: fUser.uid,
              email: fUser.email || '',
              displayName: fUser.displayName || 'User',
              role: assignedRole,
              assignedJobs: [],
            };
            
            await setDoc(userRef, { ...newUser, createdAt: Date.now() });
            setUser(newUser);
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Auth flow error:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, firebaseUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
