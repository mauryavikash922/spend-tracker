import { useState, useEffect } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { useGoogleAuth } from './hooks/useGoogleAuth';
import { useGoogleSheets } from './hooks/useGoogleSheets';
import { LoginScreen } from './components/Auth/LoginScreen';
import { BottomNav } from './components/Layout/BottomNav';
import { HomeScreen } from './components/LogForm/HomeScreen';
import { FlatmateScreen } from './components/Flatmates/FlatmateScreen';
import { ReportsScreen } from './components/Reports/ReportsScreen';
import { HistoryScreen } from './components/History/HistoryScreen';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

function MissingConfigScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-20 h-20 bg-orange-100 rounded-3xl flex items-center justify-center mb-4">
      <i className="ri-settings-3-line text-4xl text-orange-500" />
    </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Setup Required</h1>
      <p className="text-gray-500 text-sm mb-4 max-w-xs">
        Add your Google OAuth Client ID to get started.
      </p>
      <div className="bg-gray-900 text-green-400 rounded-xl px-4 py-3 text-xs font-mono text-left w-full max-w-xs">
        <p className="text-gray-500 mb-1"># .env file</p>
        <p>VITE_GOOGLE_CLIENT_ID=your_id</p>
      </div>
      <p className="text-xs text-gray-400 mt-4">
        See <strong>SETUP.md</strong> for full Google Cloud setup instructions.
      </p>
    </div>
  );
}

function AppContent() {
  const { user, token, sheetId, loading: authLoading, error: authError, login, logout } = useGoogleAuth();
  const { transactions, ledger, loading, error, fetchAll, logExpense, removeTx, settle, flatmateNames } = useGoogleSheets(token, sheetId);
  const [activeTab, setActiveTab] = useState('home');
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline); };
  }, []);

  useEffect(() => {
    if (token && sheetId) fetchAll();
  }, [token, sheetId, fetchAll]);

  if (!user) {
    return <LoginScreen onLogin={login} loading={authLoading} error={authError} />;
  }

  const tabComponents = {
    home: (
      <HomeScreen
        user={user}
        transactions={transactions}
        onLogExpense={logExpense}
        loading={loading}
        flatmateNames={flatmateNames}
        onLogout={logout}
      />
    ),
    flatmates: (
      <FlatmateScreen
        ledger={ledger}
        transactions={transactions}
        onSettle={settle}
        loading={loading}
      />
    ),
    reports: (
      <ReportsScreen
        user={user}
        transactions={transactions}
        ledger={ledger}
        onLogout={logout}
      />
    ),
    history: (
      <HistoryScreen
        transactions={transactions}
        onDelete={removeTx}
      />
    ),
  };

  return (
    <div className="max-w-lg mx-auto relative min-h-screen bg-gray-50">
      {/* Offline banner */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-orange-500 text-white text-center text-xs py-1.5 font-medium">
          You're offline — showing cached data. New entries won't be saved.
        </div>
      )}

      {/* Loading overlay on initial fetch */}
      {loading && transactions.length === 0 && (
        <div className="fixed inset-0 bg-white/80 z-40 flex flex-col items-center justify-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Loading your data…</p>
        </div>
      )}

      {/* Error banner */}
      {(error || authError) && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2 text-red-700 text-xs flex items-center gap-2">
          <i className="ri-alert-line" />
          <span className="flex-1">{error || authError}</span>
          <button onClick={() => fetchAll(true)} className="font-medium underline">Retry</button>
        </div>
      )}

      {/* Active screen */}
      <div className="flex-1">
        {tabComponents[activeTab]}
      </div>

      <BottomNav active={activeTab} onChange={setActiveTab} />
    </div>
  );
}

export default function App() {
  if (!CLIENT_ID) {
    return <MissingConfigScreen />;
  }
  return (
    <GoogleOAuthProvider clientId={CLIENT_ID}>
      <AppContent />
    </GoogleOAuthProvider>
  );
}
