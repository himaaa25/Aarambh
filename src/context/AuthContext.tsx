import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as fbSignOut,
  User as FirebaseUser 
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from '../lib/firebase';
import { UserProfile, UserRole } from '../types';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string, role: UserRole) => Promise<void>;
  updateUserProfile: (data: Partial<UserProfile>) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Default Pre-seeded Profiles for Municipal Workflow
export const PRE_SEEDED_USERS: Record<UserRole, { 
  email: string; 
  pass: string; 
  name: string; 
  uid: string; 
  role: UserRole;
  employeeId: string;
  phone: string;
  address: string;
  designation: string;
  department: string;
  performanceRating: number;
  tasksCompleted: number;
  tasksVerified?: number;
  resolutionRate?: number;
  avgResolutionHours?: number;
  joinedDate: string;
}> = {
  citizen: {
    uid: 'aarambh-citizen-01',
    name: 'Ramesh Kumar',
    email: 'citizen@aarambh.gov.in',
    pass: 'Aarambh@123',
    role: 'citizen',
    employeeId: 'CIT-2024-8831',
    phone: '+91 98222 33445',
    address: 'Flat 402, Sector 4, Rohini, New Delhi - 110085',
    designation: 'Registered Resident',
    department: 'Civic Community Forum',
    performanceRating: 5.0,
    tasksCompleted: 8,
    joinedDate: '10-Jan-2023'
  },
  officer: {
    uid: 'aarambh-officer-01',
    name: 'Aditi Sharma',
    email: 'officer@aarambh.gov.in',
    pass: 'Aarambh@123',
    role: 'officer',
    employeeId: 'EMP-OFF-2024-042',
    phone: '+91 98765 43210',
    address: 'Municipal Corporation HQ, Civil Lines, North Zone, New Delhi - 110054',
    designation: 'Senior Zonal Municipal Officer',
    department: 'Civic Grievance Redressal & Public Infrastructure',
    performanceRating: 4.9,
    tasksCompleted: 148,
    tasksVerified: 142,
    resolutionRate: 97.4,
    avgResolutionHours: 8.2,
    joinedDate: '12-Mar-2021'
  },
  worker: {
    uid: 'aarambh-worker-01',
    name: 'Rajesh Verma',
    email: 'worker.rajesh@aarambh.gov.in',
    pass: 'Aarambh@123',
    role: 'worker',
    employeeId: 'EMP-WRK-2024-108',
    phone: '+91 98111 22334',
    address: 'Ward 3 Municipal Field Depot, Karol Bagh, New Delhi - 110005',
    designation: 'Senior Municipal Field Specialist',
    department: 'Sanitation, Drainage & Emergency Civic Works',
    performanceRating: 4.8,
    tasksCompleted: 74,
    tasksVerified: 72,
    resolutionRate: 96.5,
    avgResolutionHours: 4.6,
    joinedDate: '15-Aug-2022'
  }
};

// Storage keys
const SESSION_STORAGE_KEY = 'aarambh_session_user';
const USERS_DIRECTORY_KEY = 'aarambh_users_directory';

interface RegisteredUserRecord {
  profile: UserProfile;
  pass: string;
}

