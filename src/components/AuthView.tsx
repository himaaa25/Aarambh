import React, { useState } from 'react';
import { 
  Building2, 
  User, 
  Shield, 
  Wrench, 
  Lock, 
  Mail, 
  AlertCircle, 
  ArrowRight,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { useAuth, PRE_SEEDED_USERS } from '../context/AuthContext';
import { UserRole } from '../types';

export const AuthView: React.FC = () => {
  const { login, signup, loading, error, clearError } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('citizen');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    if (isSignUp) {
      if (!name.trim()) return;
      await signup(name, email, password, role);
    } else {
      await login(email, password);
    }
  };

  const handleQuickLogin = (targetRole: UserRole) => {
    const cred = PRE_SEEDED_USERS[targetRole];
    setEmail(cred.email);
    setPassword(cred.pass);
    login(cred.email, cred.pass);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-900 text-amber-400 shadow-lg mb-4">
          <Building2 className="w-9 h-9" />
        </div>
        <h1 className="text-3xl font-black tracking-tight text-slate-900">
          आरम्भ • AARAMBH
        </h1>
        <p className="mt-1 text-sm font-medium text-slate-600">
          Smart Municipal Workforce Management & Citizen Grievance System
        </p>
      </div>

      {/* Main Card */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 shadow-xl rounded-2xl border border-slate-200 sm:px-10">
          {/* Form Tabs */}
          <div className="flex border-b border-slate-200 mb-6">
            <button
              id="tab-signin"
              onClick={() => { setIsSignUp(false); clearError(); }}
              className={`flex-1 pb-3 text-sm font-bold text-center border-b-2 transition ${
                !isSignUp
                  ? 'border-amber-500 text-slate-900'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              Sign In
            </button>
            <button
              id="tab-signup"
              onClick={() => { setIsSignUp(true); clearError(); }}
              className={`flex-1 pb-3 text-sm font-bold text-center border-b-2 transition ${
                isSignUp
                  ? 'border-amber-500 text-slate-900'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              Register Account
            </button>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 flex items-start space-x-2 text-red-700 text-xs">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <div className="flex-1">
                <span className="font-semibold">Authentication Notice: </span>
                {error}
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    id="input-signup-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    className="block w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Official Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="input-auth-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@aarambh.gov.in"
                  className="block w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="input-auth-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                />
              </div>
            </div>

            {isSignUp && (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Designated System Role
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole('citizen')}
                    className={`py-2 px-2 text-xs font-medium rounded-lg border text-center transition flex flex-col items-center justify-center space-y-1 ${
                      role === 'citizen'
                        ? 'border-blue-600 bg-blue-50 text-blue-800 font-bold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <User className="w-4 h-4 text-blue-600" />
                    <span>Citizen</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRole('officer')}
                    className={`py-2 px-2 text-xs font-medium rounded-lg border text-center transition flex flex-col items-center justify-center space-y-1 ${
                      role === 'officer'
                        ? 'border-amber-600 bg-amber-50 text-amber-800 font-bold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Shield className="w-4 h-4 text-amber-600" />
                    <span>Officer</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRole('worker')}
                    className={`py-2 px-2 text-xs font-medium rounded-lg border text-center transition flex flex-col items-center justify-center space-y-1 ${
                      role === 'worker'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800 font-bold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Wrench className="w-4 h-4 text-emerald-600" />
                    <span>Worker</span>
                  </button>
                </div>
              </div>
            )}

            <button
              id="btn-auth-submit"
              type="submit"
              disabled={loading}
              className="w-full mt-4 flex items-center justify-center py-2.5 px-4 rounded-xl shadow-sm text-sm font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                  <span>Processing...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <span>{isSignUp ? 'Create Municipal Account' : 'Sign In to Portal'}</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              )}
            </button>
          </form>

          {/* Quick Demo Access Bar */}
          <div className="mt-8 pt-6 border-t border-slate-200">
            <div className="flex items-center space-x-1 text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Instant Evaluator Access (1-Click Login):</span>
            </div>
            
            <div className="space-y-2">
              <button
                id="btn-quick-citizen"
                onClick={() => handleQuickLogin('citizen')}
                className="w-full flex items-center justify-between p-2.5 rounded-lg border border-blue-200 bg-blue-50/70 hover:bg-blue-100 transition text-left group"
              >
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded bg-blue-200 text-blue-800 flex items-center justify-center text-xs font-bold">
                    C
                  </div>
                  <div>
                    <div className="text-xs font-bold text-blue-900">Citizen: Ramesh Kumar</div>
                    <div className="text-[11px] text-blue-700">citizen@aarambh.gov.in</div>
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-blue-600 group-hover:underline">Sign In &rarr;</span>
              </button>

              <button
                id="btn-quick-officer"
                onClick={() => handleQuickLogin('officer')}
                className="w-full flex items-center justify-between p-2.5 rounded-lg border border-amber-200 bg-amber-50/70 hover:bg-amber-100 transition text-left group"
              >
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded bg-amber-200 text-amber-800 flex items-center justify-center text-xs font-bold">
                    O
                  </div>
                  <div>
                    <div className="text-xs font-bold text-amber-900">Officer: Aditi Sharma</div>
                    <div className="text-[11px] text-amber-700">officer@aarambh.gov.in</div>
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-amber-600 group-hover:underline">Sign In &rarr;</span>
              </button>

              <button
                id="btn-quick-worker"
                onClick={() => handleQuickLogin('worker')}
                className="w-full flex items-center justify-between p-2.5 rounded-lg border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100 transition text-left group"
              >
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded bg-emerald-200 text-emerald-800 flex items-center justify-center text-xs font-bold">
                    W
                  </div>
                  <div>
                    <div className="text-xs font-bold text-emerald-900">Worker: Rajesh Verma</div>
                    <div className="text-[11px] text-emerald-700">worker.rajesh@aarambh.gov.in</div>
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-emerald-600 group-hover:underline">Sign In &rarr;</span>
              </button>
            </div>

            <p className="mt-4 text-[11px] text-slate-500 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-center">
              <strong className="text-slate-700">🔒 Strict Role Isolation:</strong> Logging in grants access exclusively to that role's dashboard. A Citizen cannot view Officer or Worker tools, and vice-versa. To switch portals, you must sign out.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
