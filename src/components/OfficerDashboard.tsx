import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Users, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Wrench, 
  MapPin, 
  Tag, 
  Search, 
  ArrowRight, 
  Sparkles,
  ShieldCheck,
  RotateCcw,
  Loader2,
  Calendar,
  AlertCircle,
  PhoneCall,
  Phone,
  User,
  PlusCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Complaint, ComplaintStatus, WorkerProfile } from '../types';
import { 
  subscribeAllComplaints, 
  batchApplyAIAssignments 
} from '../services/complaintService';
import { subscribeWorkers } from '../services/workerService';
import { 
  calculateSLAMetrics, 
  autoAssignPendingComplaintsWithAI 
} from '../services/aiMatchingService';
import { UnauthorizedBanner } from './UnauthorizedBanner';
import { AIMatchModal } from './AIMatchModal';
import { ReassignModal } from './ReassignModal';
import { VerificationModal } from './VerificationModal';
import { UserProfileView } from './UserProfileView';
import { ManualComplaintForm } from './ManualComplaintForm';

export const OfficerDashboard: React.FC = () => {
  const { userProfile } = useAuth();

  // Strict role enforcement
  if (userProfile && userProfile.role !== 'officer') {
    return <UnauthorizedBanner attemptedRole="officer" />;
  }

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [workers, setWorkers] = useState<WorkerProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Main view navigation: 'tasks' | 'manual-intake' | 'profile'
  const [mainView, setMainView] = useState<'tasks' | 'manual-intake' | 'profile'>('tasks');

  // Filtering & Tab state
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'all' | 'unassigned' | 'overdue' | 'verification' | 'completed'>('all');

  // Modals state
  const [aiMatchComplaint, setAiMatchComplaint] = useState<Complaint | null>(null);
  const [reassignComplaint, setReassignComplaint] = useState<Complaint | null>(null);
  const [verifyComplaint, setVerifyComplaint] = useState<Complaint | null>(null);

  // Batch AI Auto-Assign state
  const [batchAssigning, setBatchAssigning] = useState<boolean>(false);
  const [notificationMsg, setNotificationMsg] = useState<{ type: 'success' | 'info'; text: string } | null>(null);

  // Subscriptions
  useEffect(() => {
    setLoading(true);
    const unsubComplaints = subscribeAllComplaints((items) => {
      setComplaints(items);
      setLoading(false);
    });

    const unsubWorkers = subscribeWorkers((workerItems) => {
      setWorkers(workerItems);
    });

    return () => {
      unsubComplaints();
      unsubWorkers();
    };
  }, []);

  // SLA calculations & metrics
  const unassignedComplaints = complaints.filter(c => c.status === 'Submitted');
  const inProgressComplaints = complaints.filter(c => c.status === 'Assigned' || c.status === 'In Progress' || c.status === 'Re-Work Required');
  const pendingVerificationComplaints = complaints.filter(c => c.status === 'Pending Verification');
  const completedComplaints = complaints.filter(c => c.status === 'Completed');

  // Count overdue complaints
  const overdueComplaints = complaints.filter(c => {
    if (c.status === 'Completed' || c.status === 'Pending Verification' || c.status === 'Submitted') return false;
    const sla = calculateSLAMetrics(c);
    return sla.isOverdue;
  });

  // Batch AI Auto-Assignment Handler
  const handleBatchAutoAssign = async () => {
    if (unassignedComplaints.length === 0) {
      setNotificationMsg({ type: 'info', text: 'All complaints are already assigned to municipal workers!' });
      setTimeout(() => setNotificationMsg(null), 3000);
      return;
    }

    setBatchAssigning(true);
    try {
      const result = await autoAssignPendingComplaintsWithAI(unassignedComplaints, workers);
      if (result.assignments.length > 0) {
        await batchApplyAIAssignments(result.assignments);
        setNotificationMsg({
          type: 'success',
          text: `AI Engine matched & assigned ${result.assignments.length} unassigned tasks instantly based on skill, location & workload!`
        });
      }
    } catch (err: any) {
      console.error('Batch auto assign failed:', err);
    } finally {
      setBatchAssigning(false);
      setTimeout(() => setNotificationMsg(null), 5000);
    }
  };

  // Filter complaints based on Tab + dropdown filters + search
  const filteredComplaints = complaints.filter(c => {
    if (activeTab === 'unassigned' && c.status !== 'Submitted') return false;
    if (activeTab === 'overdue') {
      if (c.status === 'Completed' || c.status === 'Pending Verification' || c.status === 'Submitted') return false;
      const sla = calculateSLAMetrics(c);
      if (!sla.isOverdue) return false;
    }
    if (activeTab === 'verification' && c.status !== 'Pending Verification') return false;
    if (activeTab === 'completed' && c.status !== 'Completed') return false;

    if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
    if (categoryFilter !== 'ALL' && c.category !== categoryFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = c.title.toLowerCase().includes(q);
      const matchLoc = c.location.toLowerCase().includes(q);
      const matchCitizen = c.citizenName.toLowerCase().includes(q);
      const matchWorker = (c.assignedWorkerName || '').toLowerCase().includes(q);
      const matchId = c.id.toLowerCase().includes(q);
      if (!matchTitle && !matchLoc && !matchCitizen && !matchWorker && !matchId) return false;
    }
    return true;
  });

  const getStatusBadge = (status: ComplaintStatus) => {
    switch (status) {
      case 'Submitted':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'Assigned':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'In Progress':
        return 'bg-indigo-100 text-indigo-800 border-indigo-300';
      case 'Pending Verification':
        return 'bg-purple-100 text-purple-800 border-purple-300 font-extrabold';
      case 'Re-Work Required':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      case 'Completed':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header & Overview */}
        <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-bold tracking-wider uppercase text-amber-600 mb-1">
              <Shield className="w-4 h-4" />
              <span>Municipal Operations & Workforce Allocation</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900">
              Officer Portal — {userProfile?.name || 'Municipal Officer'}
            </h1>
            <p className="text-xs text-slate-600 mt-1 max-w-2xl">
              AI-driven workforce matching, real-time SLA delay tracking, task completion verification, and emergency reassignment controls.
            </p>
          </div>

          {/* AI Workforce Auto-Assignment Action */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              id="btn-ai-auto-assign-all"
              onClick={handleBatchAutoAssign}
              disabled={batchAssigning || unassignedComplaints.length === 0}
              className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-xl font-bold text-xs shadow-sm flex items-center space-x-2 transition disabled:opacity-50 cursor-pointer"
              title="Automatically match and assign all unassigned grievances with Gemini AI"
            >
              {batchAssigning ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>AI Matching Workforce...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>AI Auto-Assign ({unassignedComplaints.length} Pending)</span>
                </>
              )}
            </button>

            <div className="bg-slate-100 text-slate-700 px-3 py-2 rounded-xl text-xs font-semibold border border-slate-200 flex items-center space-x-1.5">
              <Users className="w-4 h-4 text-slate-500" />
              <span>{workers.length} Field Specialists Active</span>
            </div>
          </div>
        </div>

        {/* Global Toast Notification */}
        {notificationMsg && (
          <div className={`p-4 rounded-xl text-xs font-bold flex items-center space-x-2 shadow-xs transition ${
            notificationMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
              : 'bg-blue-50 text-blue-800 border border-blue-300'
          }`}>
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{notificationMsg.text}</span>
          </div>
        )}

        {/* View Switcher: Operations, Manual Intake, Profile */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center space-x-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            <button
              id="btn-officer-view-tasks"
              onClick={() => setMainView('tasks')}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-2 transition cursor-pointer ${
                mainView === 'tasks'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Shield className="w-4 h-4 text-amber-400" />
              <span>Grievance Operations</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                mainView === 'tasks' ? 'bg-slate-800 text-amber-300' : 'bg-slate-200 text-slate-700'
              }`}>
                {complaints.length}
              </span>
            </button>

            <button
              id="btn-officer-view-manual-intake"
              onClick={() => setMainView('manual-intake')}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-2 transition cursor-pointer ${
                mainView === 'manual-intake'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <PhoneCall className="w-4 h-4 text-amber-300" />
              <span>Log Offline / Call Grievance</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                mainView === 'manual-intake' ? 'bg-amber-700 text-white' : 'bg-amber-100 text-amber-900'
              }`}>
                Helpline Desk
              </span>
            </button>

            <button
              id="btn-officer-view-profile"
              onClick={() => setMainView('profile')}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-2 transition cursor-pointer ${
                mainView === 'profile'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <User className="w-4 h-4 text-blue-400" />
              <span>Officer Profile & Ratings</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                mainView === 'profile' ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {userProfile?.employeeId || 'EMP-OFF'}
              </span>
            </button>
          </div>

          <div className="hidden sm:flex items-center space-x-3 text-xs text-slate-500 font-semibold pr-3">
            <span className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Central Redressal Grid</span>
            </span>
          </div>
        </div>

        {/* View Content */}
        {mainView === 'manual-intake' ? (
          <ManualComplaintForm
            officerId={userProfile?.uid || 'officer-01'}
            officerName={userProfile?.name || 'Zonal Officer'}
            workers={workers}
            onSuccess={(created) => {
              setMainView('tasks');
              setActiveTab('all');
              setNotificationMsg({
                type: 'success',
                text: `Grievance #${created.id} registered successfully via ${created.sourceChannel || 'Helpline Desk'}! ${
                  created.assignedWorkerName 
                    ? `Auto-assigned to ${created.assignedWorkerName} via AI.` 
                    : 'Saved to unassigned queue.'
                }`
              });
              setTimeout(() => setNotificationMsg(null), 5000);
            }}
            onCancel={() => setMainView('tasks')}
          />
        ) : mainView === 'profile' ? (
          <UserProfileView role="officer" userTasks={complaints} />
        ) : (
          <>
            {/* Critical SLA Overdue Alert Banner (if delayed tasks exist) */}
            {overdueComplaints.length > 0 && (
              <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs">
                <div className="flex items-start sm:items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5 text-red-600 animate-bounce" />
                  </div>
                  <div>
                    <p className="font-extrabold text-sm text-red-950">
                      {overdueComplaints.length} Task{overdueComplaints.length > 1 ? 's are' : ' is'} Taking Too Long & Exceeding SLA!
                    </p>
                    <p className="text-red-700 mt-0.5">
                      Workers have not completed these within the required time window. Reassign immediately to prevent citizen escalations.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('overdue')}
                  className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs shadow-xs transition flex items-center space-x-1.5 self-start sm:self-center shrink-0"
                >
                  <span>View Delayed Tasks</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

        {/* Metrics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <div 
            onClick={() => setActiveTab('all')}
            className={`p-4 rounded-xl border cursor-pointer transition shadow-xs ${
              activeTab === 'all' ? 'bg-white border-blue-500 ring-2 ring-blue-500/20' : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Tasks</p>
            <div className="flex items-center justify-between mt-1">
              <p className="text-2xl font-black text-slate-900">{complaints.length}</p>
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                <Shield className="w-4 h-4" />
              </div>
            </div>
          </div>

          <div 
            onClick={() => setActiveTab('unassigned')}
            className={`p-4 rounded-xl border cursor-pointer transition shadow-xs ${
              activeTab === 'unassigned' ? 'bg-amber-50/70 border-amber-500 ring-2 ring-amber-500/20' : 'bg-white border-amber-200 hover:border-amber-300'
            }`}
          >
            <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Unassigned</p>
            <div className="flex items-center justify-between mt-1">
              <p className="text-2xl font-black text-amber-600">{unassignedComplaints.length}</p>
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>
          </div>

          <div 
            onClick={() => setActiveTab('overdue')}
            className={`p-4 rounded-xl border cursor-pointer transition shadow-xs ${
              activeTab === 'overdue' ? 'bg-red-50/70 border-red-500 ring-2 ring-red-500/20' : 'bg-white border-red-200 hover:border-red-300'
            }`}
          >
            <p className="text-[11px] font-bold text-red-700 uppercase tracking-wider">Overdue / Delayed</p>
            <div className="flex items-center justify-between mt-1">
              <p className="text-2xl font-black text-red-600">{overdueComplaints.length}</p>
              <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center text-red-700">
                <AlertCircle className="w-4 h-4" />
              </div>
            </div>
          </div>

          <div 
            onClick={() => setActiveTab('verification')}
            className={`p-4 rounded-xl border cursor-pointer transition shadow-xs ${
              activeTab === 'verification' ? 'bg-purple-50/70 border-purple-500 ring-2 ring-purple-500/20' : 'bg-white border-purple-200 hover:border-purple-300'
            }`}
          >
            <p className="text-[11px] font-bold text-purple-700 uppercase tracking-wider">Pending Verification</p>
            <div className="flex items-center justify-between mt-1">
              <p className="text-2xl font-black text-purple-700">{pendingVerificationComplaints.length}</p>
              <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center text-purple-700">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
          </div>

          <div 
            onClick={() => setActiveTab('completed')}
            className={`p-4 rounded-xl border cursor-pointer transition shadow-xs ${
              activeTab === 'completed' ? 'bg-emerald-50/70 border-emerald-500 ring-2 ring-emerald-500/20' : 'bg-white border-emerald-200 hover:border-emerald-300'
            }`}
          >
            <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Resolved</p>
            <div className="flex items-center justify-between mt-1">
              <p className="text-2xl font-black text-emerald-600">{completedComplaints.length}</p>
              <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>

        {/* Complaints Table & Filter System */}
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
          {/* Header & Filter Controls */}
          <div className="p-4 sm:px-6 border-b border-slate-200 bg-slate-50/70 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              {/* Category tabs */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                {[
                  { id: 'all', label: 'All Tasks', count: complaints.length },
                  { id: 'unassigned', label: 'Unassigned', count: unassignedComplaints.length },
                  { id: 'overdue', label: 'Delayed / Overdue SLA', count: overdueComplaints.length, isDanger: true },
                  { id: 'verification', label: 'Pending Verification', count: pendingVerificationComplaints.length, isPurple: true },
                  { id: 'completed', label: 'Completed', count: completedComplaints.length }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-3 py-1.5 rounded-lg font-bold text-xs transition flex items-center space-x-1.5 cursor-pointer ${
                      activeTab === tab.id
                        ? tab.isDanger 
                          ? 'bg-red-600 text-white shadow-xs' 
                          : tab.isPurple
                            ? 'bg-purple-700 text-white shadow-xs'
                            : 'bg-slate-900 text-white shadow-xs'
                        : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search ID, title, worker..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs outline-hidden focus:ring-1 focus:ring-slate-900 bg-white"
                  />
                </div>

                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs outline-hidden bg-white font-medium"
                >
                  <option value="ALL">All Categories</option>
                  <option value="Waste Management">Waste Management</option>
                  <option value="Road Repair">Road Repair</option>
                  <option value="Water Supply">Water Supply</option>
                  <option value="Street Lighting">Street Lighting</option>
                  <option value="Drainage & Sewerage">Drainage & Sewerage</option>
                </select>
              </div>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="p-12 text-center text-slate-400">
              <Loader2 className="w-8 h-8 text-amber-500 animate-spin mx-auto mb-2" />
              <p className="text-xs font-semibold">Syncing real-time municipal grievances...</p>
            </div>
          ) : filteredComplaints.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs">
              <p className="font-bold text-slate-700 text-sm">No complaints found in this category.</p>
              <p className="text-slate-400 mt-1">All tasks in this view are up-to-date.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3">ID & Citizen</th>
                    <th className="px-5 py-3">Task & Category</th>
                    <th className="px-5 py-3">Location & Priority</th>
                    <th className="px-5 py-3">SLA & Progress Monitor</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Assigned Worker</th>
                    <th className="px-5 py-3 text-right">Officer Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredComplaints.map((complaint) => {
                    const sla = calculateSLAMetrics(complaint);
                    const isOverdue = sla.isOverdue;

                    return (
                      <tr 
                        key={complaint.id} 
                        className={`transition ${
                          isOverdue ? 'bg-red-50/40 hover:bg-red-50/70' : 'hover:bg-slate-50/80'
                        }`}
                      >
                        {/* ID & Citizen */}
                        <td className="px-5 py-4">
                          <div className="font-mono font-bold text-slate-900">{complaint.id}</div>
                          <div className="text-slate-500 text-[11px] font-medium mt-0.5">{complaint.citizenName}</div>
                          {complaint.sourceChannel && complaint.sourceChannel !== 'Citizen App' && (
                            <div className="mt-1">
                              <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 font-bold text-[9px]">
                                <PhoneCall className="w-2.5 h-2.5 text-amber-700" />
                                <span>{complaint.sourceChannel}</span>
                              </span>
                            </div>
                          )}
                          {complaint.citizenPhone && (
                            <div className="text-[10px] text-slate-500 flex items-center space-x-1 mt-0.5">
                              <Phone className="w-2.5 h-2.5 text-slate-400" />
                              <span>{complaint.citizenPhone}</span>
                            </div>
                          )}
                          {complaint.reassignmentCount && complaint.reassignmentCount > 0 && (
                            <span className="inline-block mt-1 px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 font-bold text-[9px]">
                              Reassigned {complaint.reassignmentCount}x
                            </span>
                          )}
                        </td>

                        {/* Task Title & Category */}
                        <td className="px-5 py-4 max-w-xs">
                          <div className="font-bold text-slate-900 line-clamp-1">{complaint.title}</div>
                          <div className="text-slate-500 line-clamp-1 text-[11px] mt-0.5">{complaint.description}</div>
                          <div className="mt-1 flex items-center space-x-2">
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[10px]">
                              <Tag className="w-2.5 h-2.5 text-slate-400" />
                              <span>{complaint.category}</span>
                            </span>
                            {complaint.autoAssignedByAI && (
                              <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 font-extrabold text-[9px]">
                                <Sparkles className="w-2.5 h-2.5" />
                                <span>AI Matched</span>
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Location & Priority */}
                        <td className="px-5 py-4">
                          <div className="flex items-center space-x-1 text-slate-700 font-medium">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{complaint.location}</span>
                          </div>
                          <div className="mt-1">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              complaint.priority === 'Emergency'
                                ? 'bg-red-100 text-red-800 border border-red-200'
                                : complaint.priority === 'High'
                                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                  : 'bg-blue-100 text-blue-800'
                            }`}>
                              {complaint.priority || 'Medium'} Priority ({sla.slaHours}h SLA)
                            </span>
                          </div>
                        </td>

                        {/* SLA & Progress Monitor */}
                        <td className="px-5 py-4">
                          {complaint.status === 'Completed' ? (
                            <div className="flex items-center space-x-1.5 text-emerald-700 font-bold text-[11px]">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              <span>Verified & Closed</span>
                            </div>
                          ) : complaint.status === 'Pending Verification' ? (
                            <div className="flex items-center space-x-1.5 text-purple-700 font-bold text-[11px]">
                              <ShieldCheck className="w-4 h-4 text-purple-600" />
                              <span>Finished &bull; Awaiting Officer Sign-Off</span>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-[10px] font-bold">
                                <span className={sla.colorClass}>
                                  {isOverdue ? `DELAYED by ${(sla.hoursElapsed - sla.slaHours).toFixed(1)}h` : `${sla.hoursRemaining.toFixed(1)}h Remaining`}
                                </span>
                                <span className="text-slate-400">{sla.percentageElapsed}%</span>
                              </div>
                              <div className="w-28 bg-slate-200 h-1.5 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full transition-all ${
                                    isOverdue ? 'bg-red-600' : sla.isWarning ? 'bg-amber-500' : 'bg-emerald-500'
                                  }`} 
                                  style={{ width: `${Math.min(100, sla.percentageElapsed)}%` }} 
                                />
                              </div>
                              <span className={`inline-block px-1.5 py-0.2 rounded text-[9px] border font-semibold ${sla.badgeBg}`}>
                                {sla.statusLabel}
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-5 py-4">
                          <span className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-bold border ${getStatusBadge(complaint.status)}`}>
                            {complaint.status}
                          </span>
                        </td>

                        {/* Assigned Worker */}
                        <td className="px-5 py-4">
                          {complaint.assignedWorkerName ? (
                            <div className="space-y-0.5">
                              <div className="font-bold text-slate-900 flex items-center space-x-1">
                                <Wrench className="w-3 h-3 text-indigo-600" />
                                <span>{complaint.assignedWorkerName}</span>
                              </div>
                              {complaint.assignedAt && (
                                <div className="text-[10px] text-slate-400">
                                  Started: {new Date(complaint.assignedAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-amber-700 font-semibold italic text-[11px] bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              Needs Assignment
                            </span>
                          )}
                        </td>

                        {/* Action Buttons */}
                        <td className="px-5 py-4 text-right">
                          {complaint.status === 'Submitted' ? (
                            <button
                              id={`btn-ai-match-${complaint.id}`}
                              onClick={() => setAiMatchComplaint(complaint)}
                              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs flex items-center space-x-1.5 ml-auto transition cursor-pointer"
                              title="Evaluate workers with AI and assign"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                              <span>AI Smart Match</span>
                            </button>
                          ) : complaint.status === 'Pending Verification' ? (
                            <button
                              id={`btn-verify-${complaint.id}`}
                              onClick={() => setVerifyComplaint(complaint)}
                              className="px-3 py-1.5 rounded-lg bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold shadow-xs flex items-center space-x-1.5 ml-auto transition cursor-pointer"
                              title="Inspect completion proof and verify"
                            >
                              <ShieldCheck className="w-3.5 h-3.5 text-purple-200" />
                              <span>Inspect & Verify</span>
                            </button>
                          ) : (
                            <div className="flex items-center justify-end space-x-2">
                              {/* If overdue / taking too long or in progress, officer can reassign to another worker */}
                              <button
                                id={`btn-reassign-${complaint.id}`}
                                onClick={() => setReassignComplaint(complaint)}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1 cursor-pointer ${
                                  isOverdue
                                    ? 'bg-red-600 hover:bg-red-700 text-white shadow-xs animate-pulse'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300'
                                }`}
                                title={isOverdue ? 'Worker exceeded SLA! Reassign task immediately' : 'Reassign to another worker'}
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>{isOverdue ? 'Reassign (Delayed)' : 'Reassign'}</span>
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        </>
      )}

      </div>

      {/* AI Match Modal */}
      {aiMatchComplaint && (
        <AIMatchModal
          complaint={aiMatchComplaint}
          workers={workers}
          onClose={() => setAiMatchComplaint(null)}
          onSuccess={() => {
            setNotificationMsg({
              type: 'success',
              text: `Complaint #${aiMatchComplaint.id} has been matched and assigned successfully!`
            });
            setTimeout(() => setNotificationMsg(null), 4000);
          }}
        />
      )}

      {/* Reassign Modal for Delayed/Bottlenecked Tasks */}
      {reassignComplaint && (
        <ReassignModal
          complaint={reassignComplaint}
          workers={workers}
          onClose={() => setReassignComplaint(null)}
          onSuccess={() => {
            setNotificationMsg({
              type: 'success',
              text: `Task #${reassignComplaint.id} was successfully reassigned to a new field worker!`
            });
            setTimeout(() => setNotificationMsg(null), 4000);
          }}
        />
      )}

      {/* Verification Modal for Completed Tasks */}
      {verifyComplaint && (
        <VerificationModal
          complaint={verifyComplaint}
          officerName={userProfile?.name || 'Officer'}
          onClose={() => setVerifyComplaint(null)}
          onSuccess={() => {
            setNotificationMsg({
              type: 'success',
              text: `Task #${verifyComplaint.id} completion verified and officially closed!`
            });
            setTimeout(() => setNotificationMsg(null), 4000);
          }}
        />
      )}

    </div>
  );
};
