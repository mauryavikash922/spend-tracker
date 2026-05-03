const tabs = [
  { id: 'home',    label: 'Home',    icon: 'ri-home-5-line',      activeIcon: 'ri-home-5-fill' },
  { id: 'people',  label: 'People',  icon: 'ri-group-line',       activeIcon: 'ri-group-fill' },
  { id: 'reports', label: 'Reports', icon: 'ri-bar-chart-2-line', activeIcon: 'ri-bar-chart-2-fill' },
  { id: 'history', label: 'History', icon: 'ri-history-line',     activeIcon: 'ri-history-line' },
  { id: 'profile', label: 'Profile', icon: 'ri-user-line',        activeIcon: 'ri-user-fill' },
];

export function BottomNav({ active, onChange }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100 shadow-lg max-w-lg mx-auto">
      <div className="flex">
        {tabs.map(tab => {
          const isActive = active === tab.id;
          return (
            <button key={tab.id} onClick={() => onChange(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors relative ${isActive ? 'text-indigo-600' : 'text-gray-400'}`}>
              {isActive && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-indigo-600 rounded-full" />}
              <i className={`${isActive ? tab.activeIcon : tab.icon} text-lg`} />
              <span className="text-[9px] font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

