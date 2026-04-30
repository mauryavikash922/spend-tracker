export function LoginScreen({ onLogin, loading, error }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm flex flex-col items-center gap-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-20 h-20 bg-indigo-500 rounded-3xl flex items-center justify-center shadow-lg shadow-indigo-200">
            <i className="ri-wallet-3-line text-4xl text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900">SpendWise</h1>
            <p className="text-gray-500 mt-1 text-sm">
              Track your spends. Split with flatmates.<br />All in your Google Sheet.
            </p>
          </div>
        </div>

        {/* Features */}
        <div className="w-full space-y-3">
          {[
            { icon: 'ri-file-chart-line', text: 'Auto-creates your personal Google Sheet' },
            { icon: 'ri-group-line', text: 'Split bills with flatmates effortlessly' },
            { icon: 'ri-wifi-off-line', text: 'Works offline — logs when reconnected' },
          ].map(f => (
            <div key={f.text} className="flex items-center gap-3 bg-white rounded-xl p-3 shadow-sm">
              <i className={`${f.icon} text-xl text-indigo-500`} />
              <span className="text-sm text-gray-600">{f.text}</span>
            </div>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="w-full bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3 text-center">
            {error}
          </div>
        )}

        {/* Sign In Button */}
        <button
          onClick={onLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-white border border-gray-200 rounded-2xl py-4 px-6 shadow-sm active:scale-95 transition-all disabled:opacity-60"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          )}
          <span className="font-semibold text-gray-700">
            {loading ? 'Signing in…' : 'Continue with Google'}
          </span>
        </button>

        <p className="text-xs text-gray-400 text-center">
          We only access your Google Sheets &amp; Drive to store your data.<br />Your data stays in your own Google account.
        </p>
      </div>
    </div>
  );
}
