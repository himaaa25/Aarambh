import React from 'react';
import { ShieldAlert, ArrowLeft, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

interface UnauthorizedBannerProps {
  attemptedRole: UserRole;
}

export const UnauthorizedBanner: React.FC<UnauthorizedBannerProps> = ({ attemptedRole }) => {
  const { userProfile, logout } = useAuth();

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl p-8 border border-red-200 shadow-xl text-center space-y-4">
        <div className="w-14 h-14 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div>
          <h2 className="text-xl font-black text-slate-900">Access Denied</h2>
          <p className="text-xs font-bold uppercase tracking-wider text-red-600 mt-1">
            Unauthorized Dashboard Request
          </p>
        </div>

        <p className="text-sm text-slate-600">
          Your authenticated municipal role is <strong className="text-slate-900 capitalize">{userProfile?.role || 'Guest'}</strong>. 
          You are not authorized to view the <strong className="text-slate-900 capitalize">{attemptedRole}</strong> portal.
        </p>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
          <button
            onClick={() => window.location.reload()}
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go to My Dashboard</span>
          </button>
          <button
            onClick={() => logout()}
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl border border-slate-300 transition"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out & Switch Account</span>
          </button>
        </div>
      </div>
    </div>
  );
};
