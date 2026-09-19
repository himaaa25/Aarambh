import React, { useState, useEffect } from 'react';
import { Complaint, WorkerProfile, AIMatchResponse } from '../types';
import { getAIMatchRecommendation } from '../services/aiMatchingService';
import { assignWorkerToComplaint } from '../services/complaintService';
import { 
  Sparkles, 
  X, 
  CheckCircle2, 
  UserCheck, 
  Award, 
  MapPin, 
  Briefcase, 
  ArrowRight,
  Loader2
} from 'lucide-react';

interface AIMatchModalProps {
  complaint: Complaint;
  workers: WorkerProfile[];
  onClose: () => void;
  onSuccess: () => void;
}

export const AIMatchModal: React.FC<AIMatchModalProps> = ({
  complaint,
  workers,
  onClose,
  onSuccess
}) => {
  const [loadingAI, setLoadingAI] = useState<boolean>(true);
  const [assigning, setAssigning] = useState<boolean>(false);
  const [aiData, setAiData] = useState<AIMatchResponse | null>(null);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>('');

  useEffect(() => {
    let isMounted = true;
    async function fetchMatch() {
      setLoadingAI(true);
      try {
        const res = await getAIMatchRecommendation(complaint, workers);
        if (isMounted) {
          setAiData(res);
          setSelectedWorkerId(res.bestWorkerId);
        }
      } catch (err) {
        console.error('Error fetching AI match:', err);
      } finally {
        if (isMounted) setLoadingAI(false);
      }
    }
    fetchMatch();
    return () => {
      isMounted = false;
    };
  }, [complaint, workers]);

  const handleAssign = async (workerIdToAssign: string) => {
    const worker = workers.find(w => w.id === workerIdToAssign);
    if (!worker) return;

    setAssigning(true);
    try {
      const matchScore = aiData?.rankings.find(r => r.workerId === worker.id)?.score || aiData?.confidence || 90;
      await assignWorkerToComplaint(
        complaint.id,
        worker.id,
        worker.name,
        matchScore,
        aiData?.aiReasoning
      );
      onSuccess();
      onClose();
    } catch (e) {
      console.error('Failed to assign worker:', e);
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white p-5 flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <Sparkles className="w-5 h-5 text-indigo-300 animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white flex items-center space-x-2">
                <span>AI Worker Matching Engine</span>
                <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/30 text-indigo-200 font-mono">
                  {complaint.id}
                </span>
              </h3>
              <p className="text-xs text-indigo-200/80 mt-0.5">
                Multi-dimensional evaluation: Skills, Ward location, Workload & Rating.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Complaint Details */}
        <div className="p-4 bg-indigo-50/50 border-b border-indigo-100 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-900">{complaint.title}</span>
            <span className="px-2 py-0.5 rounded bg-white text-indigo-800 border border-indigo-200 font-bold text-[10px]">
              {complaint.category}
            </span>
          </div>
          <p className="text-slate-600 mt-1 flex items-center space-x-1.5">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            <span>{complaint.location}</span>
          </p>
        </div>

        {loadingAI ? (
          <div className="p-12 flex flex-col items-center justify-center text-center space-y-3">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            <p className="font-bold text-slate-800 text-sm">Evaluating Municipal Field Roster...</p>
            <p className="text-xs text-slate-500 max-w-xs">
              AI is computing spatial proximity, technical certifications, and real-time active task counts.
            </p>
          </div>
        ) : (
          <div className="p-5 space-y-4 text-xs">
            {/* AI Top Recommendation Banner */}
            {aiData && (
              <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-blue-50 border border-emerald-300/80 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Award className="w-5 h-5 text-emerald-600" />
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-emerald-800 font-extrabold block">
                        Top AI Recommendation
                      </span>
                      <h4 className="font-extrabold text-sm text-slate-900">
                        {aiData.bestWorkerName}
                      </h4>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-black text-emerald-700">
                      {aiData.confidence}%
                    </span>
                    <span className="block text-[9px] font-bold text-emerald-800 uppercase tracking-tight">
                      Match Score
                    </span>
                  </div>
                </div>

                <p className="mt-2.5 text-xs text-slate-700 leading-relaxed bg-white/70 p-2.5 rounded-lg border border-emerald-200/60">
                  {aiData.aiReasoning}
                </p>
              </div>
            )}

            {/* Candidate Workers Ranked List */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="font-bold text-slate-800 text-xs">
                  Field Worker Candidate Rankings:
                </label>
                <span className="text-[10px] text-slate-500">
                  Select candidate to assign
                </span>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {workers.map((w, idx) => {
                  const isSelected = selectedWorkerId === w.id;
                  const isTopMatch = aiData?.bestWorkerId === w.id;
                  const rankInfo = aiData?.rankings.find(r => r.workerId === w.id);

                  return (
                    <div
                      key={w.id}
                      onClick={() => setSelectedWorkerId(w.id)}
                      className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/60 shadow-xs ring-1 ring-indigo-500'
                          : 'border-slate-200 hover:bg-slate-50 bg-white'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                          isTopMatch 
                            ? 'bg-emerald-600 text-white' 
                            : isSelected 
                              ? 'bg-indigo-600 text-white' 
                              : 'bg-slate-100 text-slate-700'
                        }`}>
                          #{idx + 1}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-slate-900">{w.name}</span>
                            {isTopMatch && (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-extrabold text-[9px]">
                                Best Match
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500">
                            {w.location} &bull; Skills: {w.skills.join(', ')}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          rankInfo && rankInfo.score >= 85 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {rankInfo ? `${rankInfo.score}% Fit` : `${w.workload} tasks`}
                        </span>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Workload: {w.workload} active
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-medium transition"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => handleAssign(selectedWorkerId)}
                disabled={assigning || !selectedWorkerId}
                className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-xs flex items-center space-x-2 transition disabled:opacity-50"
              >
                {assigning ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Assigning...</span>
                  </>
                ) : (
                  <>
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Confirm Assignment</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
