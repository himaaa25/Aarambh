import React, { useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { AuthView } from './components/AuthView';
import { CitizenDashboard } from './components/CitizenDashboard';
import { OfficerDashboard } from './components/OfficerDashboard';
import { WorkerDashboard } from './components/WorkerDashboard';
import { UnauthorizedBanner } from './components/UnauthorizedBanner';
import { seedInitialComplaintsIfEmpty } from './services/complaintService';
import { seedInitialWorkersIfEmpty } from './services/workerService';
import { Building2, ShieldCheck, Database } from 'lucide-react';

const AppContent: React.FC = () => {
  const { currentUser, userProfile, loading } = useAuth();

  // Seed default dataset on launch if Firestore database is fresh
  useEffect(() => {
    seedInitialWorkersIfEmpty();
    seedInitialComplaintsIfEmpty();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-white">
        <div className="w-16 h-16 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center mb-4 shadow-lg animate-pulse">
          <Building2 className="w-9 h-9" />
        </div>
        <h2 className="text-xl font-black text-amber-400">आरम्भ • AARAMBH</h2>
        <p className="text-xs text-slate-400 mt-1">Smart Municipal Workforce Management System</p>
        <div className="flex items-center space-x-2 mt-6 text-xs text-slate-400">
          <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
          <span>Verifying Firebase Auth & Firestore Connection...</span>
        </div>
      </div>
    );
  }

  // Not logged in -> Show Authentication View
  if (!currentUser || !userProfile) {
    return <AuthView />;
  }

  // Authenticated: strictly route according to validated role
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1">
        {userProfile.role === 'citizen' && <CitizenDashboard />}
        {userProfile.role === 'officer' && <OfficerDashboard />}
        {userProfile.role === 'worker' && <WorkerDashboard />}
        {userProfile.role !== 'citizen' && userProfile.role !== 'officer' && userProfile.role !== 'worker' && (
          <UnauthorizedBanner attemptedRole="citizen" />
        )}
      </main>

      {/* Municipal Footer */}
      <footer className="bg-slate-900 text-slate-400 text-xs py-6 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-300">AARAMBH Municipal Governance Portal</span>
            <span>•</span>
            <span>Project: <strong className="text-amber-400">aarambh-91075</strong></span>
          </div>

          <div className="flex items-center space-x-4">
            <span className="flex items-center space-x-1 text-slate-400">
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span>Firestore Real-Time Engine Active</span>
            </span>
            <span>•</span>
            <span className="flex items-center space-x-1 text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>Role-Based Access Verified</span>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
