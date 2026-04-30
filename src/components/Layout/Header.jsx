import { prevMonth, nextMonth, currentMonthLabel } from '../../utils/formatters';

export function Header({ user, selectedMonth, onMonthChange, onLogout }) {
  const isCurrentMonth = selectedMonth === currentMonthLabel();

  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-30">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-500 rounded-xl flex items-center justify-center">
            <i className="ri-wallet-3-line text-white text-base" />
          </div>
          <span className="font-bold text-gray-900 text-lg">SpendWise</span>
        </div>

        {user && (
          <div className="relative group">
            <button className="flex items-center gap-2">
              {user.picture ? (
                <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full" />
              ) : (
                <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-semibold text-sm">
                  {user.name?.[0]}
                </div>
              )}
            </button>
            <div className="absolute right-0 top-10 bg-white border border-gray-200 rounded-xl shadow-lg p-2 hidden group-focus-within:block min-w-[140px] z-50">
              <p className="text-xs text-gray-500 px-3 py-1 truncate max-w-[160px]">{user.email}</p>
              <button
                onClick={onLogout}
                className="w-full text-left text-sm text-red-600 hover:bg-red-50 rounded-lg px-3 py-2 transition-colors flex items-center gap-2"
              >
                <i className="ri-logout-box-r-line" />
                Sign out
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Month Selector */}
      {onMonthChange && (
        <div className="flex items-center justify-center gap-4 px-4 pb-3">
          <button
            onClick={() => onMonthChange(prevMonth(selectedMonth))}
            className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
          >
            <i className="ri-arrow-left-s-line text-xl" />
          </button>
          <span className="font-semibold text-gray-700 min-w-[110px] text-center">{selectedMonth}</span>
          <button
            onClick={() => onMonthChange(nextMonth(selectedMonth))}
            disabled={isCurrentMonth}
            className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors disabled:opacity-30"
          >
            <i className="ri-arrow-right-s-line text-xl" />
          </button>
        </div>
      )}
    </header>
  );
}
