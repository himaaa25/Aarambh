import React, { useState } from 'react';
import { 
  PhoneCall, 
  User, 
  MapPin, 
  Tag, 
  AlertTriangle, 
  Clock, 
  Sparkles, 
  FileText, 
  CheckCircle2, 
  Send, 
  Building, 
  FileEdit, 
  Loader2,
  ArrowRight,
  ShieldAlert,
  Phone
} from 'lucide-react';
import { 
  Complaint, 
  ComplaintPriority, 
  ComplaintSourceChannel, 
  WorkerProfile 
} from '../types';
import { createComplaint, assignWorkerToComplaint } from '../services/complaintService';
import { getAIMatchRecommendation } from '../services/aiMatchingService';

interface ManualComplaintFormProps {
  officerName: string;
  officerId: string;
  workers: WorkerProfile[];
  onSuccess: (complaint: Complaint) => void;
  onCancel: () => void;
}

export const ManualComplaintForm: React.FC<ManualComplaintFormProps> = ({
  officerName,
  officerId,
  workers,
  onSuccess,
  onCancel
}) => {
  // Source channel
  const [sourceChannel, setSourceChannel] = useState<ComplaintSourceChannel>('Helpline Phone Call');

  // Citizen details
  const [citizenName, setCitizenName] = useState('');
  const [citizenPhone, setCitizenPhone] = useState('');
  const [citizenEmail, setCitizenEmail] = useState('');
  const [citizenAddress, setCitizenAddress] = useState('');

  // Complaint details
  const [category, setCategory] = useState<'Waste Management' | 'Road Repair' | 'Water Supply' | 'Street Lighting' | 'Drainage & Sewerage'>('Water Supply');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [priority, setPriority] = useState<ComplaintPriority>('Medium');
  const [intakeNotes, setIntakeNotes] = useState('');

  // Assignment preference
  const [autoAssignWithAI, setAutoAssignWithAI] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // SLA hours based on priority
  const getSLAHours = (p: ComplaintPriority): number => {
    switch (p) {
      case 'Emergency': return 6;
      case 'High': return 12;
      case 'Medium': return 24;
      case 'Low': return 48;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!citizenName.trim() || !citizenPhone.trim() || !title.trim() || !description.trim() || !location.trim()) {
      setErrorMsg('Please fill in all required fields marked with *');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const slaHours = getSLAHours(priority);
      const email = citizenEmail.trim() 
        ? citizenEmail.trim() 
        : `${citizenName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'caller'}@helpline.aarambh.gov.in`;

      // 1. Create complaint
      const created = await createComplaint({
        citizenId: `offline-${Date.now()}`,
        citizenName: citizenName.trim(),
        citizenEmail: email,
        citizenPhone: citizenPhone.trim(),
        sourceChannel,
        intakeOfficerId: officerId,
        intakeOfficerName: officerName,
        intakeNotes: intakeNotes.trim() || undefined,
        title: title.trim(),
        category,
        description: description.trim(),
        location: location.trim(),
        priority,
        slaHours
      });

      // 2. If AI Auto-assign is selected, immediately find best worker
      if (autoAssignWithAI && workers.length > 0) {
        try {
          const match = await getAIMatchRecommendation(created, workers);
          if (match && match.bestWorkerId) {
            await assignWorkerToComplaint(
              created.id,
              match.bestWorkerId,
              match.bestWorkerName,
              match.confidence,
              match.aiReasoning
            );
            created.assignedWorkerId = match.bestWorkerId;
            created.assignedWorkerName = match.bestWorkerName;
            created.status = 'Assigned';
            created.autoAssignedByAI = true;
          }
        } catch (matchErr) {
          console.warn('AI matching failed for manual intake, logged as Submitted:', matchErr);
        }
      }

      onSuccess(created);
    } catch (err: any) {
      console.error('Manual complaint submission failed:', err);
      setErrorMsg(err.message || 'Failed to submit complaint. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Header */}
      <div className="bg-slate-900 text-white p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-amber-400 mb-1">
            <PhoneCall className="w-4 h-4" />
            <span>Municipal Offline & Phone Intake Desk</span>
          </div>
          <h2 className="text-xl font-black text-white">
            Log Manual / Offline Citizen Grievance
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Digitize complaints received through citizen telephone calls (Helpline 1916), in-person walk-ins, or physical memos.
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 text-slate-300">
          <User className="w-3.5 h-3.5 text-amber-400" />
          <span>Intake Officer: <strong>{officerName}</strong></span>
        </div>
      </div>

      {errorMsg && (
        <div className="m-6 p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs font-bold flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-6 space-y-6 text-xs">
        {/* Intake Channel Selector */}
        <div>
          <label className="block font-bold text-slate-800 mb-2">
            1. Grievance Intake Channel *
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: 'Helpline Phone Call', icon: PhoneCall, label: 'Helpline Call (1916)' },
              { id: 'In-Person Walk-in', icon: User, label: 'Citizen Desk Walk-in' },
              { id: 'Written Letter', icon: FileText, label: 'Physical Letter / Memo' },
              { id: 'Ward Inspection', icon: Building, label: 'Ward Site Inspection' }
            ].map(ch => {
              const Icon = ch.icon;
              const isSelected = sourceChannel === ch.id;
              return (
                <button
                  type="button"
                  key={ch.id}
                  onClick={() => setSourceChannel(ch.id as ComplaintSourceChannel)}
                  className={`p-3 rounded-xl border text-left flex items-center space-x-2.5 transition cursor-pointer ${
                    isSelected
                      ? 'border-amber-500 bg-amber-50/70 text-slate-900 font-bold shadow-xs ring-1 ring-amber-500'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isSelected ? 'text-amber-600' : 'text-slate-400'}`} />
                  <span className="text-xs">{ch.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Citizen Information Section */}
        <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-200 space-y-4">
          <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center space-x-1.5">
            <User className="w-3.5 h-3.5 text-slate-500" />
            <span>2. Complainant / Citizen Information</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Citizen Full Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Smt. Sunita Devi"
                value={citizenName}
                onChange={e => setCitizenName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-slate-900 outline-hidden bg-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Caller / Citizen Mobile Phone Number *
              </label>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="tel"
                  required
                  placeholder="+91 98765 43210"
                  value={citizenPhone}
                  onChange={e => setCitizenPhone(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-slate-900 outline-hidden bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Citizen Email Address (Optional)
              </label>
              <input
                type="email"
                placeholder="citizen@example.com"
                value={citizenEmail}
                onChange={e => setCitizenEmail(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-slate-900 outline-hidden bg-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Citizen Residential Address / Ward
              </label>
              <input
                type="text"
                placeholder="e.g. House No. 12, Block C, Ward 2"
                value={citizenAddress}
                onChange={e => setCitizenAddress(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-slate-900 outline-hidden bg-white"
              />
            </div>
          </div>
        </div>

        {/* Complaint Details Section */}
        <div className="space-y-4">
          <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center space-x-1.5">
            <FileEdit className="w-3.5 h-3.5 text-slate-500" />
            <span>3. Grievance Specifics & Incident Site</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Grievance Category *
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-slate-900 outline-hidden bg-white font-medium"
              >
                <option value="Waste Management">Waste Management & Garbage Dump</option>
                <option value="Road Repair">Road Repair & Pothole Patching</option>
                <option value="Water Supply">Water Supply & Pipeline Leakage</option>
                <option value="Street Lighting">Street Lighting & Electrical Pole</option>
                <option value="Drainage & Sewerage">Drainage & Sewerage Overflow</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Priority & SLA Timeline *
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { p: 'Emergency', time: '6h SLA', color: 'border-red-400 text-red-800 bg-red-50' },
                  { p: 'High', time: '12h SLA', color: 'border-amber-400 text-amber-800 bg-amber-50' },
                  { p: 'Medium', time: '24h SLA', color: 'border-blue-400 text-blue-800 bg-blue-50' },
                  { p: 'Low', time: '48h SLA', color: 'border-slate-300 text-slate-700 bg-slate-50' }
                ].map(item => (
                  <button
                    type="button"
                    key={item.p}
                    onClick={() => setPriority(item.p as ComplaintPriority)}
                    className={`py-1.5 px-2 rounded-lg border text-center transition cursor-pointer ${
                      priority === item.p
                        ? `${item.color} font-bold ring-1 ring-slate-900 shadow-xs`
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <p className="text-[11px] font-bold">{item.p}</p>
                    <p className="text-[9px] opacity-75">{item.time}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">
                Grievance Title / Summary *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Major water pipeline leakage flooding road near Sector 5 crossing"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-slate-900 outline-hidden bg-white"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">
                Incident Location & Landmark *
              </label>
              <div className="relative">
                <MapPin className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Ward 2 - North Zone, Opposite Community Hall, Main Market Road"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-slate-900 outline-hidden bg-white"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">
                Full Complaint Description (Reported by Citizen) *
              </label>
              <textarea
                required
                rows={3}
                placeholder="Detail what the citizen explained over the phone or at the desk..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-slate-900 outline-hidden bg-white"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">
                Officer Intake Notes & Complainant Remarks (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Complainant informed that water pressure in nearby houses has dropped to zero; requested urgent repair."
                value={intakeNotes}
                onChange={e => setIntakeNotes(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-slate-900 outline-hidden bg-white"
              />
            </div>
          </div>
        </div>

        {/* AI Workforce Dispatch Option */}
        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-4 rounded-xl border border-indigo-200 flex items-start space-x-3">
          <div className="pt-0.5">
            <input
              type="checkbox"
              id="chk-auto-assign"
              checked={autoAssignWithAI}
              onChange={e => setAutoAssignWithAI(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
            />
          </div>
          <label htmlFor="chk-auto-assign" className="cursor-pointer">
            <div className="flex items-center space-x-1.5 font-bold text-slate-900">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>Instantly Match & Assign to Best Municipal Specialist with AI</span>
            </div>
            <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
              When checked, Gemini AI will automatically evaluate all {workers.length} active field specialists based on skill matching, ward proximity, and workload, assigning the ticket immediately upon filing.
            </p>
          </label>
        </div>

        {/* Form Actions */}
        <div className="pt-4 border-t border-slate-200 flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold transition"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-xs transition flex items-center space-x-2 disabled:opacity-50 cursor-pointer"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Digitizing & Dispatching Grievance...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4 text-amber-400" />
                <span>Log & Save Grievance Online</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
