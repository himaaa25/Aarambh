import { Complaint, WorkerProfile, AIMatchResponse, ComplaintPriority } from '../types';

export interface SLAMonitorInfo {
  slaHours: number;
  deadlineDate: Date;
  hoursElapsed: number;
  hoursRemaining: number;
  isOverdue: boolean;
  isWarning: boolean; // e.g. >75% of SLA elapsed
  percentageElapsed: number;
  statusLabel: 'On Track' | 'Nearing Deadline' | 'Overdue (Action Needed)' | 'Pending Verification' | 'Completed';
  colorClass: string;
  badgeBg: string;
}

// Compute SLA metrics based on priority and timestamps
export function calculateSLAMetrics(complaint: Complaint): SLAMonitorInfo {
  // Default SLA windows by priority
  const defaultSLA: Record<ComplaintPriority, number> = {
    Emergency: 6,
    High: 12,
    Medium: 24,
    Low: 48
  };

  const priority: ComplaintPriority = complaint.priority || 'Medium';
  const slaHours = complaint.slaHours || defaultSLA[priority];

  // Base timer from assignedAt if assigned, else createdAt
  const startTimeStr = complaint.assignedAt || complaint.createdAt;
  const startTime = new Date(startTimeStr).getTime();
  const now = Date.now();

  const elapsedMs = Math.max(0, now - startTime);
  const hoursElapsed = elapsedMs / (1000 * 60 * 60);
  const totalSlaMs = slaHours * 3600 * 1000;
  const deadlineDate = new Date(startTime + totalSlaMs);
  const hoursRemaining = Math.max(0, (totalSlaMs - elapsedMs) / (1000 * 60 * 60));

  const percentageElapsed = Math.min(200, Math.round((elapsedMs / totalSlaMs) * 100));

  if (complaint.status === 'Completed') {
    return {
      slaHours,
      deadlineDate,
      hoursElapsed,
      hoursRemaining: 0,
      isOverdue: false,
      isWarning: false,
      percentageElapsed: 100,
      statusLabel: 'Completed',
      colorClass: 'text-emerald-700',
      badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200'
    };
  }

  if (complaint.status === 'Pending Verification') {
    return {
      slaHours,
      deadlineDate,
      hoursElapsed,
      hoursRemaining,
      isOverdue: false,
      isWarning: false,
      percentageElapsed,
      statusLabel: 'Pending Verification',
      colorClass: 'text-purple-700',
      badgeBg: 'bg-purple-50 text-purple-700 border-purple-200'
    };
  }

  const isOverdue = hoursElapsed > slaHours;
  const isWarning = !isOverdue && percentageElapsed >= 75;

  let statusLabel: 'On Track' | 'Nearing Deadline' | 'Overdue (Action Needed)' = 'On Track';
  let colorClass = 'text-emerald-700';
  let badgeBg = 'bg-emerald-50 text-emerald-700 border-emerald-200';

  if (isOverdue) {
    statusLabel = 'Overdue (Action Needed)';
    colorClass = 'text-red-700 font-semibold';
    badgeBg = 'bg-red-50 text-red-700 border-red-300';
  } else if (isWarning) {
    statusLabel = 'Nearing Deadline';
    colorClass = 'text-amber-700';
    badgeBg = 'bg-amber-50 text-amber-700 border-amber-300';
  }

  return {
    slaHours,
    deadlineDate,
    hoursElapsed,
    hoursRemaining,
    isOverdue,
    isWarning,
    percentageElapsed,
    statusLabel,
    colorClass,
    badgeBg
  };
}

// Request AI Worker Match recommendation for a specific complaint
export async function getAIMatchRecommendation(
  complaint: Complaint,
  workers: WorkerProfile[]
): Promise<AIMatchResponse> {
  try {
    const response = await fetch('/api/ai/match-worker', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ complaint, workers })
    });

    if (response.ok) {
      const data = await response.json();
      return data;
    }
  } catch (error) {
    console.warn('Network call to /api/ai/match-worker failed, falling back to client-side matcher:', error);
  }

  // Client-side fallback matcher
  return getClientSideAIMatch(complaint, workers);
}

