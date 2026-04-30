import { useState } from 'react';
import { todayStr, dateToInputValue, inputValueToDate, formatCurrency } from '../../utils/formatters';
import { calcEqualSplit as calcSplit } from '../../utils/splitCalculator';

const CATEGORIES = [
  { label: 'Need', icon: 'ri-shopping-cart-line' },
  { label: 'Want', icon: 'ri-price-tag-3-line' },
  { label: 'Investment', icon: 'ri-line-chart-line' },
];

export function LogForm({ onSubmit, loading, flatmateNames = [] }) {
  const [form, setForm] = useState({
    amount: '',
    paidTo: '',
    category: 'Need',
    type: 'Personal',
    date: todayStr(),
    sharedWith: '',
    splitType: 'equal',
    splitCount: '2',
    myShare: '',
  });
  const [sharedWithInput, setSharedWithInput] = useState('');
  const [suggestions, setSuggestions] = useState([]);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const previewShare = form.type === 'Shared' && form.amount
    ? (form.splitType === 'custom'
        ? parseFloat(form.myShare) || 0
        : calcSplit(parseFloat(form.amount) || 0, parseInt(form.splitCount) || 2))
    : parseFloat(form.amount) || 0;

  const handleSharedWithChange = (val) => {
    setSharedWithInput(val);
    const last = val.split(',').pop().trim();
    if (last.length > 0) {
      setSuggestions(flatmateNames.filter(n => n.toLowerCase().startsWith(last.toLowerCase())));
    } else {
      setSuggestions([]);
    }
    set('sharedWith', val);
    const names = val.split(',').map(n => n.trim()).filter(Boolean);
    set('splitCount', String(names.length + 1));
  };

  const addSuggestion = (name) => {
    const parts = sharedWithInput.split(',');
    parts[parts.length - 1] = ' ' + name;
    const newVal = parts.join(',').replace(/^,\s*/, '') + ', ';
    setSharedWithInput(newVal);
    set('sharedWith', newVal);
    const names = newVal.split(',').map(n => n.trim()).filter(Boolean);
    set('splitCount', String(names.length + 1));
    setSuggestions([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.amount || !form.paidTo) return;
    await onSubmit({ ...form, fullAmount: parseFloat(form.amount), date: form.date });
    setForm({
      amount: '',
      paidTo: '',
      category: 'Need',
      type: 'Personal',
      date: todayStr(),
      sharedWith: '',
      splitType: 'equal',
      splitCount: '2',
      myShare: '',
    });
    setSharedWithInput('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Amount */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Amount (₹)</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-gray-300">₹</span>
          <input
            type="number"
            placeholder="0"
            value={form.amount}
            onChange={e => set('amount', e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-4 text-3xl font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
            required
            min="0"
            step="0.01"
            autoFocus
          />
        </div>
      </div>

      {/* Paid To */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Paid To</label>
        <div className="relative">
          <i className="ri-store-2-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
          <input
            type="text"
            placeholder="Swiggy, Blinkit, etc."
            value={form.paidTo}
            onChange={e => set('paidTo', e.target.value)}
            className="input-field pl-9"
            required
          />
        </div>
      </div>

      {/* Category */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Category</label>
        <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
          {CATEGORIES.map(cat => (
            <button
              key={cat.label}
              type="button"
              onClick={() => set('category', cat.label)}
              className={`toggle-btn flex items-center justify-center gap-1.5 ${form.category === cat.label ? 'toggle-btn-active' : 'toggle-btn-inactive'}`}
            >
              <i className={`${cat.icon} text-sm`} />
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Type */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Type</label>
        <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
          {[
            { label: 'Personal', icon: 'ri-user-line' },
            { label: 'Shared', icon: 'ri-group-line' },
          ].map(t => (
            <button
              key={t.label}
              type="button"
              onClick={() => set('type', t.label)}
              className={`toggle-btn flex items-center justify-center gap-1.5 ${form.type === t.label ? 'toggle-btn-active' : 'toggle-btn-inactive'}`}
            >
              <i className={`${t.icon} text-sm`} />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Shared fields */}
      {form.type === 'Shared' && (
        <div className="bg-indigo-50 rounded-2xl p-4 space-y-3 border border-indigo-100">
          <div className="relative">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Shared With</label>
            <div className="relative">
              <i className="ri-user-add-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
              <input
                type="text"
                placeholder="Enter flatmate names, comma-separated"
                value={sharedWithInput}
                onChange={e => handleSharedWithChange(e.target.value)}
                className="input-field pl-9"
              />
            </div>
            {suggestions.length > 0 && (
              <div className="absolute z-20 w-full bg-white border border-gray-200 rounded-xl shadow-lg mt-1 overflow-hidden">
                {suggestions.map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => addSuggestion(s)}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-indigo-50 text-gray-700 flex items-center gap-2"
                  >
                    <i className="ri-user-line text-indigo-400" />
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Split Type</label>
            <div className="flex gap-2 bg-white p-1 rounded-xl border border-indigo-100">
              {[
                { id: 'equal', label: 'Equal Split', icon: 'ri-scales-line' },
                { id: 'custom', label: 'Custom Split', icon: 'ri-edit-line' },
              ].map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => set('splitType', t.id)}
                  className={`toggle-btn flex items-center justify-center gap-1.5 ${form.splitType === t.id ? 'toggle-btn-active' : 'toggle-btn-inactive'}`}
                >
                  <i className={`${t.icon} text-sm`} />
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {form.splitType === 'custom' && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">My Share (₹)</label>
              <input
                type="number"
                placeholder="Enter your share"
                value={form.myShare}
                onChange={e => set('myShare', e.target.value)}
                className="input-field"
                min="0"
                step="0.01"
              />
            </div>
          )}

          {form.amount && (
            <div className="bg-white rounded-xl p-3 text-center border border-indigo-100">
              <p className="text-xs text-gray-500">Your share</p>
              <p className="text-xl font-bold text-indigo-600">{formatCurrency(previewShare)}</p>
              {form.splitType === 'equal' && (
                <p className="text-xs text-gray-400">
                  {formatCurrency(form.amount)} ÷ {form.splitCount} people
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Date */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Date</label>
        <div className="relative">
          <i className="ri-calendar-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
          <input
            type="date"
            value={dateToInputValue(form.date)}
            onChange={e => set('date', inputValueToDate(e.target.value))}
            className="input-field pl-9"
            max={dateToInputValue(todayStr())}
          />
        </div>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={loading || !form.amount || !form.paidTo}
        className="btn-primary w-full text-center flex items-center justify-center gap-2"
      >
        {loading ? (
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <>
            <i className="ri-save-line text-lg" />
            <span>Log Expense</span>
          </>
        )}
      </button>
    </form>
  );
}
