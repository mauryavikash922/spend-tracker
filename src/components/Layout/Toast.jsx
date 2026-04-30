import { useEffect } from 'react';

export function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl shadow-lg text-white text-sm font-medium transition-all ${
      type === 'success' ? 'bg-green-500' : 'bg-red-500'
    }`}>
      <i className={`${type === 'success' ? 'ri-checkbox-circle-line' : 'ri-close-circle-line'} text-lg`} />
      <span>{message}</span>
    </div>
  );
}
