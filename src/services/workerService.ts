import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  onSnapshot, 
  updateDoc,
  increment 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, isFirebaseConfigured } from '../lib/firebase';
import { WorkerProfile, WorkerMatchScore } from '../types';

type WorkerListener = () => void;
const workerListeners = new Set<WorkerListener>();

function notifyWorkerListeners() {
  workerListeners.forEach(listener => {
    try {
      listener();
    } catch (e) {
      console.warn('Worker subscriber update error:', e);
    }
  });
}

export const INITIAL_WORKERS: WorkerProfile[] = [
  {
    id: 'aarambh-worker-01',
    userId: 'aarambh-worker-01',
    name: 'Rajesh Verma',
    email: 'worker.rajesh@aarambh.gov.in',
    skills: ['Waste Management', 'Sanitation & Cleanliness', 'Drainage & Sewerage'],
    location: 'Ward 1 - Central Zone',
    workload: 1,
    performance: 4.9,
    phone: '+91 98765 43210'
  },
  {
    id: 'aarambh-worker-02',
    name: 'Amit Patel',
    email: 'worker.amit@aarambh.gov.in',
    skills: ['Road Repair', 'Paving & Asphalt', 'Civil Works'],
    location: 'Ward 2 - North Zone',
    workload: 2,
    performance: 4.7,
    phone: '+91 98765 43211'
  },
  {
    id: 'aarambh-worker-03',
    name: 'Sunita Devi',
    email: 'worker.sunita@aarambh.gov.in',
    skills: ['Drainage & Sewerage', 'Sanitation & Cleanliness', 'Waste Management'],
    location: 'Ward 1 - Central Zone',
    workload: 0,
    performance: 4.8,
    phone: '+91 98765 43212'
  },
  {
    id: 'aarambh-worker-04',
    name: 'Manoj Kumar',
    email: 'worker.manoj@aarambh.gov.in',
    skills: ['Street Lighting', 'Electrical Line Repair', 'Solar Maintenance'],
    location: 'Ward 3 - East Zone',
    workload: 3,
    performance: 4.6,
    phone: '+91 98765 43213'
  },
  {
    id: 'aarambh-worker-05',
    name: 'Vikram Sharma',
    email: 'worker.vikram@aarambh.gov.in',
    skills: ['Water Supply', 'Pipeline Repair', 'Valve Control'],
    location: 'Ward 2 - North Zone',
    workload: 1,
    performance: 4.9,
    phone: '+91 98765 43214'
  }
];

const LOCAL_WORKERS_KEY = 'aarambh_workers_cache';

// Load cached workers
function getLocalWorkers(): WorkerProfile[] {
  try {
    const raw = localStorage.getItem(LOCAL_WORKERS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    // ignore
  }
  return INITIAL_WORKERS;
}

function saveLocalWorkers(workers: WorkerProfile[]) {
  try {
    localStorage.setItem(LOCAL_WORKERS_KEY, JSON.stringify(workers));
    notifyWorkerListeners();
  } catch (e) {
    // ignore
  }
}

// Seed initial workers to Firestore if empty
export async function seedInitialWorkersIfEmpty(): Promise<void> {
  // Guarantee instant local cache initialization
  if (!localStorage.getItem(LOCAL_WORKERS_KEY)) {
    saveLocalWorkers(INITIAL_WORKERS);
  }

  if (!isFirebaseConfigured()) {
    return;
  }

  const workersCol = collection(db, 'workers');
  try {
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Seed check timeout')), 2000)
    );
    const snap = await Promise.race([getDocs(workersCol), timeoutPromise]);
    if (snap.empty) {
      for (const worker of INITIAL_WORKERS) {
        await setDoc(doc(db, 'workers', worker.id), worker);
      }
      saveLocalWorkers(INITIAL_WORKERS);
    }
  } catch (error) {
    console.warn('Notice: Firestore seeding fallback to local cache:', error);
    if (!localStorage.getItem(LOCAL_WORKERS_KEY)) {
      saveLocalWorkers(INITIAL_WORKERS);
    }
  }
}

