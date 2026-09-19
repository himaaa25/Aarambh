import React, { useState, useEffect } from 'react';
import { 
  Wrench, 
  Clock, 
  CheckCircle2, 
  MapPin, 
  Tag, 
  User, 
  Calendar, 
  Play, 
  Check, 
  Filter, 
  AlertCircle,
  FileCheck2,
  AlertTriangle,
  Send,
  Loader2,
  Shield,
  Star
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Complaint, ComplaintStatus } from '../types';
import { 
  subscribeWorkerTasks, 
  updateTaskStatus, 
  submitTaskForVerification 
} from '../services/complaintService';
import { calculateSLAMetrics } from '../services/aiMatchingService';
import { UnauthorizedBanner } from './UnauthorizedBanner';
import { UserProfileView } from './UserProfileView';

export const WorkerDashboard: React.FC = () => {
  const { userProfile, currentUser } = useAuth();

  // Strict role enforcement
  if (userProfile && userProfile.role !== 'worker') {
    return <UnauthorizedBanner attemptedRole="worker" />;
  }

  const [tasks, setTasks] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [mainView, setMainView] = useState<'tasks' | 'profile'>('tasks');
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'PENDING_VERIFICATION' | 'COMPLETED'>('ALL');
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Resolution submission modal state
  const [submittingTask, setSubmittingTask] = useState<Complaint | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState<string>('');
  const [isSubmittingVerification, setIsSubmittingVerification] = useState<boolean>(false);

  const workerId = userProfile?.uid || currentUser?.uid || '';
  const workerName = userProfile?.name || 'Field Specialist';

  useEffect(() => {
    if (!workerId) return;
    setLoading(true);
    const unsubscribe = subscribeWorkerTasks(workerId, (taskList) => {
      setTasks(taskList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [workerId]);

  // Start work
  const handleStartWork = async (complaintId: string) => {
    setUpdatingTaskId(complaintId);
    try {
      await updateTaskStatus(complaintId, 'In Progress', workerId);
      setActionSuccessMsg(`Task #${complaintId} status updated to In Progress. Citizen & Officer notified.`);
      setTimeout(() => setActionSuccessMsg(null), 3000);
    } catch (error: any) {
      console.error('Failed to update task status:', error);
    } finally {
      setUpdatingTaskId(null);
    }
  };

  // Open submit verification dialog
  const handleOpenSubmitModal = (task: Complaint) => {
    setSubmittingTask(task);
    setResolutionNotes(`Issue inspected and resolved on-site for ${task.category} at ${task.location}. Equipment verified functional.`);
  };

  // Submit task for verification
  const handleConfirmSubmitVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submittingTask) return;

    setIsSubmittingVerification(true);
    try {
      await submitTaskForVerification(submittingTask.id, workerId, resolutionNotes.trim());
      setActionSuccessMsg(`Task #${submittingTask.id} submitted for Officer Verification! Officer will inspect and close the ticket.`);
      setSubmittingTask(null);
      setTimeout(() => setActionSuccessMsg(null), 4000);
    } catch (err) {
      console.error('Submit verification failed:', err);
    } finally {
      setIsSubmittingVerification(false);
    }
  };

  const filteredTasks = tasks.filter(t => {
    if (filter === 'ACTIVE') return t.status === 'Assigned' || t.status === 'In Progress' || t.status === 'Re-Work Required';
    if (filter === 'PENDING_VERIFICATION') return t.status === 'Pending Verification';
    if (filter === 'COMPLETED') return t.status === 'Completed';
    return true;
  });

  const activeCount = tasks.filter(t => t.status === 'Assigned' || t.status === 'In Progress' || t.status === 'Re-Work Required').length;
  const pendingVerifyCount = tasks.filter(t => t.status === 'Pending Verification').length;
  const completedCount = tasks.filter(t => t.status === 'Completed').length;

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Worker Header */}
        <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-bold tracking-wider uppercase text-emerald-600 mb-1">
              <Wrench className="w-4 h-4" />
              <span>Municipal Field Workforce Dispatch</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900">
              Field Specialist: {workerName}
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              Execute municipal field resolutions, maintain SLA timelines to prevent reassignment, and submit proof for officer verification.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Duty Status: Active On-Field</span>
            </div>
          </div>
        </div>

        {/* Action Success Alert */}
        {actionSuccessMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-bold flex items-center space-x-2 shadow-xs">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{actionSuccessMsg}</span>
          </div>
        )}

        {/* View Switcher: Assigned Work Orders vs Worker Profile */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center space-x-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            <button
              id="btn-worker-view-tasks"
              onClick={() => setMainView('tasks')}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-2 transition cursor-pointer ${
                mainView === 'tasks'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Wrench className="w-4 h-4 text-emerald-400" />
              <span>Assigned Work Orders</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                mainView === 'tasks' ? 'bg-slate-800 text-emerald-300' : 'bg-slate-200 text-slate-700'
              }`}>
                {activeCount} Active
              </span>
            </button>

            <button
              id="btn-worker-view-profile"
              onClick={() => setMainView('profile')}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-2 transition cursor-pointer ${
                mainView === 'profile'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <User className="w-4 h-4 text-amber-400" />
              <span>Worker Profile & Performance</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                mainView === 'profile' ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {userProfile?.employeeId || 'EMP-WRK'}
              </span>
            </button>
          </div>

          <div className="hidden sm:flex items-center space-x-2 text-xs text-slate-500 font-semibold pr-3">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Field Dispatch GPS Synced</span>
          </div>
        </div>

        {mainView === 'profile' ? (
          <UserProfileView role="worker" userTasks={tasks} />
        ) : (
          <>
            {/* Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Dispatched</p>
                  <p className="text-2xl font-black text-slate-900 mt-1">{tasks.length}</p>
                </div>
                <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                  <Tag className="w-4 h-4" />
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-xs bg-amber-50/20 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Active Field Tasks</p>
                  <p className="text-2xl font-black text-amber-600 mt-1">{activeCount}</p>
                </div>
                <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700">
                  <Clock className="w-4 h-4" />
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-purple-200 shadow-xs bg-purple-50/20 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-purple-700 uppercase tracking-wider">Awaiting Verification</p>
                  <p className="text-2xl font-black text-purple-600 mt-1">{pendingVerifyCount}</p>
                </div>
                <div className="w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center text-purple-700">
                  <FileCheck2 className="w-4 h-4" />
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-xs bg-emerald-50/20 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Verified Completed</p>
                  <p className="text-2xl font-black text-emerald-600 mt-1">{completedCount}</p>
                </div>
                <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
            </div>

        {/* Task List Section */}
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
          {/* Filter Bar */}
          <div className="p-4 sm:px-6 border-b border-slate-200 bg-slate-50/60 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-2">
              <h2 className="font-bold text-slate-900 text-sm">Assigned Field Roster</h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-semibold">
                {filteredTasks.length}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <button
                onClick={() => setFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                  filter === 'ALL'
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                All Tasks ({tasks.length})
              </button>
              <button
                onClick={() => setFilter('ACTIVE')}
                className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                  filter === 'ACTIVE'
                    ? 'bg-amber-600 text-white'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                Active ({activeCount})
              </button>
              <button
                onClick={() => setFilter('PENDING_VERIFICATION')}
                className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                  filter === 'PENDING_VERIFICATION'
                    ? 'bg-purple-700 text-white'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                Pending Officer Review ({pendingVerifyCount})
              </button>
              <button
                onClick={() => setFilter('COMPLETED')}
                className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                  filter === 'COMPLETED'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                Completed ({completedCount})
              </button>
            </div>
          </div>

          {/* List Content */}
          {loading ? (
            <div className="p-12 text-center text-slate-400">
              <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mx-auto mb-2" />
              <p className="text-xs font-semibold">Syncing field tasks...</p>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <Wrench className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-800 text-sm">No Tasks Found</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                {filter === 'ALL'
                  ? "You currently have no tasks assigned to your worker profile."
                  : "No tasks matching this filter status."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {filteredTasks.map((task) => {
                const isUpdating = updatingTaskId === task.id;
                const sla = calculateSLAMetrics(task);

                return (
                  <div key={task.id} className="p-5 hover:bg-slate-50/70 transition space-y-3 text-xs">
                    {/* Re-Work Alert Banner */}
                    {task.status === 'Re-Work Required' && (
                      <div className="bg-rose-50 border border-rose-300 rounded-xl p-3 flex items-start space-x-2 text-rose-950">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-xs">Officer Requested Re-Work:</p>
                          <p className="text-[11px] text-rose-800 mt-0.5">
                            "{task.reworkFeedback || 'Resolution was not satisfactory. Please inspect and rectify.'}"
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-xs">
                          {task.id}
                        </span>
                        <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded flex items-center space-x-1 text-[11px]">
                          <Tag className="w-3 h-3 text-slate-500" />
                          <span>{task.category}</span>
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          task.priority === 'Emergency' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {task.priority || 'Medium'} Priority
                        </span>
                      </div>

                      {/* Status & SLA Timer */}
                      <div className="flex items-center space-x-2">
                        {task.status !== 'Completed' && task.status !== 'Pending Verification' && (
                          <div className={`flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-bold ${sla.badgeBg}`}>
                            <Clock className="w-3 h-3" />
                            <span>{sla.isOverdue ? `Overdue by ${(sla.hoursElapsed - sla.slaHours).toFixed(1)}h` : `${sla.hoursRemaining.toFixed(1)}h left`}</span>
                          </div>
                        )}

                        {task.status === 'Assigned' && (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">
                            Assigned &bull; Ready to Start
                          </span>
                        )}
                        {task.status === 'In Progress' && (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-300 flex items-center space-x-1">
                            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                            <span>In Progress</span>
                          </span>
                        )}
                        {task.status === 'Pending Verification' && (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-300">
                            Awaiting Officer Review
                          </span>
                        )}
                        {task.status === 'Completed' && (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            ✓ Verified Completed
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Task Title & Description */}
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{task.title}</h3>
                      <p className="text-xs text-slate-600 mt-0.5">{task.description}</p>
                    </div>

                    {/* Location & Citizen */}
                    <div className="flex flex-wrap items-center gap-3 text-slate-500 text-[11px]">
                      <div className="flex items-center space-x-1 text-slate-700 font-medium">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span>{task.location}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <User className="w-3 h-3 text-slate-400" />
                        <span>Citizen: {task.citizenName}</span>
                      </div>
                      {task.verifiedBy && (
                        <div className="flex items-center space-x-1 text-emerald-700 font-semibold">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Verified by: {task.verifiedBy}</span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="pt-2 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="text-[11px] text-slate-500 flex items-center space-x-1">
                        <span>Workflow:</span>
                        <span className={task.status === 'Assigned' ? 'font-bold text-blue-700' : ''}>Assigned</span>
                        <span>&rarr;</span>
                        <span className={task.status === 'In Progress' ? 'font-bold text-indigo-700' : ''}>In Progress</span>
                        <span>&rarr;</span>
                        <span className={task.status === 'Pending Verification' ? 'font-bold text-purple-700' : ''}>Review</span>
                        <span>&rarr;</span>
                        <span className={task.status === 'Completed' ? 'font-bold text-emerald-700' : ''}>Completed</span>
                      </div>

                      <div>
                        {task.status === 'Assigned' && (
                          <button
                            id={`btn-start-work-${task.id}`}
                            disabled={isUpdating}
                            onClick={() => handleStartWork(task.id)}
                            className="w-full sm:w-auto px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-xs transition flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
                          >
                            <Play className="w-3 h-3 fill-white" />
                            <span>{isUpdating ? 'Starting...' : 'Start Work'}</span>
                          </button>
                        )}

                        {(task.status === 'In Progress' || task.status === 'Re-Work Required') && (
                          <button
                            id={`btn-submit-verification-${task.id}`}
                            onClick={() => handleOpenSubmitModal(task)}
                            className="w-full sm:w-auto px-4 py-1.5 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-lg shadow-xs transition flex items-center justify-center space-x-1.5 cursor-pointer"
                          >
                            <Send className="w-3 h-3" />
                            <span>Submit for Officer Verification</span>
                          </button>
                        )}

                        {task.status === 'Pending Verification' && (
                          <div className="flex items-center space-x-1.5 text-purple-800 bg-purple-50 px-3 py-1 rounded-lg border border-purple-200 font-bold text-[11px]">
                            <FileCheck2 className="w-3.5 h-3.5 text-purple-600" />
                            <span>Submitted &bull; Waiting for Officer Inspection</span>
                          </div>
                        )}

                        {task.status === 'Completed' && (
                          <div className="flex items-center space-x-1 text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200 font-bold text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Officially Verified & Closed</span>
                          </div>
                        )}
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>
        </>
      )}

      </div>

      {/* Resolution Submission Dialog */}
      {submittingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden my-8">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileCheck2 className="w-5 h-5 text-purple-400" />
                <div>
                  <h3 className="font-bold text-sm">Submit Task for Verification</h3>
                  <p className="text-[10px] text-slate-400">Grievance #{submittingTask.id}</p>
                </div>
              </div>
              <button 
                onClick={() => setSubmittingTask(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmSubmitVerification} className="p-4 space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="font-bold text-slate-900">{submittingTask.title}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{submittingTask.location} &bull; {submittingTask.category}</p>
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Resolution Summary & Field Report:
                </label>
                <textarea
                  required
                  rows={3}
                  value={resolutionNotes}
                  onChange={e => setResolutionNotes(e.target.value)}
                  placeholder="Describe actions taken to rectify this grievance..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-purple-600 outline-hidden"
                />
              </div>

              <div className="pt-2 border-t border-slate-200 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setSubmittingTask(null)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingVerification || !resolutionNotes.trim()}
                  className="px-4 py-1.5 rounded-lg bg-purple-700 hover:bg-purple-800 text-white font-bold flex items-center space-x-1.5 disabled:opacity-50"
                >
                  {isSubmittingVerification ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Send to Officer</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
