import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  onSnapshot, 
  query, 
  where 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, isFirebaseConfigured } from '../lib/firebase';
import { Complaint, ComplaintStatus } from '../types';
import { adjustWorkerWorkload } from './workerService';

const COMPLAINTS_COL = 'complaints';
const LOCAL_COMPLAINTS_KEY = 'aarambh_complaints_cache';

type ComplaintListener = () => void;
const complaintListeners = new Set<ComplaintListener>();

function notifyComplaintListeners() {
  complaintListeners.forEach(listener => {
    try {
      listener();
    } catch (e) {
      console.warn('Complaint subscriber update error:', e);
    }
  });
}

export const INITIAL_COMPLAINTS: Complaint[] = [
  {
    id: 'CMP-2026-0812',
    citizenId: 'aarambh-citizen-01',
    citizenName: 'Ramesh Kumar',
    citizenEmail: 'citizen@aarambh.gov.in',
    title: 'Overflowing municipal garbage dump near Sector 4 Market',
    category: 'Waste Management',
    description: 'Municipal waste bin has not been cleared for 3 days. Foul smell and stray animal menace near Gate 2.',
    location: 'Ward 1 - Central Zone, Market Gate 2',
    priority: 'Medium',
    slaHours: 24,
    status: 'Submitted',
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 5).toISOString()
  },
  {
    id: 'CMP-2026-0813',
    citizenId: 'aarambh-citizen-01',
    citizenName: 'Ramesh Kumar',
    citizenEmail: 'citizen@aarambh.gov.in',
    title: 'Deep road crater causing vehicle hazard on Main Road',
    category: 'Road Repair',
    description: 'A 2-foot wide pothole developed after recent rainfall. Multiple two-wheelers slipping.',
    location: 'Ward 2 - North Zone, Main Station Road',
    priority: 'High',
    slaHours: 12,
    status: 'Assigned',
    assignedWorkerId: 'aarambh-worker-02',
    assignedWorkerName: 'Amit Patel',
    assignedAt: new Date(Date.now() - 3600000 * 3).toISOString(),
    createdAt: new Date(Date.now() - 3600000 * 8).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 3).toISOString()
  },
  {
    id: 'CMP-2026-0814',
    citizenId: 'aarambh-citizen-02',
    citizenName: 'Sunita Rao',
    citizenEmail: 'sunita.rao@example.com',
    title: 'Major water pipeline rupture flooding colony street',
    category: 'Water Supply',
    description: 'Clean drinking water is gushing out of an underground distribution pipe at high pressure.',
    location: 'Ward 2 - North Zone, Lane 4 near Water Tank',
    priority: 'Emergency',
    slaHours: 6,
    status: 'Submitted',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 2).toISOString()
  },
  {
    id: 'CMP-2026-0815',
    citizenId: 'aarambh-citizen-03',
    citizenName: 'Pooja Mehta',
    citizenEmail: 'pooja.mehta@example.com',
    title: '4 non-functional street light poles creating dark corridor',
    category: 'Street Lighting',
    description: 'Street lights in a row have been completely dark for over 2 weeks, creating severe safety risk for women and children.',
    location: 'Ward 3 - East Zone, 2nd Cross Road',
    priority: 'High',
    slaHours: 12,
    status: 'In Progress',
    assignedWorkerId: 'aarambh-worker-04',
    assignedWorkerName: 'Manoj Kumar',
    // Assigned 28 hours ago with 12 hour SLA: OVERDUE / DELAYED!
    assignedAt: new Date(Date.now() - 3600000 * 28).toISOString(),
    createdAt: new Date(Date.now() - 3600000 * 36).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 28).toISOString()
  },
  {
    id: 'CMP-2026-0816',
    citizenId: 'aarambh-citizen-04',
    citizenName: 'Deepak Verma',
    citizenEmail: 'deepak.v@example.com',
    title: 'Blocked stormwater sewer causing overflow onto pavement',
    category: 'Drainage & Sewerage',
    description: 'Plastic waste clogged the main storm line causing black water to back up onto pedestrian sidewalk.',
    location: 'Ward 1 - Central Zone, Block C Crossing',
    priority: 'Medium',
    slaHours: 24,
    status: 'Pending Verification',
    assignedWorkerId: 'aarambh-worker-01',
    assignedWorkerName: 'Rajesh Verma',
    assignedAt: new Date(Date.now() - 3600000 * 10).toISOString(),
    completedAt: new Date(Date.now() - 3600000 * 1).toISOString(),
    resolutionNotes: 'Cleansed 18 meters of subterranean sewer pipe with high-pressure water jet. Extracted debris and secured silt grating. Flow normalized completely.',
    createdAt: new Date(Date.now() - 3600000 * 14).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 1).toISOString()
  },
  {
    id: 'CMP-2026-0817',
    citizenId: 'aarambh-citizen-01',
    citizenName: 'Ramesh Kumar',
    citizenEmail: 'citizen@aarambh.gov.in',
    title: 'Clearing construction debris along green belt',
    category: 'Waste Management',
    description: 'Rubble deposited illegally after building renovation.',
    location: 'Ward 1 - Central Zone, Park Perimeter',
    priority: 'Low',
    slaHours: 48,
    status: 'Completed',
    assignedWorkerId: 'aarambh-worker-03',
    assignedWorkerName: 'Sunita Devi',
    assignedAt: new Date(Date.now() - 3600000 * 40).toISOString(),
    completedAt: new Date(Date.now() - 3600000 * 18).toISOString(),
    verifiedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    verifiedBy: 'Officer Sharma',
    verificationNotes: 'On-site municipal inspection verified. Debris fully removed to treatment facility.',
    createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 12).toISOString()
  }
];

