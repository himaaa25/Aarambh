import React, { useState } from 'react';
import { Complaint, WorkerProfile } from '../types';
import { reassignWorkerToComplaint } from '../services/complaintService';
import { getAIMatchRecommendation, calculateSLAMetrics } from '../services/aiMatchingService';
import { 
  AlertTriangle, 
  Sparkles, 
  X, 
  UserCheck, 
  Clock, 
  ArrowRight, 
  ShieldAlert, 
  CheckCircle2,
  Loader2
} from 'lucide-react';

interface ReassignModalProps {
  complaint: Complaint;
  workers: WorkerProfile[];
  onClose: () => void;
  onSuccess: () => void;
}

export const ReassignModal: React.FC<ReassignModalProps> = ({
  complaint,
  workers,
  onClose,
  onSuccess
}) => {
  // Exclude current assigned worker from candidates
  const candidateWorkers = workers.filter(w => w.id !== complaint.assignedWorkerId);

  const [selectedWorkerId, setSelectedWorkerId] = useState<string>(candidateWorkers[0]?.id || '');
  const [reason, setReason] = useState<string>('Worker taking too long / exceeded target resolution SLA');
  const [loading, setLoading] = useState<boolean>(false);
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiSuggestion, setAiSuggestion] = useState<{
    workerId: string;
    workerName: string;
    confidence: number;
    reasoning: string;
  } | null>(null);

  const slaInfo = calculateSLAMetrics(complaint);

  // Ask AI for the best alternate replacement worker
  const handleAISuggestAlternate = async () => {
    setAiLoading(true);
    try {
      const matchResult = await getAIMatchRecommendation(complaint, candidateWorkers);
      if (matchResult && matchResult.bestWorkerId) {
        setAiSuggestion({
          workerId: matchResult.bestWorkerId,
          workerName: matchResult.bestWorkerName,
          confidence: matchResult.confidence,
          reasoning: matchResult.aiReasoning
        });
        setSelectedWorkerId(matchResult.bestWorkerId);
      }
    } catch (e) {
      console.warn('AI alternate worker recommendation failed:', e);
    } finally {
      setAiLoading(false);
    }
  };

  const handleConfirmReassignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkerId) return;

    const targetWorker = workers.find(w => w.id === selectedWorkerId);
    if (!targetWorker) return;

    setLoading(true);
    try {
      await reassignWorkerToComplaint(
        complaint.id,
        complaint.assignedWorkerId,
        targetWorker.id,
        targetWorker.name,
        reason.trim()
      );
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Reassignment error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white flex items-center space-x-2">
                <span>Reassign Delayed Task</span>
                <span className="text-xs px-2 py-0.5 rounded bg-red-500/30 text-red-300 font-mono">
                  {complaint.id}
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Transfer responsibility to prevent citizen dissatisfaction and meet SLA.
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

        {/* Delay Audit Context */}
        <div className="p-5 bg-amber-50/70 border-b border-amber-200/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div>
              <span className="font-semibold text-slate-700">Currently Assigned:</span>{' '}
              <span className="font-bold text-slate-900">{complaint.assignedWorkerName || 'Unknown'}</span>
            </div>
            <div className="flex items-center space-x-1.5 font-semibold text-red-700">
              <Clock className="w-3.5 h-3.5" />
              <span>Elapsed: {slaInfo.hoursElapsed.toFixed(1)} hrs / SLA: {slaInfo.slaHours} hrs</span>
            </div>
          </div>
          <p className="text-xs text-slate-600 mt-2 line-clamp-2">
            <strong>Task:</strong> {complaint.title} ({complaint.category}) &bull; {complaint.location}
          </p>
        </div>

        <form onSubmit={handleConfirmReassignment} className="p-5 space-y-4 text-xs">
          {/* AI Reassignment Accelerator */}
          <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-3.5 rounded-xl border border-indigo-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span className="font-bold text-slate-900">AI Worker Replacement Engine</span>
              </div>
              <button
                type="button"
                onClick={handleAISuggestAlternate}
                disabled={aiLoading}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-[11px] shadow-xs flex items-center space-x-1.5 transition disabled:opacity-50"
              >
                {aiLoading ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Analyzing Candidates...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3" />
                    <span>AI Recommend Alternate</span>
                  </>
                )}
              </button>
            </div>

            {aiSuggestion && (
              <div className="mt-3 pt-3 border-t border-indigo-200/80">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-indigo-950 flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Recommended: {aiSuggestion.workerName}</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[10px]">
                    {aiSuggestion.confidence}% Match
                  </span>
                </div>
                <p className="text-[11px] text-indigo-900/80 mt-1 leading-relaxed">
                  {aiSuggestion.reasoning}
                </p>
              </div>
            )}
          </div>

          {/* Select Replacement Worker */}
          <div>
            <label className="block font-semibold text-slate-800 mb-1.5">
              Select Replacement Field Worker:
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {candidateWorkers.map(w => {
                const isSelected = selectedWorkerId === w.id;
                return (
                  <div
                    key={w.id}
                    onClick={() => setSelectedWorkerId(w.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/70 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                        isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {w.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{w.name}</p>
                        <p className="text-[11px] text-slate-500">
                          {w.location} &bull; Skills: {w.skills.join(', ')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                        w.workload === 0 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : w.workload <= 2 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-amber-100 text-amber-800'
                      }`}>
                        {w.workload} active tasks
                      </span>
                      <p className="text-[10px] text-slate-400 mt-0.5">Rating: {w.performance}/5.0</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Reassignment Reason */}
          <div>
            <label className="block font-semibold text-slate-800 mb-1">
              Reason for Reassignment (Audit Log):
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {[
                'Exceeded SLA resolution deadline',
                'Unresponsive field worker',
                'Equipment / tooling constraint',
                'Emergency priority escalated'
              ].map(preset => (
                <button
                  type="button"
                  key={preset}
                  onClick={() => setReason(preset)}
                  className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] transition border border-slate-200"
                >
                  {preset}
                </button>
              ))}
            </div>
            <textarea
              required
              rows={2}
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Provide reason for reassigning this complaint..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-xs"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-medium transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !selectedWorkerId}
              className="px-5 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-xs flex items-center space-x-2 transition disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Reassigning...</span>
                </>
              ) : (
                <>
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>Confirm Task Transfer</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
