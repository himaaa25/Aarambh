import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialize Gemini client
let genAIClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
    return null;
  }
  if (!genAIClient) {
    genAIClient = new GoogleGenAI({ apiKey });
  }
  return genAIClient;
}

// Heuristic matching algorithm used as fallback or verification baseline
function heuristicScore(complaint: any, worker: any) {
  let score = 0;
  const reasons: string[] = [];

  // 1. Skill Match (up to 45 pts)
  const categoryLower = (complaint.category || '').toLowerCase();
  const titleAndDesc = `${complaint.title} ${complaint.description}`.toLowerCase();
  
  const hasDirectSkill = (worker.skills || []).some((s: string) => {
    const sLower = s.toLowerCase();
    return sLower.includes(categoryLower) || categoryLower.includes(sLower);
  });

  const hasContextSkill = (worker.skills || []).some((s: string) => {
    const sLower = s.toLowerCase();
    const words = sLower.split(/\s+/);
    return words.some((w: string) => w.length > 3 && titleAndDesc.includes(w));
  });

  if (hasDirectSkill) {
    score += 45;
    reasons.push(`Direct skill match for ${complaint.category}`);
  } else if (hasContextSkill) {
    score += 30;
    reasons.push('Contextual domain skill match');
  } else {
    score += 10;
  }

  // 2. Location / Ward match (up to 30 pts)
  const compLoc = (complaint.location || '').toLowerCase();
  const workerLoc = (worker.location || '').toLowerCase();

  const wardMatch = (compLoc.includes('ward 1') && workerLoc.includes('ward 1')) ||
                    (compLoc.includes('ward 2') && workerLoc.includes('ward 2')) ||
                    (compLoc.includes('ward 3') && workerLoc.includes('ward 3'));

  const zoneMatch = (compLoc.includes('central') && workerLoc.includes('central')) ||
                    (compLoc.includes('north') && workerLoc.includes('north')) ||
                    (compLoc.includes('east') && workerLoc.includes('east'));

  if (wardMatch) {
    score += 30;
    reasons.push('Stationed in exact same Ward sector');
  } else if (zoneMatch) {
    score += 20;
    reasons.push('Located within same administrative zone');
  } else {
    score += 10;
  }

  // 3. Workload capacity (up to 15 pts)
  const workload = worker.workload || 0;
  if (workload === 0) {
    score += 15;
    reasons.push('Available immediately (0 active tasks)');
  } else if (workload <= 2) {
    score += 10;
    reasons.push(`Light active workload (${workload} tasks)`);
  } else if (workload <= 4) {
    score += 5;
    reasons.push(`Moderate workload (${workload} tasks)`);
  } else {
    score += 0;
    reasons.push(`High workload (${workload} tasks)`);
  }

  // 4. Performance rating (up to 10 pts)
  const perf = worker.performance || 4.5;
  const perfPoints = Math.min(10, Math.round((perf / 5.0) * 10));
  score += perfPoints;
  if (perf >= 4.8) {
    reasons.push(`High reliability rating (${perf.toFixed(1)}/5.0)`);
  }

  return {
    score: Math.min(99, Math.max(20, score)),
    reasons
  };
}