function getLocalComplaints(): Complaint[] {
  try {
    const raw = localStorage.getItem(LOCAL_COMPLAINTS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    // fallback
  }
  return INITIAL_COMPLAINTS;
}

function saveLocalComplaints(complaints: Complaint[]) {
  try {
    localStorage.setItem(LOCAL_COMPLAINTS_KEY, JSON.stringify(complaints));
    notifyComplaintListeners();
  } catch (e) {
    // ignore
  }
}

// Ensure initial complaints are seeded in Firestore if empty
export async function seedInitialComplaintsIfEmpty(): Promise<void> {
  // Guarantee instant local cache initialization
  if (!localStorage.getItem(LOCAL_COMPLAINTS_KEY)) {
    saveLocalComplaints(INITIAL_COMPLAINTS);
  }

  if (!isFirebaseConfigured()) {
    return;
  }

  const colRef = collection(db, COMPLAINTS_COL);
  try {
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Seed check timeout')), 2000)
    );
    const snap = await Promise.race([getDocs(colRef), timeoutPromise]);
    if (snap.empty) {
      for (const item of INITIAL_COMPLAINTS) {
        await setDoc(doc(db, COMPLAINTS_COL, item.id), item);
      }
      saveLocalComplaints(INITIAL_COMPLAINTS);
    }
  } catch (err) {
    console.warn('Notice: Firestore seeding fallback to local cache:', err);
    if (!localStorage.getItem(LOCAL_COMPLAINTS_KEY)) {
      saveLocalComplaints(INITIAL_COMPLAINTS);
    }
  }
}

// Create a new complaint from Citizen
export async function createComplaint(
  data: Omit<Complaint, 'id' | 'status' | 'createdAt' | 'updatedAt'>
): Promise<Complaint> {
  const newId = `CMP-2026-${Math.floor(1000 + Math.random() * 9000)}`;
  const now = new Date().toISOString();

  const newComplaint: Complaint = {
    ...data,
    id: newId,
    status: 'Submitted',
    createdAt: now,
    updatedAt: now
  };

  // Update local cache immediately for instant UI feedback
  const local = getLocalComplaints();
  const updated = [newComplaint, ...local];
  saveLocalComplaints(updated);

  // Write to Firestore if configured
  if (isFirebaseConfigured()) {
    try {
      const docRef = doc(db, COMPLAINTS_COL, newId);
      await setDoc(docRef, newComplaint);
    } catch (error) {
      console.warn('Firestore setDoc notice, complaint saved in local sync:', error);
    }
  }

  return newComplaint;
}

