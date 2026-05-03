import { useState } from 'react';
import { CategoryManager } from '../Categories/CategoryPicker';
import { PinPad } from '../Auth/PinPad';

function InfoRow({ icon, label, value }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-t border-gray-100 text-sm gap-3">
      <span className="text-gray-500 flex items-center gap-2 flex-shrink-0">
        <i className={`${icon} text-gray-400`} />{label}
      </span>
      <span className="font-medium text-gray-900 text-right min-w-0 truncate">{value}</span>
    </div>
  );
}

const TOOL_CARDS = [
  {
    id: 'investments',
    label: 'Investments',
    desc: 'Track portfolio & buckets',
    icon: 'ri-line-chart-line',
    gradient: 'linear-gradient(135deg,#10b981,#0d9488)',
  },
  {
    id: 'wallet',
    label: 'Wallet',
    desc: 'Bank accounts & cards',
    icon: 'ri-wallet-3-line',
    gradient: 'linear-gradient(135deg,#6366f1,#7c3aed)',
  },
];

export function ProfileScreen({ user, onLogout, customCategories, onAddCategory, onRemoveCategory, token, sheetId, onNavigate, appPin, setAppPin }) {
  const [downloading, setDownloading] = useState(false);
  const [downloadMsg, setDownloadMsg] = useState(null);
  const [pinMode, setPinMode] = useState(null); // 'setup' | 'remove'

  const handleDownload = async () => {
    if (!token || !sheetId) return;
    setDownloading(true);
    setDownloadMsg(null);
    try {
      const res = await fetch(
        `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error(`Export failed (${res.status})`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SpendWise-${new Date().getFullYear()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setDownloadMsg({ type: 'success', text: 'Downloaded successfully!' });
    } catch (e) {
      setDownloadMsg({ type: 'error', text: e.message });
    } finally {
      setDownloading(false);
      setTimeout(() => setDownloadMsg(null), 3000);
    }
  };

  return (
    <div className="flex flex-col bg-gray-50 min-h-screen pb-24">

      {/* Header — no negative margin overlap */}
      <div className="bg-indigo-500 px-4 pt-10 pb-8 text-center">
        <h2 className="text-white font-bold text-lg mb-5">Profile</h2>
        <div className="flex flex-col items-center gap-3">
          {user?.picture ? (
            <img src={user.picture} alt={user.name} className="w-20 h-20 rounded-full border-4 border-white shadow-lg" />
          ) : (
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-indigo-600 font-bold text-3xl border-4 border-white shadow-lg">
              {user?.name?.[0]}
            </div>
          )}
          <div className="min-w-0 px-4 w-full">
            <p className="text-white font-bold text-xl truncate">{user?.name}</p>
            <p className="text-indigo-200 text-sm truncate">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Content — starts below header, no overlap */}
      <div className="px-4 pt-4 space-y-4">

        {/* Account card */}
        <div className="card space-y-0">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2 pb-1">
            <i className="ri-account-circle-line text-indigo-500" />Account
          </h3>
          <InfoRow icon="ri-user-line" label="Name" value={user?.name} />
          <InfoRow icon="ri-mail-line" label="Email" value={user?.email} />
          <InfoRow icon="ri-google-line" label="Storage" value="Your Google Drive" />
        </div>

        {/* Tools section */}
        <div>
          <h3 className="font-semibold text-gray-700 text-xs uppercase tracking-wider mb-3 flex items-center gap-2">
            <i className="ri-grid-line text-gray-400" /> Tools
          </h3>
          <div className="flex gap-3">
            {TOOL_CARDS.map(card => (
              <button
                key={card.id}
                onClick={() => onNavigate && onNavigate(card.id)}
                className="flex-1 rounded-2xl p-4 text-left active:scale-95 transition-all shadow-sm"
                style={{ background: card.gradient }}
              >
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center mb-3">
                  <i className={`${card.icon} text-xl text-white`} />
                </div>
                <p className="font-bold text-white text-sm">{card.label}</p>
                <p className="text-white/70 text-xs mt-0.5">{card.desc}</p>
                <div className="flex items-center gap-1 mt-3 text-white/60">
                  <span className="text-[10px] font-medium">Open</span>
                  <i className="ri-arrow-right-line text-xs" />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Privacy & Security */}
        <div className="card space-y-3">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <i className="ri-shield-keyhole-line text-indigo-500" />Privacy & Security
          </h3>
          <p className="text-xs text-gray-500">Protect access to your Wallet and Investments tabs.</p>
          {appPin ? (
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setPinMode('remove')}
                className="btn-secondary w-full text-sm py-2"
              >
                Remove PIN Lock
              </button>
            </div>
          ) : (
            <button onClick={() => setPinMode('setup')} className="btn-primary w-full text-sm py-2">
              Set PIN Lock
            </button>
          )}
        </div>

        {/* Custom Categories */}
        <div className="card">
          <CategoryManager
            customCategories={customCategories}
            onAdd={onAddCategory}
            onRemove={onRemoveCategory}
          />
        </div>

        {/* Data Export */}
        <div className="card space-y-3">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <i className="ri-download-cloud-line text-indigo-500" />Export Data
          </h3>
          <p className="text-xs text-gray-500">
            Download your entire SpendWise spreadsheet (Transactions, Ledger, Settings) as an Excel file.
          </p>
          <button
            onClick={handleDownload}
            disabled={downloading || !token || !sheetId}
            className="w-full flex items-center justify-center gap-2 bg-indigo-50 text-indigo-600 font-semibold py-3 rounded-xl border border-indigo-100 active:scale-95 transition-all disabled:opacity-50 text-sm"
          >
            {downloading ? (
              <>
                <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                Preparing download…
              </>
            ) : (
              <>
                <i className="ri-file-excel-2-line text-lg" />
                Download as Excel (.xlsx)
              </>
            )}
          </button>
          {downloadMsg && (
            <p className={`text-xs text-center flex items-center justify-center gap-1 ${
              downloadMsg.type === 'success' ? 'text-green-600' : 'text-red-500'
            }`}>
              <i className={downloadMsg.type === 'success' ? 'ri-checkbox-circle-line' : 'ri-alert-line'} />
              {downloadMsg.text}
            </p>
          )}
        </div>

        {/* About */}
        <div className="card space-y-0">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2 pb-1">
            <i className="ri-information-line text-indigo-500" />About
          </h3>
          <InfoRow icon="ri-apps-line" label="App" value="SpendWise" />
          <InfoRow icon="ri-database-2-line" label="Data stored in" value={`My Spends - ${new Date().getFullYear()}`} />
        </div>

        {/* Logout */}
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-600 font-semibold py-4 rounded-2xl border border-red-100 active:scale-95 transition-all"
        >
          <i className="ri-logout-box-r-line text-lg" />
          Sign Out
        </button>
      </div>

      {pinMode && (
        <PinPad
          mode={pinMode}
          appPin={appPin}
          onSuccess={(hashedPin) => {
            if (pinMode === 'setup') {
              setAppPin(hashedPin);
            } else if (pinMode === 'remove') {
              setAppPin(null);
            }
            setPinMode(null);
          }}
          onCancel={() => setPinMode(null)}
        />
      )}
    </div>
  );
}