// Subscribe to workers roster in real-time
export function subscribeWorkers(callback: (workers: WorkerProfile[]) => void): () => void {
  const emitLocal = () => {
    callback(getLocalWorkers());
  };
  emitLocal();

  workerListeners.add(emitLocal);

  let unsubscribeFirestore = () => {};

  if (isFirebaseConfigured()) {
    try {
      const workersCol = collection(db, 'workers');

      unsubscribeFirestore = onSnapshot(
        workersCol,
        (snapshot) => {
          if (!snapshot.empty) {
            const workers: WorkerProfile[] = [];
            snapshot.forEach((docSnap) => {
              workers.push({ ...docSnap.data(), id: docSnap.id } as WorkerProfile);
            });
            saveLocalWorkers(workers);
            callback(workers);
          } else {
            seedInitialWorkersIfEmpty();
            callback(getLocalWorkers());
          }
        },
        (error) => {
          console.warn('Firestore workers subscription notice:', error);
          callback(getLocalWorkers());
        }
      );
    } catch (e) {
      console.warn('Firestore workers listener setup notice, using local cache:', e);
    }
  }

  return () => {
    workerListeners.delete(emitLocal);
    unsubscribeFirestore();
  };
}

// Update worker workload after assignment or completion
export async function adjustWorkerWorkload(workerId: string, delta: number): Promise<void> {
  const workers = getLocalWorkers();
  const updated = workers.map(w => {
    if (w.id === workerId || w.userId === workerId) {
      return { ...w, workload: Math.max(0, w.workload + delta) };
    }
    return w;
  });
  saveLocalWorkers(updated);

  if (isFirebaseConfigured()) {
    try {
      const workerRef = doc(db, 'workers', workerId);
      await updateDoc(workerRef, {
        workload: increment(delta)
      });
    } catch (error) {
      console.warn('Firestore adjust worker workload notice:', error);
    }
  }
}

// Category to Skill Mapping
const CATEGORY_SKILL_MAP: Record<string, string[]> = {
  'Waste Management': ['Waste Management', 'Sanitation & Cleanliness'],
  'Road Repair': ['Road Repair', 'Paving & Asphalt', 'Civil Works'],
  'Water Supply': ['Water Supply', 'Pipeline Repair', 'Valve Control'],
  'Street Lighting': ['Street Lighting', 'Electrical Line Repair', 'Solar Maintenance'],
  'Drainage & Sewerage': ['Drainage & Sewerage', 'Sanitation & Cleanliness']
};

/**
 * Worker Suitability Matcher
 * Considers: Skill, Location, Workload, Performance
 */
export function calculateWorkerSuitability(
  worker: WorkerProfile,
  complaintCategory: string,
  complaintLocation: string
): WorkerMatchScore {
  // 1. Skill Match (40 pts)
  const targetSkills = CATEGORY_SKILL_MAP[complaintCategory] || [complaintCategory];
  const hasDirectSkill = worker.skills.some(s => 
    targetSkills.some(ts => ts.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(ts.toLowerCase()))
  );
  const skillPoints = hasDirectSkill ? 40 : 15;

  // 2. Location Match (30 pts)
  const workerLocClean = worker.location.toLowerCase();
  const compLocClean = complaintLocation.toLowerCase();
  
  // Check zone or ward matching
  let locationMatch = false;
  ['ward 1', 'ward 2', 'ward 3', 'central', 'north', 'east', 'west', 'south'].forEach(locKeyword => {
    if (workerLocClean.includes(locKeyword) && compLocClean.includes(locKeyword)) {
      locationMatch = true;
    }
  });
  const locationPoints = locationMatch ? 30 : 12;

  // 3. Workload Match (15 pts)
  let workloadPoints = 15;
  let workloadStatus: 'Low' | 'Moderate' | 'Heavy' = 'Low';
  if (worker.workload === 0) {
    workloadPoints = 15;
    workloadStatus = 'Low';
  } else if (worker.workload === 1) {
    workloadPoints = 12;
    workloadStatus = 'Low';
  } else if (worker.workload === 2) {
    workloadPoints = 9;
    workloadStatus = 'Moderate';
  } else {
    workloadPoints = 4;
    workloadStatus = 'Heavy';
  }

  // 4. Performance Match (15 pts)
  // performance is between 1.0 and 5.0
  const performancePoints = Math.round((worker.performance / 5.0) * 15);

  const totalScore = Math.min(100, skillPoints + locationPoints + workloadPoints + performancePoints);

  return {
    worker,
    score: totalScore,
    skillMatch: hasDirectSkill,
    locationMatch,
    workloadStatus,
    breakdown: {
      skillPoints,
      locationPoints,
      workloadPoints,
      performancePoints
    }
  };
}
