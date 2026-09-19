import React from 'react';
import { 
  Building2, 
  LogOut, 
  User, 
  Shield, 
  Wrench, 
  Lock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

export const Navbar: React.FC = () => {
  const { userProfile, logout } = useAuth();

  const getRoleBadge = (role?: UserRole) => {
    switch (role) {
      case 'officer':
        return {
          label: 'Municipal Officer',
          portalTitle: 'Officer Redressal & Workforce Allocation Portal',
          bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
          icon: Shield
        };
      case 'worker':
        return {
          label: 'Field Worker',
          portalTitle: 'Field Worker Task Execution Portal',
          bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
          icon: Wrench
        };
      case 'citizen':
      default:
        return {
          label: 'Citizen',
          portalTitle: 'Citizen Grievance Submission Portal',
          bg: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
          icon: User
        };
    }
  };

  const badge = getRoleBadge(userProfile?.role);
  const BadgeIcon = badge.icon;

  return (
    <header className="bg-slate-900 text-white shadow-md border-b border-slate-800 sticky top-0 z-40">
      {/* Top Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Municipal Branding */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 font-bold shadow-sm">
              <Building2 className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-black text-lg tracking-wider text-amber-400">आरम्भ • AARAMBH</span>
                <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700 hidden sm:inline-block">
                  Smart Municipal System
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden md:block">
                {badge.portalTitle}
              </p>
            </div>
          </div>

          {/* Right Side: Profile & Strict Role Badge & Logout */}
          {userProfile && (
            <div className="flex items-center space-x-3">
              {/* Access Lock & Active Role Badge */}
              <div className="flex items-center space-x-2 bg-slate-800/90 px-3 py-1.5 rounded-lg border border-slate-700">
                <div className={`px-2.5 py-1 text-xs font-semibold rounded-md border flex items-center space-x-1.5 ${badge.bg}`}>
                  <BadgeIcon className="w-3.5 h-3.5" />
                  <span>{badge.label}</span>
                </div>
                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-xs font-bold text-slate-200">
                    {userProfile.name}
                  </span>
                  <span className="text-[10px] text-slate-400 flex items-center space-x-1">
                    <Lock className="w-2.5 h-2.5 text-amber-400" />
                    <span>Restricted to {badge.label} Portal</span>
                  </span>
                </div>
              </div>

              {/* Logout Button */}
              <button
                id="btn-nav-logout"
                onClick={() => logout()}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-red-950/40 text-slate-300 hover:text-red-400 text-xs font-medium transition border border-slate-700 hover:border-red-800/60"
                title="Sign out of current account"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
