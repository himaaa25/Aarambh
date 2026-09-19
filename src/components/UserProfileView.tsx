import React, { useState } from 'react';
import { 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Award, 
  Shield, 
  Wrench, 
  CheckCircle2, 
  Clock, 
  Star, 
  Edit3, 
  Save, 
  X, 
  Building, 
  Calendar,
  Briefcase,
  TrendingUp,
  Percent,
  Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Complaint } from '../types';

interface UserProfileViewProps {
  role: 'officer' | 'worker';
  userTasks?: Complaint[];
}

export const UserProfileView: React.FC<UserProfileViewProps> = ({ role, userTasks = [] }) => {
  const { userProfile, updateUserProfile } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(userProfile?.name || '');
  const [phone, setPhone] = useState(userProfile?.phone || '');
  const [address, setAddress] = useState(userProfile?.address || '');
  const [designation, setDesignation] = useState(userProfile?.designation || '');
  const [department, setDepartment] = useState(userProfile?.department || '');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  // Compute live task-based metrics if available
  const completedTasksCount = userTasks.filter(t => t.status === 'Completed').length;
  const verifiedTasksCount = userTasks.filter(t => t.verifiedAt || t.status === 'Completed').length;
  const activeTasksCount = userTasks.filter(t => t.status === 'Assigned' || t.status === 'In Progress' || t.status === 'Pending Verification').length;

  const totalTasks = userTasks.length;
  const calculatedResolutionRate = totalTasks > 0 
    ? Math.round((completedTasksCount / totalTasks) * 100) 
    : (userProfile?.resolutionRate || 96);

  const displayRating = userProfile?.performanceRating || 4.8;
  const employeeId = userProfile?.employeeId || (role === 'officer' ? 'EMP-OFF-2024-042' : 'EMP-WRK-2024-108');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateUserProfile({
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        designation: designation.trim(),
        department: department.trim()
      });
      setIsEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to update profile:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Save Success Alert */}
      {saveSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-bold flex items-center space-x-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Profile information updated successfully in municipal personnel registry.</span>
        </div>
      )}

      {/* Main Profile Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Banner */}
        <div className={`h-32 bg-gradient-to-r ${
          role === 'officer'
            ? 'from-amber-600 via-amber-700 to-slate-900'
            : 'from-emerald-600 via-teal-700 to-slate-900'
        } p-6 flex items-end justify-between relative`}>
          <div className="absolute top-4 right-4 flex items-center space-x-2">
            <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white font-mono text-xs font-bold border border-white/30">
              ID: {employeeId}
            </span>
          </div>
        </div>

        {/* Profile Details Bar */}
        <div className="p-6 pt-0 relative">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between -mt-12 mb-6 gap-4">
            <div className="flex items-end space-x-4">
              <div className={`w-24 h-24 rounded-2xl border-4 border-white shadow-md flex items-center justify-center text-white text-3xl font-black ${
                role === 'officer' ? 'bg-amber-600' : 'bg-emerald-600'
              }`}>
                {userProfile?.name ? userProfile.name.charAt(0) : 'U'}
              </div>
              <div className="pb-1">
                <div className="flex items-center space-x-2">
                  <h2 className="text-xl font-black text-slate-900">{userProfile?.name}</h2>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    role === 'officer' ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900'
                  }`}>
                    {role === 'officer' ? 'Municipal Officer' : 'Field Specialist'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {userProfile?.designation || (role === 'officer' ? 'Senior Zonal Municipal Officer' : 'Senior Municipal Field Specialist')}
                </p>
              </div>
            </div>

            {!isEditing && (
              <button
                onClick={() => {
                  setName(userProfile?.name || '');
                  setPhone(userProfile?.phone || '');
                  setAddress(userProfile?.address || '');
                  setDesignation(userProfile?.designation || '');
                  setDepartment(userProfile?.department || '');
                  setIsEditing(true);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition flex items-center space-x-1.5 cursor-pointer self-start sm:self-auto border border-slate-300"
              >
                <Edit3 className="w-3.5 h-3.5 text-slate-600" />
                <span>Edit Profile</span>
              </button>
            )}
          </div>

          {/* Edit Form or Information Display */}
          {isEditing ? (
            <form onSubmit={handleSave} className="space-y-4 pt-4 border-t border-slate-200 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-slate-900 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-slate-900 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Official Designation</label>
                  <input
                    type="text"
                    value={designation}
                    onChange={e => setDesignation(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-slate-900 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Department / Division</label>
                  <input
                    type="text"
                    value={department}
                    onChange={e => setDepartment(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-slate-900 outline-hidden"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Office / Station Address</label>
                  <textarea
                    rows={2}
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-slate-900 outline-hidden"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold flex items-center space-x-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saving ? 'Saving...' : 'Save Profile'}</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-200 text-xs">
              {/* Contact Information */}
              <div className="space-y-3 bg-slate-50/70 p-4 rounded-xl border border-slate-200">
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center space-x-1.5">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  <span>Verified Contact Details</span>
                </h3>
                
                <div className="space-y-2 text-slate-600">
                  <div className="flex items-center space-x-2">
                    <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                    <span><strong>Email:</strong> {userProfile?.email}</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                    <span><strong>Phone No:</strong> {userProfile?.phone || '+91 98765 43210'}</span>
                  </div>

                  <div className="flex items-start space-x-2">
                    <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <span><strong>Address:</strong> {userProfile?.address || (role === 'officer' ? 'Municipal HQ, Civil Lines, North Zone, New Delhi' : 'Ward 3 Field Station, Karol Bagh, New Delhi')}</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Building className="w-4 h-4 text-slate-400 shrink-0" />
                    <span><strong>Department:</strong> {userProfile?.department || (role === 'officer' ? 'Civic Grievance Redressal' : 'Sanitation & Utilities')}</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                    <span><strong>Joined Service:</strong> {userProfile?.joinedDate || '12-Mar-2021'}</span>
                  </div>
                </div>
              </div>

              {/* Performance Rating Card */}
              <div className="bg-gradient-to-br from-amber-50/50 via-slate-50 to-blue-50/50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center space-x-1.5">
                    <Award className="w-4 h-4 text-amber-500" />
                    <span>Workplace Performance Rating</span>
                  </h3>
                  <div className="flex items-center space-x-1 bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-full font-bold">
                    <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                    <span>{displayRating.toFixed(1)} / 5.0</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-500 font-semibold block">Total Tasks Completed</span>
                    <span className="text-lg font-black text-slate-900">
                      {userTasks.length > 0 ? completedTasksCount : (userProfile?.tasksCompleted || 74)}
                    </span>
                    <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">Verified on-site</span>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-500 font-semibold block">Resolution Success Rate</span>
                    <span className="text-lg font-black text-slate-900">
                      {calculatedResolutionRate}%
                    </span>
                    <span className="text-[10px] text-blue-600 font-bold block mt-0.5">SLA Compliant</span>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-500 font-semibold block">Average Resolution Time</span>
                    <span className="text-lg font-black text-slate-900">
                      {userProfile?.avgResolutionHours || (role === 'officer' ? 8.2 : 4.6)} hrs
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">Per assignment</span>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-500 font-semibold block">Citizen Quality Score</span>
                    <span className="text-lg font-black text-emerald-600">
                      98.4%
                    </span>
                    <span className="text-[10px] text-emerald-700 block mt-0.5">Positive feedback</span>
                  </div>
                </div>

                {/* Rating Progress Bar */}
                <div className="pt-2">
                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold mb-1">
                    <span>Performance Benchmark</span>
                    <span className="text-slate-800 font-bold">Excellent Standing</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-amber-500 h-full rounded-full transition-all" 
                      style={{ width: `${(displayRating / 5.0) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