// ---------------- API ROUTES ----------------

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Single Complaint AI Match & Recommendation
app.post('/api/ai/match-worker', async (req, res) => {
  try {
    const { complaint, workers } = req.body;
    if (!complaint || !workers || !Array.isArray(workers) || workers.length === 0) {
      return res.status(400).json({ error: 'Missing complaint or worker list' });
    }

    const ai = getGenAI();
    let bestWorkerId = '';
    let bestWorkerName = '';
    let confidence = 85;
    let aiReasoning = '';
    let rankings: Array<{ workerId: string; score: number; reasons: string[] }> = [];

    if (ai) {
      try {
        const prompt = `You are the Aarambh Municipal AI Workforce Dispatcher.
Analyze this municipal complaint and evaluate the available field workers to find the optimal assignment.

Complaint Details:
- Title: ${complaint.title}
- Category: ${complaint.category}
- Description: ${complaint.description}
- Location: ${complaint.location}
- Priority: ${complaint.priority || 'Medium'}

Candidate Field Workers:
${JSON.stringify(
  workers.map(w => ({
    id: w.id,
    name: w.name,
    skills: w.skills,
    location: w.location,
    currentWorkload: w.workload,
    performanceRating: w.performance
  })),
  null,
  2
)}

Optimization Criteria:
1. Primary Skill Alignment: The worker must possess relevant technical skills or trade background for this category.
2. Ward Proximity: Same ward/zone minimizes transit delays and accelerates response time.
3. Workload Balancing: Strictly avoid assigning to workers with high workloads (>3 tasks) if another qualified worker has 0-2 tasks.
4. Historical Performance: Higher rated workers handle complex or urgent tasks better.

Return ONLY a valid JSON object matching this schema:
{
  "bestWorkerId": "string (the worker id)",
  "confidence": number (integer between 70 and 99),
  "aiReasoning": "string (clear 1-2 sentence explanation of why this worker is the top match)",
  "rankings": [
    {
      "workerId": "string",
      "score": number (0-100),
      "reasons": ["short bullet reason", "short bullet reason"]
    }
  ]
}`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json'
          }
        });

        const text = response.text || '';
        const parsed = JSON.parse(text);
        if (parsed.bestWorkerId) {
          bestWorkerId = parsed.bestWorkerId;
          const foundWorker = workers.find(w => w.id === bestWorkerId);
          bestWorkerName = foundWorker ? foundWorker.name : '';
          confidence = parsed.confidence || 90;
          aiReasoning = parsed.aiReasoning || 'Selected as optimal match based on trade skill specialization and current ward availability.';
          rankings = Array.isArray(parsed.rankings) ? parsed.rankings : [];
        }
      } catch (aiErr) {
        console.warn('Gemini API call warning, falling back to algorithmic heuristic:', aiErr);
      }
    }

    // Heuristic calculation if Gemini did not return or unavailable
    if (!bestWorkerId || rankings.length === 0) {
      const scoredWorkers = workers.map(w => {
        const { score, reasons } = heuristicScore(complaint, w);
        return {
          workerId: w.id,
          workerName: w.name,
          score,
          reasons
        };
      });

      scoredWorkers.sort((a, b) => b.score - a.score);
      const top = scoredWorkers[0];
      bestWorkerId = top.workerId;
      bestWorkerName = top.workerName;
      confidence = top.score;
      aiReasoning = `Selected ${top.workerName}: ${top.reasons.join(', ')}.`;
      rankings = scoredWorkers.map(s => ({
        workerId: s.workerId,
        score: s.score,
        reasons: s.reasons
      }));
    }

    res.json({
      success: true,
      bestWorkerId,
      bestWorkerName,
      confidence,
      aiReasoning,
      rankings
    });
  } catch (err: any) {
    console.error('Error in /api/ai/match-worker:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Batch Auto-Assign All Pending Complaints with AI
app.post('/api/ai/auto-assign-batch', async (req, res) => {
  try {
    const { complaints, workers } = req.body;
    if (!complaints || !Array.isArray(complaints) || complaints.length === 0) {
      return res.status(400).json({ error: 'No complaints to assign' });
    }
    if (!workers || !Array.isArray(workers) || workers.length === 0) {
      return res.status(400).json({ error: 'No workers available' });
    }

    // Simulated working roster copy for workload tracking during batch assignment
    const workingWorkers = workers.map(w => ({ ...w, simulatedWorkload: w.workload || 0 }));
    const assignments: Array<{
      complaintId: string;
      workerId: string;
      workerName: string;
      aiReasoning: string;
      score: number;
    }> = [];

    const ai = getGenAI();
    let geminiBatchSucceeded = false;

    if (ai) {
      try {
        const prompt = `You are the Aarambh Municipal AI Workforce Engine.
You must auto-assign ${complaints.length} unassigned municipal complaints to the most suitable field workers, optimizing for skill match, zone proximity, and load balancing.

Complaints to assign:
${JSON.stringify(
  complaints.map(c => ({
    id: c.id,
    title: c.title,
    category: c.category,
    location: c.location
  })),
  null,
  2
)}

Available Workers:
${JSON.stringify(
  workingWorkers.map(w => ({
    id: w.id,
    name: w.name,
    skills: w.skills,
    location: w.location,
    currentWorkload: w.simulatedWorkload,
    performance: w.performance
  })),
  null,
  2
)}

Return a JSON object with this exact schema:
{
  "assignments": [
    {
      "complaintId": "string",
      "workerId": "string",
      "aiReasoning": "string (concise reason, max 20 words)",
      "score": number (0-100)
    }
  ]
}`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: { responseMimeType: 'application/json' }
        });

        const parsed = JSON.parse(response.text || '{}');
        if (Array.isArray(parsed.assignments) && parsed.assignments.length > 0) {
          for (const a of parsed.assignments) {
            const w = workingWorkers.find(x => x.id === a.workerId);
            if (w) {
              assignments.push({
                complaintId: a.complaintId,
                workerId: a.workerId,
                workerName: w.name,
                aiReasoning: a.aiReasoning || 'Assigned by AI workforce load balancer',
                score: a.score || 88
              });
              w.simulatedWorkload += 1;
            }
          }
          if (assignments.length === complaints.length) {
            geminiBatchSucceeded = true;
          }
        }
      } catch (aiErr) {
        console.warn('Gemini batch assignment error, utilizing heuristic distributor:', aiErr);
      }
    }

    // Heuristic multi-task distributor if Gemini was offline or incomplete
    if (!geminiBatchSucceeded) {
      for (const complaint of complaints) {
        if (assignments.some(a => a.complaintId === complaint.id)) continue;

        let bestWorker: any = null;
        let highestScore = -1;
        let bestReasons: string[] = [];

        for (const worker of workingWorkers) {
          const { score, reasons } = heuristicScore(complaint, {
            ...worker,
            workload: worker.simulatedWorkload
          });
          if (score > highestScore) {
            highestScore = score;
            bestWorker = worker;
            bestReasons = reasons;
          }
        }

        if (bestWorker) {
          bestWorker.simulatedWorkload += 1;
          assignments.push({
            complaintId: complaint.id,
            workerId: bestWorker.id,
            workerName: bestWorker.name,
            aiReasoning: `AI matched: ${bestReasons.slice(0, 2).join(' & ')}`,
            score: highestScore
          });
        }
      }
    }

    res.json({
      success: true,
      count: assignments.length,
      assignments
    });
  } catch (err: any) {
    console.error('Error in /api/ai/auto-assign-batch:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Delay & SLA Analysis Endpoint
app.post('/api/ai/analyze-delay', async (req, res) => {
  try {
    const { complaint, hoursElapsed, slaHours } = req.body;
    const isOverdue = hoursElapsed > (slaHours || 24);

    const ai = getGenAI();
    let recommendation = '';
    let urgencyLevel = isOverdue ? 'CRITICAL' : hoursElapsed > (slaHours * 0.75) ? 'WARNING' : 'NORMAL';

    if (ai) {
      try {
        const prompt = `Analyze this delayed municipal task:
Complaint: "${complaint.title}" (${complaint.category})
Assigned to: ${complaint.assignedWorkerName}
Time Elapsed: ${hoursElapsed.toFixed(1)} hours
SLA Deadline: ${slaHours || 24} hours
Current Status: ${complaint.status}

Give a brief 2-sentence municipal management assessment: Should the officer reassign immediately to another worker or issue a progress reminder?`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt
        });
        recommendation = response.text || '';
      } catch (e) {
        // heuristic fallback
      }
    }

    if (!recommendation) {
      if (isOverdue) {
        recommendation = `Task exceeds standard SLA of ${slaHours || 24}h by ${(hoursElapsed - (slaHours || 24)).toFixed(1)}h. Recommend immediate reassignment to an available worker to avoid citizen escalation.`;
      } else {
        recommendation = `Task is within operating window (${hoursElapsed.toFixed(1)}h of ${slaHours || 24}h). Monitor actively or request status check.`;
      }
    }

    res.json({
      success: true,
      isOverdue,
      urgencyLevel,
      recommendation
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------- VITE MIDDLEWARE ----------------

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Aarambh Full-Stack Server running on port ${PORT}`);
  });
}

startServer();
