export type UserRole = 'citizen' | 'officer' | 'worker';

export type ComplaintStatus = 
  | 'Submitted' 
  | 'Assigned' 
  | 'In Progress' 
  | 'Pending Verification' 
  | 'Completed' 
  | 'Re-Work Required';

export type ComplaintPriority = 'Low' | 'Medium' | 'High' | 'Emergency';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  address?: string;
  employeeId?: string;
  designation?: string;
  department?: string;
  performanceRating?: number; // e.g. 4.9 / 5.0
  tasksCompleted?: number;
  tasksVerified?: number;
  resolutionRate?: number; // percentage, e.g. 97.4%
  avgResolutionHours?: number;
  joinedDate?: string;
  createdAt: string;
}

export type ComplaintSourceChannel = 
  | 'Citizen App' 
  | 'Helpline Phone Call' 
  | 'In-Person Walk-in' 
  | 'Written Letter' 
  | 'Ward Inspection';

export interface Complaint {
  id: string;
  citizenId: string;
  citizenName: string;
  citizenEmail: string;
  citizenPhone?: string;
  sourceChannel?: ComplaintSourceChannel;
  intakeOfficerId?: string;
  intakeOfficerName?: string;
  intakeNotes?: string;
  title: string;
  category: 'Waste Management' | 'Road Repair' | 'Water Supply' | 'Street Lighting' | 'Drainage & Sewerage';
  description: string;
  location: string;
  status: ComplaintStatus;
  priority?: ComplaintPriority;
  slaHours?: number;
  assignedWorkerId?: string;
  assignedWorkerName?: string;
  assignedAt?: string;
  // Re-assignment history
  reassignedFromWorkerId?: string;
  reassignedFromWorkerName?: string;
  reassignmentReason?: string;
  reassignedAt?: string;
  reassignmentCount?: number;
  // Task resolution & Officer verification
  resolutionNotes?: string;
  completionProofUrl?: string;
  completedAt?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  verificationNotes?: string;
  reworkFeedback?: string;
  // AI assignment metadata
  aiMatchScore?: number;
  aiMatchReasoning?: string;
  autoAssignedByAI?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WorkerProfile {
  id: string;
  userId?: string;
  name: string;
  email: string;
  skills: string[];
  location: string;
  workload: number;
  performance: number; // e.g. 4.8 / 5.0
  phone?: string;
}

export interface WorkerMatchScore {
  worker: WorkerProfile;
  score: number; // 0 - 100
  skillMatch: boolean;
  locationMatch: boolean;
  workloadStatus: 'Low' | 'Moderate' | 'Heavy';
  breakdown: {
    skillPoints: number;
    locationPoints: number;
    workloadPoints: number;
    performancePoints: number;
  };
  aiReasoning?: string;
}

export interface AIMatchResponse {
  bestWorkerId: string;
  bestWorkerName: string;
  confidence: number;
  aiReasoning: string;
  rankings: Array<{
    workerId: string;
    score: number;
    reasons: string[];
  }>;
}
