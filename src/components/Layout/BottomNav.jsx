const tabs = [
  { id: 'home', label: 'Home', icon: 'ri-home-5-line', activeIcon: 'ri-home-5-fill' },
  { id: 'flatmates', label: 'Flatmates', icon: 'ri-group-line', activeIcon: 'ri-group-fill' },
  { id: 'reports', label: 'Reports', icon: 'ri-bar-chart-2-line', activeIcon: 'ri-bar-chart-2-fill' },
  { id: 'history', label: 'History', icon: 'ri-history-line', activeIcon: 'ri-history-line' },
];

export function BottomNav({ active, onChange }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 pb-safe z-30">
      <div className="flex items-stretch max-w-lg mx-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors relative ${
              active === tab.id ? 'text-indigo-600' : 'text-gray-400'
            }`}
          >
            <i className={`${active === tab.id ? tab.activeIcon : tab.icon} text-2xl leading-none`} />
            <span className="text-[10px] font-medium">{tab.label}</span>
            {active === tab.id && (
              <div className="absolute bottom-0 w-12 h-0.5 bg-indigo-500 rounded-t-full" />
            )}
          </button>
        ))}
      </div>
    </nav>
  );
}