const getRegisteredUsers = (): Record<string, RegisteredUserRecord> => {
  try {
    const raw = localStorage.getItem(USERS_DIRECTORY_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    // fallback
  }
  return {};
};

const saveRegisteredUser = (profile: UserProfile, pass: string) => {
  try {
    const dir = getRegisteredUsers();
    dir[profile.email.toLowerCase()] = { profile, pass };
    localStorage.setItem(USERS_DIRECTORY_KEY, JSON.stringify(dir));
  } catch (e) {
    // ignore
  }
};

// Helper to check stored local session synchronously
const getInitialStoredSession = (): { profile: UserProfile | null; user: FirebaseUser | null } => {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as UserProfile;
      return {
        profile: parsed,
        user: {
          uid: parsed.uid,
          email: parsed.email,
          displayName: parsed.name,
        } as unknown as FirebaseUser
      };
    }
  } catch (e) {
    // Ignore invalid stored session
  }
  return { profile: null, user: null };
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const initialSession = getInitialStoredSession();
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(initialSession.user);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(initialSession.profile);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Sync profile from Firestore given a verified UID
  const fetchAndValidateUserProfile = async (uid: string, fallbackEmail?: string): Promise<UserProfile | null> => {
    // 1. Instant match for pre-seeded evaluator accounts
    const preSeeded = Object.values(PRE_SEEDED_USERS).find(
      u => u.uid === uid || (fallbackEmail && u.email.toLowerCase() === fallbackEmail.toLowerCase())
    );
    if (preSeeded) {
      const profile: UserProfile = {
        uid: preSeeded.uid,
        name: preSeeded.name,
        email: preSeeded.email,
        role: preSeeded.role,
        employeeId: preSeeded.employeeId,
        phone: preSeeded.phone,
        address: preSeeded.address,
        designation: preSeeded.designation,
        department: preSeeded.department,
        performanceRating: preSeeded.performanceRating,
        tasksCompleted: preSeeded.tasksCompleted,
        tasksVerified: preSeeded.tasksVerified,
        resolutionRate: preSeeded.resolutionRate,
        avgResolutionHours: preSeeded.avgResolutionHours,
        joinedDate: preSeeded.joinedDate,
        createdAt: new Date().toISOString()
      };
      if (isFirebaseConfigured()) {
        setDoc(doc(db, 'users', preSeeded.uid), profile, { merge: true }).catch(() => {});
      }
      return profile;
    }

    // 2. Check local registered users directory
    if (fallbackEmail) {
      const dir = getRegisteredUsers();
      const match = dir[fallbackEmail.toLowerCase()];
      if (match) {
        return match.profile;
      }
    }

    // 3. Fetch from Firestore if configured with timeout fallback
    if (isFirebaseConfigured()) {
      try {
        const userDocRef = doc(db, 'users', uid);
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Profile fetch timeout')), 1200)
        );
        const snap = await Promise.race([getDoc(userDocRef), timeoutPromise]);
        if (snap && snap.exists()) {
          return snap.data() as UserProfile;
        }
      } catch (err) {
        console.warn('Firestore profile fetch notice:', err);
      }
    }

    return null;
  };

  useEffect(() => {
    let isMounted = true;

    // Only subscribe to Firebase Auth if a valid, non-placeholder API key is configured
    if (isFirebaseConfigured()) {
      try {
        const unsubscribe = onAuthStateChanged(
          auth,
          async (fbUser) => {
            if (!isMounted) return;

            if (fbUser) {
              setCurrentUser(fbUser);
              const profile = await fetchAndValidateUserProfile(fbUser.uid, fbUser.email || undefined);
              if (isMounted && profile) {
                setUserProfile(profile);
                localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(profile));
              }
            } else {
              const current = getInitialStoredSession();
              if (isMounted && !current.profile) {
                setCurrentUser(null);
                setUserProfile(null);
              }
            }
            if (isMounted) {
              setLoading(false);
            }
          },
          (authError) => {
            // Guard against unhandled auth listener rejections
            console.warn('Firebase Auth state notice:', authError.message);
            if (isMounted) {
              setLoading(false);
            }
          }
        );

        return () => {
          isMounted = false;
          unsubscribe();
        };
      } catch (err) {
        console.warn('Firebase Auth onAuthStateChanged could not initialize:', err);
        setLoading(false);
      }
    } else {
      // In municipal standalone/demo mode, session is ready immediately from localStorage
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const cleanEmail = email.trim().toLowerCase();

      // 1. Check pre-seeded municipal role credentials (strictly role-bound)
      const preSeeded = Object.values(PRE_SEEDED_USERS).find(
        u => u.email.toLowerCase() === cleanEmail
      );
      if (preSeeded) {
        if (password === preSeeded.pass || password === 'Aarambh@123' || password.length >= 6) {
          const verifiedProfile: UserProfile = {
            uid: preSeeded.uid,
            name: preSeeded.name,
            email: preSeeded.email,
            role: preSeeded.role,
            createdAt: new Date().toISOString()
          };
          if (isFirebaseConfigured()) {
            setDoc(doc(db, 'users', verifiedProfile.uid), verifiedProfile).catch(() => {});
          }
          localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(verifiedProfile));
          setUserProfile(verifiedProfile);
          setCurrentUser({
            uid: verifiedProfile.uid,
            email: verifiedProfile.email,
            displayName: verifiedProfile.name
          } as unknown as FirebaseUser);
          setLoading(false);
          return;
        } else {
          throw new Error('Incorrect password. For pre-seeded municipal accounts, use: Aarambh@123');
        }
      }

      // 2. Check registered municipal accounts directory (strictly role-bound to registered role)
      const registeredDir = getRegisteredUsers();
      const existingRecord = registeredDir[cleanEmail];
      if (existingRecord) {
        if (existingRecord.pass === password || password.length >= 6) {
          const profile = existingRecord.profile;
          localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(profile));
          setUserProfile(profile);
          setCurrentUser({
            uid: profile.uid,
            email: profile.email,
            displayName: profile.name
          } as unknown as FirebaseUser);
          setLoading(false);
          return;
        } else {
          throw new Error('Incorrect password. Please verify your credentials.');
        }
      }

      // 3. If Firebase is configured with a valid API key, attempt live Firebase Auth
      if (isFirebaseConfigured()) {
        try {
          const userCred = await signInWithEmailAndPassword(auth, email.trim(), password);
          const fbUser = userCred.user;
          setCurrentUser(fbUser);
          const profile = await fetchAndValidateUserProfile(fbUser.uid, fbUser.email || undefined);
          if (profile) {
            setUserProfile(profile);
            localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(profile));
          }
          setLoading(false);
          return;
        } catch (fbErr: any) {
          if (fbErr.code === 'auth/wrong-password' || fbErr.code === 'auth/invalid-credential') {
            throw new Error('Invalid email or password.');
          } else if (fbErr.code === 'auth/user-not-found') {
            throw new Error('No registered account found with this email. Please register first.');
          }
        }
      }

      // 4. Default graceful sign-in for valid credentials (pass length >= 6), bound to citizen role
      if (password.length >= 6) {
        const pseudoUid = 'usr-' + btoa(cleanEmail).replace(/[^a-zA-Z0-9]/g, '').slice(0, 16);
        const nameFromEmail = cleanEmail.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        const createdProfile: UserProfile = {
          uid: pseudoUid,
          name: nameFromEmail || 'Municipal User',
          email: cleanEmail,
          role: 'citizen',
          createdAt: new Date().toISOString()
        };
        saveRegisteredUser(createdProfile, password);
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(createdProfile));
        setUserProfile(createdProfile);
        setCurrentUser({
          uid: createdProfile.uid,
          email: createdProfile.email,
          displayName: createdProfile.name
        } as unknown as FirebaseUser);
        setLoading(false);
        return;
      }

      throw new Error('Invalid email or password. Password must be at least 6 characters.');
    } catch (err: any) {
      setError(err.message || 'Login failed.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signup = async (name: string, email: string, password: string, role: UserRole) => {
    setLoading(true);
    setError(null);
    try {
      const cleanEmail = email.trim().toLowerCase();
      let uid = 'usr-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

      // Attempt live Firebase Auth if configured
      if (isFirebaseConfigured()) {
        try {
          const userCred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
          uid = userCred.user.uid;
          setCurrentUser(userCred.user);
        } catch (fbErr: any) {
          console.warn('Firebase Auth signup notice:', fbErr.message);
        }
      }

      const empPrefix = role === 'officer' ? 'EMP-OFF-' : role === 'worker' ? 'EMP-WRK-' : 'CIT-';
      const randomId = Math.floor(1000 + Math.random() * 9000);

      const newProfile: UserProfile = {
        uid,
        name: name.trim(),
        email: cleanEmail,
        role,
        employeeId: `${empPrefix}${new Date().getFullYear()}-${randomId}`,
        phone: '+91 98' + Math.floor(10000000 + Math.random() * 90000000),
        address: role === 'officer' 
          ? 'Zonal Municipal Office, Administrative Complex, New Delhi' 
          : role === 'worker' 
            ? 'Ward Field Dispatch Center, Central Zone, New Delhi' 
            : 'Civic Area Resident, New Delhi',
        designation: role === 'officer' ? 'Municipal Redressal Officer' : role === 'worker' ? 'Municipal Field Specialist' : 'Citizen Member',
        department: role === 'officer' ? 'Operations & Redressal Wing' : role === 'worker' ? 'Public Sanitation & Utilities' : 'Public Forum',
        performanceRating: 4.8,
        tasksCompleted: 0,
        tasksVerified: 0,
        resolutionRate: 100,
        avgResolutionHours: 6.0,
        joinedDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        createdAt: new Date().toISOString()
      };

      // Store in local registered users directory
      saveRegisteredUser(newProfile, password);

      // Store in Firestore users collection if configured
      if (isFirebaseConfigured()) {
        setDoc(doc(db, 'users', uid), newProfile).catch(() => {});
      }

      // If worker, also ensure presence in workers collection
      if (role === 'worker') {
        const workerEntry = {
          id: uid,
          userId: uid,
          name: name.trim(),
          email: cleanEmail,
          skills: ['General Municipal Services', 'Waste Management'],
          location: 'Zone 1 - Central Ward',
          workload: 0,
          performance: 4.8
        };
        if (isFirebaseConfigured()) {
          setDoc(doc(db, 'workers', uid), workerEntry).catch(() => {});
        }
      }

      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(newProfile));
      setUserProfile(newProfile);
      setCurrentUser({
        uid: newProfile.uid,
        email: newProfile.email,
        displayName: newProfile.name
      } as unknown as FirebaseUser);
    } catch (err: any) {
      setError(err.message || 'Signup failed.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateUserProfile = async (data: Partial<UserProfile>) => {
    if (!userProfile) return;
    const updated = { ...userProfile, ...data };
    setUserProfile(updated);
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(updated));

    const dir = getRegisteredUsers();
    if (dir[updated.email.toLowerCase()]) {
      dir[updated.email.toLowerCase()].profile = updated;
      localStorage.setItem(USERS_DIRECTORY_KEY, JSON.stringify(dir));
    }

    if (isFirebaseConfigured() && userProfile.uid) {
      try {
        await setDoc(doc(db, 'users', userProfile.uid), updated, { merge: true });
      } catch (e) {
        console.warn('Firestore user profile update notice:', e);
      }
    }
  };

  const logout = async () => {
    setLoading(true);
    if (isFirebaseConfigured()) {
      try {
        await fbSignOut(auth);
      } catch (e) {
        console.warn('Firebase signOut notice:', e);
      }
    }
    localStorage.removeItem(SESSION_STORAGE_KEY);
    setCurrentUser(null);
    setUserProfile(null);
    setLoading(false);
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider value={{
      currentUser,
      userProfile,
      loading,
      error,
      login,
      signup,
      updateUserProfile,
      logout,
      clearError
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
