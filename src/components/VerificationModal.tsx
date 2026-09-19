import React, { useState } from 'react';
import { Complaint } from '../types';
import { verifyTaskResolution, requestTaskRework } from '../services/complaintService';
import { 
  CheckCircle2, 
  XCircle, 
  X, 
  ShieldCheck, 
  FileText, 
  Clock, 
  User, 
  AlertCircle,
  Loader2
} from 'lucide-react';

interface VerificationModalProps {
  complaint: Complaint;
  officerName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const VerificationModal: React.FC<VerificationModalProps> = ({
  complaint,
  officerName,
  onClose,
  onSuccess
}) => {
  const [activeAction, setActiveAction] = useState<'approve' | 'rework'>('approve');
  const [notes, setNotes] = useState<string>('Workmanship inspected and found compliant with municipal sanitation and safety standards.');
  const [feedback, setFeedback] = useState<string>('Resolution is incomplete. Please revisit the site to clear residual debris.');
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (activeAction === 'approve') {
        await verifyTaskResolution(complaint.id, officerName, notes.trim());
      } else {
        await requestTaskRework(complaint.id, officerName, feedback.trim());
      }
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Verification submit error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white flex items-center space-x-2">
                <span>Task Completion Verification</span>
                <span className="text-xs px-2 py-0.5 rounded bg-purple-500/30 text-purple-200 font-mono">
                  {complaint.id}
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Inspect field worker's reported resolution before closing the grievance.
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

        {/* Complaint & Worker Submission Context */}
        <div className="p-5 bg-slate-50 border-b border-slate-200 text-xs space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-900 text-sm">{complaint.title}</span>
            <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-semibold text-[10px]">
              {complaint.category}
            </span>
          </div>
          <p className="text-slate-600">
            <strong>Location:</strong> {complaint.location}
          </p>

          <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1.5 mt-2">
            <div className="flex items-center justify-between text-slate-700 font-semibold">
              <span className="flex items-center space-x-1.5">
                <User className="w-3.5 h-3.5 text-blue-600" />
                <span>Field Worker: {complaint.assignedWorkerName}</span>
              </span>
              {complaint.completedAt && (
                <span className="flex items-center space-x-1 text-slate-400 text-[10px]">
                  <Clock className="w-3 h-3" />
                  <span>Submitted: {new Date(complaint.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </span>
              )}
            </div>

            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-slate-800">
              <span className="font-semibold text-slate-900 block mb-0.5">Worker Resolution Notes:</span>
              <p className="text-[11px] leading-relaxed italic text-slate-700">
                "{complaint.resolutionNotes || 'Task completed on-site as per municipal procedure.'}"
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* Action Choice Tabs */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setActiveAction('approve')}
              className={`p-3 rounded-xl border text-left flex items-start space-x-2.5 transition ${
                activeAction === 'approve'
                  ? 'border-emerald-500 bg-emerald-50/70 text-emerald-950 font-semibold shadow-xs ring-1 ring-emerald-500'
                  : 'border-slate-200 hover:bg-slate-50 text-slate-700'
              }`}
            >
              <CheckCircle2 className={`w-4 h-4 mt-0.5 ${activeAction === 'approve' ? 'text-emerald-600' : 'text-slate-400'}`} />
              <div>
                <p className="font-bold text-xs">Verify & Approve</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Mark resolved & archive complaint</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setActiveAction('rework')}
              className={`p-3 rounded-xl border text-left flex items-start space-x-2.5 transition ${
                activeAction === 'rework'
                  ? 'border-rose-500 bg-rose-50/70 text-rose-950 font-semibold shadow-xs ring-1 ring-rose-500'
                  : 'border-slate-200 hover:bg-slate-50 text-slate-700'
              }`}
            >
              <XCircle className={`w-4 h-4 mt-0.5 ${activeAction === 'rework' ? 'text-rose-600' : 'text-slate-400'}`} />
              <div>
                <p className="font-bold text-xs">Request Re-Work</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Send back to worker with feedback</p>
              </div>
            </button>
          </div>

          {activeAction === 'approve' ? (
            <div>
              <label className="block font-semibold text-slate-800 mb-1">
                Officer Approval Remarks:
              </label>
              <textarea
                required
                rows={2}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 text-xs"
              />
            </div>
          ) : (
            <div>
              <label className="block font-semibold text-rose-900 mb-1 flex items-center space-x-1">
                <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                <span>Rework Instructions for Field Worker:</span>
              </label>
              <textarea
                required
                rows={2}
                value={feedback}
                onChange={e => setFeedback(e.target.value)}
                placeholder="Specify what was inadequate and what the worker must redo..."
                className="w-full px-3 py-2 rounded-lg border border-rose-300 focus:outline-hidden focus:ring-2 focus:ring-rose-500 text-xs"
              />
            </div>
          )}

          {/* Footer Buttons */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-medium transition"
            >
              Cancel
            </button>

            {activeAction === 'approve' ? (
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs flex items-center space-x-1.5 transition disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                <span>Confirm & Mark Completed</span>
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-xs flex items-center space-x-1.5 transition disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                <span>Send Back for Re-Work</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