// Citizen: Subscribe to complaints reported by this citizen
export function subscribeCitizenComplaints(
  citizenId: string,
  callback: (complaints: Complaint[]) => void
): () => void {
  // Emit local cache filtered for citizen immediately
  const emitLocal = () => {
    const all = getLocalComplaints();
    const filtered = all.filter(c => c.citizenId === citizenId);
    callback(filtered);
  };
  emitLocal();

  complaintListeners.add(emitLocal);

  let unsubscribeFirestore = () => {};

  if (isFirebaseConfigured()) {
    try {
      const colRef = collection(db, COMPLAINTS_COL);
      const q = query(colRef, where('citizenId', '==', citizenId));

      unsubscribeFirestore = onSnapshot(
        q,
        (snapshot) => {
          if (!snapshot.empty) {
            const items: Complaint[] = [];
            snapshot.forEach(docSnap => {
              items.push({ ...docSnap.data(), id: docSnap.id } as Complaint);
            });
            const all = getLocalComplaints().filter(c => c.citizenId !== citizenId);
            saveLocalComplaints([...items, ...all]);
            callback(items);
          } else {
            emitLocal();
          }
        },
        (error) => {
          console.warn('Firestore citizen complaints listener notice:', error);
          emitLocal();
        }
      );
    } catch (e) {
      console.warn('Firestore listener setup failed, using local cache:', e);
    }
  }

  return () => {
    complaintListeners.delete(emitLocal);
    unsubscribeFirestore();
  };
}

// Officer: Subscribe to all submitted and managed complaints
export function subscribeAllComplaints(
  callback: (complaints: Complaint[]) => void
): () => void {
  const emitLocal = () => {
    callback(getLocalComplaints());
  };
  emitLocal();

  complaintListeners.add(emitLocal);

  let unsubscribeFirestore = () => {};

  if (isFirebaseConfigured()) {
    try {
      const colRef = collection(db, COMPLAINTS_COL);

      unsubscribeFirestore = onSnapshot(
        colRef,
        (snapshot) => {
          if (!snapshot.empty) {
            const items: Complaint[] = [];
            snapshot.forEach(docSnap => {
              items.push({ ...docSnap.data(), id: docSnap.id } as Complaint);
            });
            saveLocalComplaints(items);
            callback(items);
          } else {
            seedInitialComplaintsIfEmpty();
            callback(getLocalComplaints());
          }
        },
        (error) => {
          console.warn('Firestore all complaints listener notice:', error);
          callback(getLocalComplaints());
        }
      );
    } catch (e) {
      console.warn('Firestore listener setup failed, using local cache:', e);
    }
  }

  return () => {
    complaintListeners.delete(emitLocal);
    unsubscribeFirestore();
  };
}

// Worker: Subscribe to tasks assigned to this specific worker
export function subscribeWorkerTasks(
  workerId: string,
  callback: (tasks: Complaint[]) => void
): () => void {
  const emitLocal = () => {
    const all = getLocalComplaints();
    const filtered = all.filter(c => 
      c.assignedWorkerId === workerId || 
      (workerId === 'aarambh-worker-01' && (c.assignedWorkerName?.includes('Rajesh') || c.assignedWorkerId === 'aarambh-worker-01'))
    );
    callback(filtered);
  };
  emitLocal();

  complaintListeners.add(emitLocal);

  let unsubscribeFirestore = () => {};

  if (isFirebaseConfigured()) {
    try {
      const colRef = collection(db, COMPLAINTS_COL);
      const q = query(colRef, where('assignedWorkerId', '==', workerId));

      unsubscribeFirestore = onSnapshot(
        q,
        (snapshot) => {
          if (!snapshot.empty) {
            const items: Complaint[] = [];
            snapshot.forEach(docSnap => {
              items.push({ ...docSnap.data(), id: docSnap.id } as Complaint);
            });
            callback(items);
          } else {
            emitLocal();
          }
        },
        (error) => {
          console.warn('Firestore worker tasks listener notice:', error);
          emitLocal();
        }
      );
    } catch (e) {
      console.warn('Firestore listener setup failed, using local cache:', e);
    }
  }

  return () => {
    complaintListeners.delete(emitLocal);
    unsubscribeFirestore();
  };
}