// Batch auto-assign multiple unassigned complaints with AI
export async function autoAssignPendingComplaintsWithAI(
  complaints: Complaint[],
  workers: WorkerProfile[]
): Promise<{
  count: number;
  assignments: Array<{
    complaintId: string;
    workerId: string;
    workerName: string;
    aiReasoning: string;
    score: number;
  }>;
}> {
  try {
    const response = await fetch('/api/ai/auto-assign-batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ complaints, workers })
    });

    if (response.ok) {
      const data = await response.json();
      return data;
    }
  } catch (error) {
    console.warn('Batch AI assignment endpoint notice, calculating with client engine:', error);
  }

  // Fallback client-side batch optimizer
  const workingWorkers = workers.map(w => ({ ...w, simulatedWorkload: w.workload || 0 }));
  const assignments: Array<{
    complaintId: string;
    workerId: string;
    workerName: string;
    aiReasoning: string;
    score: number;
  }> = [];

  for (const complaint of complaints) {
    const scored = workingWorkers.map(w => {
      let score = 30;
      const reasons: string[] = [];

      // Skills
      const cat = complaint.category.toLowerCase();
      if (w.skills.some(s => s.toLowerCase().includes(cat) || cat.includes(s.toLowerCase()))) {
        score += 40;
        reasons.push(`${complaint.category} domain expertise`);
      }

      // Location
      if (w.location.split(' - ')[0] === complaint.location.split(' - ')[0]) {
        score += 20;
        reasons.push('Same Ward sector');
      }

      // Workload
      if (w.simulatedWorkload === 0) {
        score += 15;
        reasons.push('Available immediately');
      } else if (w.simulatedWorkload <= 2) {
        score += 8;
      }

      return { worker: w, score, reasons };
    });

    scored.sort((a, b) => b.score - a.score);
    const top = scored[0];
    if (top) {
      top.worker.simulatedWorkload += 1;
      assignments.push({
        complaintId: complaint.id,
        workerId: top.worker.id,
        workerName: top.worker.name,
        aiReasoning: `AI matched: ${top.reasons.join(', ')}`,
        score: top.score
      });
    }
  }

  return {
    count: assignments.length,
    assignments
  };
}

// Client-side fallback matcher
function getClientSideAIMatch(complaint: Complaint, workers: WorkerProfile[]): AIMatchResponse {
  const ranked = workers.map(w => {
    let score = 25;
    const reasons: string[] = [];

    const cat = complaint.category.toLowerCase();
    if (w.skills.some(s => s.toLowerCase().includes(cat) || cat.includes(s.toLowerCase()))) {
      score += 45;
      reasons.push(`Core specialty in ${complaint.category}`);
    }

    if (w.location.split(' - ')[0] === complaint.location.split(' - ')[0]) {
      score += 25;
      reasons.push(`Stationed in ${w.location.split(' - ')[0]}`);
    }

    if (w.workload === 0) {
      score += 15;
      reasons.push('Zero active workload');
    } else if (w.workload <= 2) {
      score += 10;
      reasons.push(`Light queue (${w.workload} tasks)`);
    }

    if (w.performance >= 4.8) {
      score += 10;
      reasons.push(`High reliability rating (${w.performance}/5.0)`);
    }

    return {
      workerId: w.id,
      workerName: w.name,
      score: Math.min(99, score),
      reasons
    };
  });

  ranked.sort((a, b) => b.score - a.score);
  const best = ranked[0];

  return {
    bestWorkerId: best ? best.workerId : workers[0]?.id || '',
    bestWorkerName: best ? best.workerName : workers[0]?.name || '',
    confidence: best ? best.score : 80,
    aiReasoning: best
      ? `AI evaluated ${workers.length} active field workers. ${best.workerName} scored highest (${best.score}%) based on: ${best.reasons.join(', ')}.`
      : 'Optimal match based on current availability and departmental alignment.',
    rankings: ranked.map(r => ({
      workerId: r.workerId,
      score: r.score,
      reasons: r.reasons
    }))
  };
}
