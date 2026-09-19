import React, { useState, useEffect } from 'react';
import { 
  PlusCircle, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  MapPin, 
  Tag, 
  User, 
  Calendar, 
  Wrench,
  ChevronRight,
  Filter,
  X,
  FileText
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Complaint, ComplaintStatus } from '../types';
import { createComplaint, subscribeCitizenComplaints } from '../services/complaintService';
import { UnauthorizedBanner } from './UnauthorizedBanner';

export const CitizenDashboard: React.FC = () => {
  const { userProfile, currentUser } = useAuth();

  // Strict role enforcement: ONLY citizens are permitted to view and use this dashboard
  if (userProfile && userProfile.role !== 'citizen') {
    return <UnauthorizedBanner attemptedRole="citizen" />;
  }

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  
  // New Complaint Form Modal State
  const [showModal, setShowModal] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  
  // Form fields
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<Complaint['category']>('Waste Management');
  const [location, setLocation] = useState('Ward 1 - Central Zone');
  const [description, setDescription] = useState('');

  const citizenId = userProfile?.uid || currentUser?.uid || '';
  const citizenName = userProfile?.name || 'Citizen';
  const citizenEmail = userProfile?.email || '';

  // Real-time subscription to citizen complaints
  useEffect(() => {
    if (!citizenId) return;
    setLoading(true);
    const unsubscribe = subscribeCitizenComplaints(citizenId, (items) => {
      setComplaints(items);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [citizenId]);

  const handleCreateComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !location.trim()) {
      setFormError('Please complete all required fields.');
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      await createComplaint({
        citizenId,
        citizenName,
        citizenEmail,
        title: title.trim(),
        category,
        location: location.trim(),
        description: description.trim()
      });
      // Reset form
      setTitle('');
      setDescription('');
      setShowModal(false);
    } catch (err: any) {
      setFormError(err.message || 'Failed to submit grievance. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: ComplaintStatus) => {
    switch (status) {
      case 'Submitted':
        return {
          bg: 'bg-amber-100 text-amber-800 border-amber-300',
          dot: 'bg-amber-500',
          text: 'Submitted • Pending Review'
        };
      case 'Assigned':
        return {
          bg: 'bg-blue-100 text-blue-800 border-blue-300',
          dot: 'bg-blue-500',
          text: 'Assigned to Field Worker'
        };
      case 'In Progress':
        return {
          bg: 'bg-indigo-100 text-indigo-800 border-indigo-300',
          dot: 'bg-indigo-500',
          text: 'In Progress • Work Ongoing'
        };
      case 'Pending Verification':
        return {
          bg: 'bg-purple-100 text-purple-800 border-purple-300',
          dot: 'bg-purple-500',
          text: 'Work Finished • Officer Inspecting'
        };
      case 'Re-Work Required':
        return {
          bg: 'bg-rose-100 text-rose-800 border-rose-300',
          dot: 'bg-rose-500',
          text: 'Quality Re-Work Ongoing'
        };
      case 'Completed':
      default:
        return {
          bg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
          dot: 'bg-emerald-500',
          text: 'Completed • Resolved'
        };
    }
  };

  // Filter complaints
  const filteredComplaints = complaints.filter(c => {
    if (filterStatus === 'ACTIVE') return c.status !== 'Completed';
    if (filterStatus === 'RESOLVED') return c.status === 'Completed';
    return true;
  });

  const totalCount = complaints.length;
  const activeCount = complaints.filter(c => c.status !== 'Completed').length;
  const resolvedCount = complaints.filter(c => c.status === 'Completed').length;

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header & Metrics */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-bold tracking-wider uppercase text-blue-600 mb-1">
              <User className="w-4 h-4" />
              <span>Citizen Grievance Redressal Portal</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900">
              Welcome, {citizenName}
            </h1>
            <p className="text-sm text-slate-600">
              Log civic municipal issues in your ward and track their real-time resolution by municipal workers.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              id="btn-open-new-complaint"
              onClick={() => setShowModal(true)}
              className="flex items-center space-x-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm rounded-xl shadow-sm transition cursor-pointer"
            >
              <PlusCircle className="w-5 h-5" />
              <span>Register New Grievance</span>
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Grievances</p>
              <p className="text-2xl font-black text-slate-900 mt-1">{totalCount}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
              <FileText className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">In Progress / Active</p>
              <p className="text-2xl font-black text-amber-600 mt-1">{activeCount}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Resolved</p>
              <p className="text-2xl font-black text-emerald-600 mt-1">{resolvedCount}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Complaints List Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Filter Bar */}
          <div className="p-4 sm:px-6 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
            <div className="flex items-center space-x-2">
              <h2 className="font-bold text-slate-900 text-base">My Submitted Grievances</h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-semibold">
                {filteredComplaints.length}
              </span>
            </div>

            <div className="flex items-center space-x-2 text-xs">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <button
                id="filter-all"
                onClick={() => setFilterStatus('ALL')}
                className={`px-3 py-1.5 rounded-lg font-medium transition ${
                  filterStatus === 'ALL'
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                All
              </button>
              <button
                id="filter-active"
                onClick={() => setFilterStatus('ACTIVE')}
                className={`px-3 py-1.5 rounded-lg font-medium transition ${
                  filterStatus === 'ACTIVE'
                    ? 'bg-amber-600 text-white'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                Active
              </button>
              <button
                id="filter-resolved"
                onClick={() => setFilterStatus('RESOLVED')}
                className={`px-3 py-1.5 rounded-lg font-medium transition ${
                  filterStatus === 'RESOLVED'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                Resolved
              </button>
            </div>
          </div>

          {/* List Content */}
          {loading ? (
            <div className="p-12 text-center text-slate-400">
              <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-sm font-medium">Syncing grievances from Firebase Firestore...</p>
            </div>
          ) : filteredComplaints.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-800 text-sm">No Grievances Found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {filterStatus === 'ALL' 
                  ? "You haven't logged any municipal complaints yet. Click 'Register New Grievance' to report an issue in your locality."
                  : "No complaints matching this filter status."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {filteredComplaints.map((item) => {
                const statusBadge = getStatusBadge(item.status);
                return (
                  <div key={item.id} className="p-6 hover:bg-slate-50/70 transition space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          {item.id}
                        </span>
                        <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded flex items-center space-x-1">
                          <Tag className="w-3 h-3 text-slate-500" />
                          <span>{item.category}</span>
                        </span>
                      </div>
                      
                      <div className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold border ${statusBadge.bg}`}>
                        <span className={`w-2 h-2 rounded-full ${statusBadge.dot}`}></span>
                        <span>{statusBadge.text}</span>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-slate-900">{item.title}</h3>
                      <p className="text-sm text-slate-600 mt-1">{item.description}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                      <div className="flex items-center space-x-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{item.location}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>Reported on {new Date(item.createdAt).toLocaleDateString()} at {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>

                    {/* Dynamic Lifecycle Progression Tracker */}
                    <div className="mt-3 p-3.5 rounded-xl bg-slate-100/80 border border-slate-200">
                      <div className="flex items-center justify-between text-xs font-semibold mb-2 text-slate-700">
                        <span>Municipal Resolution Progress</span>
                        {item.assignedWorkerName && (
                          <span className="text-indigo-700 flex items-center space-x-1 font-bold">
                            <Wrench className="w-3.5 h-3.5" />
                            <span>Assigned Field Specialist: {item.assignedWorkerName}</span>
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-4 gap-2 text-center text-[11px] font-medium">
                        <div className={`p-1.5 rounded ${
                          ['Submitted', 'Assigned', 'In Progress', 'Completed'].includes(item.status)
                            ? 'bg-amber-100 text-amber-900 font-bold border border-amber-300'
                            : 'bg-slate-200 text-slate-500'
                        }`}>
                          1. Submitted
                        </div>
                        <div className={`p-1.5 rounded ${
                          ['Assigned', 'In Progress', 'Completed'].includes(item.status)
                            ? 'bg-blue-100 text-blue-900 font-bold border border-blue-300'
                            : 'bg-slate-200 text-slate-500'
                        }`}>
                          2. Worker Assigned
                        </div>
                        <div className={`p-1.5 rounded ${
                          ['In Progress', 'Completed'].includes(item.status)
                            ? 'bg-indigo-100 text-indigo-900 font-bold border border-indigo-300'
                            : 'bg-slate-200 text-slate-500'
                        }`}>
                          3. In Progress
                        </div>
                        <div className={`p-1.5 rounded ${
                          item.status === 'Completed'
                            ? 'bg-emerald-100 text-emerald-900 font-bold border border-emerald-300'
                            : 'bg-slate-200 text-slate-500'
                        }`}>
                          4. Resolved
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* New Complaint Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center space-x-2">
                <PlusCircle className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-slate-900 text-base">Register Municipal Grievance</h3>
              </div>
              <button
                id="btn-close-modal"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateComplaint} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200 flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Complaint Headline / Title *
                </label>
                <input
                  id="input-complaint-title"
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Broken water supply valve flooding residential street"
                  className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Municipal Category *
                  </label>
                  <select
                    id="select-complaint-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none bg-white"
                  >
                    <option value="Waste Management">Waste Management</option>
                    <option value="Road Repair">Road Repair</option>
                    <option value="Water Supply">Water Supply</option>
                    <option value="Street Lighting">Street Lighting</option>
                    <option value="Drainage & Sewerage">Drainage & Sewerage</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Ward / Locality *
                  </label>
                  <select
                    id="select-complaint-location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none bg-white"
                  >
                    <option value="Ward 1 - Central Zone">Ward 1 - Central Zone</option>
                    <option value="Ward 2 - North Zone">Ward 2 - North Zone</option>
                    <option value="Ward 3 - East Zone">Ward 3 - East Zone</option>
                    <option value="Ward 4 - West Zone">Ward 4 - West Zone</option>
                    <option value="Ward 5 - South Zone">Ward 5 - South Zone</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Detailed Description *
                </label>
                <textarea
                  id="textarea-complaint-desc"
                  rows={4}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide landmark details, severity, and any hazards to pedestrians or motorists..."
                  className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                ></textarea>
              </div>

              <div className="pt-3 flex items-center justify-end space-x-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  id="btn-submit-complaint"
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-sm font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl shadow-sm transition disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Submitting to Firestore...' : 'Submit Grievance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