// Officer: Assign worker to complaint (Manual or with AI recommendation)
export async function assignWorkerToComplaint(
  complaintId: string,
  workerId: string,
  workerName: string,
  aiScore?: number,
  aiReasoning?: string
): Promise<void> {
  const now = new Date().toISOString();

  // Update local cache first
  const all = getLocalComplaints();
  const updated = all.map(c => {
    if (c.id === complaintId) {
      return {
        ...c,
        assignedWorkerId: workerId,
        assignedWorkerName: workerName,
        assignedAt: now,
        status: 'Assigned' as ComplaintStatus,
        aiMatchScore: aiScore,
        aiMatchReasoning: aiReasoning,
        autoAssignedByAI: aiScore !== undefined,
        updatedAt: now
      };
    }
    return c;
  });
  saveLocalComplaints(updated);

  // Adjust worker workload
  await adjustWorkerWorkload(workerId, 1);

  // Update Firestore if configured
  if (isFirebaseConfigured()) {
    try {
      const docRef = doc(db, COMPLAINTS_COL, complaintId);
      await updateDoc(docRef, {
        assignedWorkerId: workerId,
        assignedWorkerName: workerName,
        assignedAt: now,
        status: 'Assigned',
        aiMatchScore: aiScore || null,
        aiMatchReasoning: aiReasoning || null,
        updatedAt: now
      });
    } catch (error) {
      console.warn('Firestore assign worker notice:', error);
    }
  }
}

// Officer: Reassign delayed/bottlenecked worker to a new worker
export async function reassignWorkerToComplaint(
  complaintId: string,
  previousWorkerId: string | undefined,
  newWorkerId: string,
  newWorkerName: string,
  reason: string
): Promise<void> {
  const now = new Date().toISOString();

  // 1. Decrement workload of previous worker
  if (previousWorkerId) {
    await adjustWorkerWorkload(previousWorkerId, -1);
  }

  // 2. Increment workload of new worker
  await adjustWorkerWorkload(newWorkerId, 1);

  // 3. Update complaint record with reassignment audit trail
  const all = getLocalComplaints();
  const updated = all.map(c => {
    if (c.id === complaintId) {
      return {
        ...c,
        assignedWorkerId: newWorkerId,
        assignedWorkerName: newWorkerName,
        assignedAt: now, // reset SLA clock for new worker
        status: 'Assigned' as ComplaintStatus,
        reassignedFromWorkerId: previousWorkerId,
        reassignedFromWorkerName: c.assignedWorkerName,
        reassignmentReason: reason,
        reassignedAt: now,
        reassignmentCount: (c.reassignmentCount || 0) + 1,
        updatedAt: now
      };
    }
    return c;
  });
  saveLocalComplaints(updated);

  // Update Firestore if configured
  if (isFirebaseConfigured()) {
    try {
      const docRef = doc(db, COMPLAINTS_COL, complaintId);
      await updateDoc(docRef, {
        assignedWorkerId: newWorkerId,
        assignedWorkerName: newWorkerName,
        assignedAt: now,
        status: 'Assigned',
        reassignedFromWorkerId: previousWorkerId || null,
        reassignmentReason: reason,
        reassignedAt: now,
        updatedAt: now
      });
    } catch (error) {
      console.warn('Firestore reassign worker notice:', error);
    }
  }
}

// Worker: Submit task for Officer completion verification
export async function submitTaskForVerification(
  complaintId: string,
  workerId: string,
  resolutionNotes: string,
  proofUrl?: string
): Promise<void> {
  const now = new Date().toISOString();

  const all = getLocalComplaints();
  const updated = all.map(c => {
    if (c.id === complaintId) {
      return {
        ...c,
        status: 'Pending Verification' as ComplaintStatus,
        resolutionNotes,
        completionProofUrl: proofUrl || undefined,
        completedAt: now,
        updatedAt: now
      };
    }
    return c;
  });
  saveLocalComplaints(updated);

  if (isFirebaseConfigured()) {
    try {
      const docRef = doc(db, COMPLAINTS_COL, complaintId);
      await updateDoc(docRef, {
        status: 'Pending Verification',
        resolutionNotes,
        completionProofUrl: proofUrl || null,
        completedAt: now,
        updatedAt: now
      });
    } catch (error) {
      console.warn('Firestore submit verification notice:', error);
    }
  }
}

// Officer: Verify and Approve Task Resolution (marks Completed and frees worker capacity)
export async function verifyTaskResolution(
  complaintId: string,
  officerName: string,
  verificationNotes?: string
): Promise<void> {
  const now = new Date().toISOString();
  const all = getLocalComplaints();
  const target = all.find(c => c.id === complaintId);

  const updated = all.map(c => {
    if (c.id === complaintId) {
      return {
        ...c,
        status: 'Completed' as ComplaintStatus,
        verifiedAt: now,
        verifiedBy: officerName,
        verificationNotes: verificationNotes || 'Officer inspection verified satisfactory completion.',
        updatedAt: now
      };
    }
    return c;
  });
  saveLocalComplaints(updated);

  // Decrement worker workload upon verified completion
  if (target?.assignedWorkerId) {
    await adjustWorkerWorkload(target.assignedWorkerId, -1);
  }

  if (isFirebaseConfigured()) {
    try {
      const docRef = doc(db, COMPLAINTS_COL, complaintId);
      await updateDoc(docRef, {
        status: 'Completed',
        verifiedAt: now,
        verifiedBy: officerName,
        verificationNotes: verificationNotes || null,
        updatedAt: now
      });
    } catch (error) {
      console.warn('Firestore verify resolution notice:', error);
    }
  }
}

// Officer: Reject task completion and request re-work with feedback
export async function requestTaskRework(
  complaintId: string,
  officerName: string,
  feedbackNotes: string
): Promise<void> {
  const now = new Date().toISOString();

  const all = getLocalComplaints();
  const updated = all.map(c => {
    if (c.id === complaintId) {
      return {
        ...c,
        status: 'Re-Work Required' as ComplaintStatus,
        reworkFeedback: feedbackNotes,
        updatedAt: now
      };
    }
    return c;
  });
  saveLocalComplaints(updated);

  if (isFirebaseConfigured()) {
    try {
      const docRef = doc(db, COMPLAINTS_COL, complaintId);
      await updateDoc(docRef, {
        status: 'Re-Work Required',
        reworkFeedback: feedbackNotes,
        updatedAt: now
      });
    } catch (error) {
      console.warn('Firestore request rework notice:', error);
    }
  }
}

// Batch apply AI assignments to all pending complaints
export async function batchApplyAIAssignments(
  assignments: Array<{
    complaintId: string;
    workerId: string;
    workerName: string;
    aiReasoning: string;
    score: number;
  }>
): Promise<void> {
  const now = new Date().toISOString();
  const all = getLocalComplaints();

  const assignmentMap = new Map(assignments.map(a => [a.complaintId, a]));

  const updated = all.map(c => {
    const aiAssign = assignmentMap.get(c.id);
    if (aiAssign) {
      return {
        ...c,
        assignedWorkerId: aiAssign.workerId,
        assignedWorkerName: aiAssign.workerName,
        assignedAt: now,
        status: 'Assigned' as ComplaintStatus,
        aiMatchScore: aiAssign.score,
        aiMatchReasoning: aiAssign.aiReasoning,
        autoAssignedByAI: true,
        updatedAt: now
      };
    }
    return c;
  });
  saveLocalComplaints(updated);

  // Update workload for each assigned worker
  for (const a of assignments) {
    await adjustWorkerWorkload(a.workerId, 1);
  }

  // Sync to Firestore if configured
  if (isFirebaseConfigured()) {
    for (const a of assignments) {
      try {
        const docRef = doc(db, COMPLAINTS_COL, a.complaintId);
        await updateDoc(docRef, {
          assignedWorkerId: a.workerId,
          assignedWorkerName: a.workerName,
          assignedAt: now,
          status: 'Assigned',
          aiMatchScore: a.score,
          aiMatchReasoning: a.aiReasoning,
          updatedAt: now
        });
      } catch (e) {
        // ignore
      }
    }
  }
}

// Worker: Update task lifecycle status (Assigned -> In Progress)
export async function updateTaskStatus(
  complaintId: string,
  newStatus: ComplaintStatus,
  workerId?: string
): Promise<void> {
  const now = new Date().toISOString();

  // Update local cache
  const all = getLocalComplaints();
  const updated = all.map(c => {
    if (c.id === complaintId) {
      return {
        ...c,
        status: newStatus,
        updatedAt: now
      };
    }
    return c;
  });
  saveLocalComplaints(updated);

  // If directly completing without verification flow, decrement worker workload
  if (newStatus === 'Completed' && workerId) {
    await adjustWorkerWorkload(workerId, -1);
  }

  // Update Firestore if configured
  if (isFirebaseConfigured()) {
    try {
      const docRef = doc(db, COMPLAINTS_COL, complaintId);
      await updateDoc(docRef, {
        status: newStatus,
        updatedAt: now
      });
    } catch (error) {
      console.warn('Firestore update status notice:', error);
    }
  }
}
