import { useState, useEffect } from 'react';
import { todayStr, dateToInputValue, inputValueToDate, formatCurrency, parseBucket, formatBucketComment } from '../../utils/formatters';
import { calcEqualSplit } from '../../utils/splitCalculator';

const TYPES = [
  { id: 'Personal', label: 'Personal', icon: 'ri-user-line' },
  { id: 'Shared', label: 'Shared', icon: 'ri-group-line' },
  { id: 'Lent', label: 'Lent', icon: 'ri-arrow-right-up-line' },
  { id: 'Borrowed', label: 'Borrowed', icon: 'ri-arrow-left-down-line' },
];

const EMPTY_FORM = {
  amount: '', paidTo: '', category: 'Need', type: 'Personal',
  date: todayStr(), sharedWith: '', splitType: 'equal',
  splitCount: '2', myShare: '', personName: '', comment: '',
  investmentBucket: '',
};

export function LogForm({ onSubmit, onEditSubmit, editTx, loading, personNames = [], allCategories = [], investmentBuckets = [], onAddBucket }) {
  const isEdit = !!editTx;
  const [form, setForm] = useState(EMPTY_FORM);
  const [suggestions, setSuggestions] = useState([]);
  const [newBucketInput, setNewBucketInput] = useState('');
  const [showNewBucket, setShowNewBucket] = useState(false);
  // local buckets merges saved + any created in this session
  const [localBuckets, setLocalBuckets] = useState([]);

  // Sync localBuckets whenever investmentBuckets prop changes
  useEffect(() => {
    setLocalBuckets(investmentBuckets.map(b => b.name));
  }, [investmentBuckets]);

  useEffect(() => {
    if (editTx) {
      const { bucket, userComment } = parseBucket(editTx.comment);
      setForm({
        amount: String(editTx.fullAmount || ''),
        paidTo: editTx.paidTo || '',
        category: editTx.category || 'Need',
        type: editTx.type || 'Personal',
        date: editTx.date || todayStr(),
        sharedWith: editTx.sharedWith || '',
        splitType: 'equal',
        splitCount: String(editTx.splitCount || 2),
        myShare: String(editTx.myShare || ''),
        personName: editTx.sharedWith || '',
        comment: userComment,
        investmentBucket: bucket,
      });
    } else {
      setForm(f => ({ ...EMPTY_FORM, date: f.date }));
    }
  }, [editTx]);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));


  const previewShare = form.type === 'Shared' && form.amount
    ? (form.splitType === 'custom'
        ? parseFloat(form.myShare) || 0
        : calcEqualSplit(parseFloat(form.amount) || 0, parseInt(form.splitCount) || 2))
    : parseFloat(form.amount) || 0;

  const handlePersonInput = (val) => {
    set('personName', val);
    if (val.length > 0) {
      setSuggestions(personNames.filter(n => n.toLowerCase().startsWith(val.toLowerCase())));
    } else setSuggestions([]);
  };

  const handleSharedWithChange = (val) => {
    set('sharedWith', val);
    const last = val.split(',').pop().trim();
    if (last.length > 0) {
      setSuggestions(personNames.filter(n => n.toLowerCase().startsWith(last.toLowerCase())));
    } else setSuggestions([]);
    const names = val.split(',').map(n => n.trim()).filter(Boolean);
    set('splitCount', String(names.length + 1));
  };

  const addPersonSuggestion = (name) => {
    if (form.type === 'Shared') {
      const parts = form.sharedWith.split(',');
      parts[parts.length - 1] = ' ' + name;
      const newVal = parts.join(',').replace(/^,\s*/, '') + ', ';
      set('sharedWith', newVal);
      const names = newVal.split(',').map(n => n.trim()).filter(Boolean);
      set('splitCount', String(names.length + 1));
    } else {
      set('personName', name);
    }
    setSuggestions([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const isPeopleType = form.type === 'Lent' || form.type === 'Borrowed';
    if (!form.amount) return;
    if (!isPeopleType && !form.paidTo) return;   // Personal/Shared require Paid To
    if (isPeopleType && !form.personName) return; // Lent/Borrowed require a person name
    const encodedComment = form.category === 'Investment'
      ? formatBucketComment(form.investmentBucket, form.comment)
      : form.comment || '';
    const payload = { ...form, fullAmount: parseFloat(form.amount), comment: encodedComment };
    if (isEdit) {
      await onEditSubmit(editTx.transactionId, payload);
    } else {
      await onSubmit(payload);
      setForm(f => ({ ...EMPTY_FORM, date: f.date }));
      setSuggestions([]);
    }
  };

  const typeInfo = {
    Lent: { personLabel: 'Lent To', amountLabel: 'Amount Lent (₹)', note: 'Full amount will be tracked as pending from them.' },
    Borrowed: { personLabel: 'Borrowed From', amountLabel: 'Amount Borrowed (₹)', note: 'Full amount will be tracked as your debt.' },
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Amount */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
          {typeInfo[form.type]?.amountLabel || 'Amount (₹)'}
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-gray-300">₹</span>
          <input
            type="number" placeholder="0" value={form.amount}
            onChange={e => set('amount', e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-4 text-3xl font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
            required min="0" step="0.01" autoFocus={!isEdit}
          />
        </div>
      </div>

      {/* Type — locked in edit mode */}
      {!isEdit && (
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Type</label>
          <div className="grid grid-cols-4 gap-1.5 bg-gray-100 p-1 rounded-xl">
            {TYPES.map(t => (
              <button key={t.id} type="button" onClick={() => set('type', t.id)}
                className={`toggle-btn flex items-center justify-center gap-1 text-xs ${form.type === t.id ? 'toggle-btn-active' : 'toggle-btn-inactive'}`}>
                <i className={`${t.icon} text-sm`} />{t.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Personal / Shared fields */}
      {(form.type === 'Personal' || isEdit) && (
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Paid To</label>
          <div className="relative">
            <i className="ri-store-2-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
            <input type="text" placeholder="Swiggy, Blinkit, etc." value={form.paidTo}
              onChange={e => set('paidTo', e.target.value)} className="input-field pl-9" required />
          </div>
        </div>
      )}

      {/* Lent / Borrowed person field */}
      {(form.type === 'Lent' || form.type === 'Borrowed') && !isEdit && (
        <div className={`rounded-2xl p-4 space-y-3 border ${form.type === 'Lent' ? 'bg-orange-50 border-orange-100' : 'bg-blue-50 border-blue-100'}`}>
          <div className="relative">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              {typeInfo[form.type].personLabel}
            </label>
            <div className="relative">
              <i className="ri-user-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
              <input type="text" placeholder="Person's name" value={form.personName}
                onChange={e => handlePersonInput(e.target.value)} className="input-field pl-9" required />
            </div>
            {suggestions.length > 0 && (
              <div className="absolute z-20 w-full bg-white border border-gray-200 rounded-xl shadow-lg mt-1 overflow-hidden">
                {suggestions.map(s => (
                  <button key={s} type="button" onClick={() => addPersonSuggestion(s)}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-indigo-50 text-gray-700 flex items-center gap-2">
                    <i className="ri-user-line text-indigo-400" />{s}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Note (optional)</label>
            <div className="relative">
              <i className="ri-sticky-note-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
              <input type="text" placeholder="e.g. for rent, emergency" value={form.paidTo}
                onChange={e => set('paidTo', e.target.value)} className="input-field pl-9" />
            </div>
          </div>
          <p className="text-xs text-gray-400 flex items-center gap-1">
            <i className="ri-information-line" />{typeInfo[form.type].note}
          </p>
        </div>
      )}

      {/* Shared fields */}
      {form.type === 'Shared' && !isEdit && (
        <div className="bg-indigo-50 rounded-2xl p-4 space-y-3 border border-indigo-100">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Paid To</label>
            <div className="relative">
              <i className="ri-store-2-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
              <input type="text" placeholder="Swiggy, Blinkit, etc." value={form.paidTo}
                onChange={e => set('paidTo', e.target.value)} className="input-field pl-9" required />
            </div>
          </div>
          <div className="relative">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Shared With</label>
            <div className="relative">
              <i className="ri-user-add-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
              <input type="text" placeholder="Names, comma-separated" value={form.sharedWith}
                onChange={e => handleSharedWithChange(e.target.value)} className="input-field pl-9" />
            </div>
            {suggestions.length > 0 && (
              <div className="absolute z-20 w-full bg-white border border-gray-200 rounded-xl shadow-lg mt-1 overflow-hidden">
                {suggestions.map(s => (
                  <button key={s} type="button" onClick={() => addPersonSuggestion(s)}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-indigo-50 text-gray-700 flex items-center gap-2">
                    <i className="ri-user-line text-indigo-400" />{s}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Split Type</label>
            <div className="flex gap-2 bg-white p-1 rounded-xl border border-indigo-100">
              {[{ id: 'equal', label: 'Equal', icon: 'ri-scales-line' }, { id: 'custom', label: 'Custom', icon: 'ri-edit-line' }].map(t => (
                <button key={t.id} type="button" onClick={() => set('splitType', t.id)}
                  className={`toggle-btn flex items-center justify-center gap-1.5 ${form.splitType === t.id ? 'toggle-btn-active' : 'toggle-btn-inactive'}`}>
                  <i className={`${t.icon} text-sm`} />{t.label}
                </button>
              ))}
            </div>
          </div>
          {form.splitType === 'custom' && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">My Share (₹)</label>
              <input type="number" placeholder="Enter your share" value={form.myShare}
                onChange={e => set('myShare', e.target.value)} className="input-field" min="0" step="0.01" />
            </div>
          )}
          {form.amount && (
            <div className="bg-white rounded-xl p-3 text-center border border-indigo-100">
              <p className="text-xs text-gray-500">Your share</p>
              <p className="text-xl font-bold text-indigo-600">{formatCurrency(previewShare)}</p>
              {form.splitType === 'equal' && (
                <p className="text-xs text-gray-400">{formatCurrency(form.amount)} ÷ {form.splitCount} people</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Category — hidden for Lent/Borrowed */}
      {form.type !== 'Lent' && form.type !== 'Borrowed' && (
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Category</label>
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {allCategories.map(cat => (
              <button key={cat.label} type="button" onClick={() => {
                set('category', cat.label);
                if (cat.label !== 'Investment') set('investmentBucket', '');
              }}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all border ${
                  form.category === cat.label
                    ? 'bg-indigo-500 text-white border-indigo-500'
                    : 'bg-gray-50 text-gray-600 border-gray-200'
                }`}>
                <i className={`${cat.icon} text-sm`} />{cat.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Investment Bucket — shown when Investment is selected */}
      {form.category === 'Investment' && !isEdit && (
        <div className="bg-emerald-50 rounded-2xl p-4 space-y-3 border border-emerald-100">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">Investment Bucket</label>
          <div className="flex gap-2 flex-wrap">
            {localBuckets.map(name => (
              <button key={name} type="button"
                onClick={() => set('investmentBucket', form.investmentBucket === name ? '' : name)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all border ${
                  form.investmentBucket === name
                    ? 'bg-emerald-500 text-white border-emerald-500'
                    : 'bg-white text-gray-600 border-gray-200'
                }`}>
                <i className="ri-folder-line text-sm" />{name}
              </button>
            ))}
            {!showNewBucket && (
              <button type="button" onClick={() => setShowNewBucket(true)}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border border-dashed border-emerald-300 text-emerald-600 bg-transparent">
                <i className="ri-add-line" /> New Bucket
              </button>
            )}
          </div>
          {showNewBucket && (
            <div className="flex gap-2">
              <input type="text" placeholder="e.g. Mutual Fund 1" value={newBucketInput}
                onChange={e => setNewBucketInput(e.target.value)}
                onKeyDown={async e => {
                  if (e.key === 'Enter' && newBucketInput.trim()) {
                    e.preventDefault();
                    const name = newBucketInput.trim();
                    setLocalBuckets(prev => prev.includes(name) ? prev : [...prev, name]);
                    set('investmentBucket', name);
                    setNewBucketInput('');
                    setShowNewBucket(false);
                    if (onAddBucket) onAddBucket({ name });
                  }
                }}
                className="input-field flex-1 py-2 text-sm" autoFocus maxLength={30} />
              <button type="button"
                onClick={async () => {
                  if (!newBucketInput.trim()) return;
                  const name = newBucketInput.trim();
                  setLocalBuckets(prev => prev.includes(name) ? prev : [...prev, name]);
                  set('investmentBucket', name);
                  setNewBucketInput('');
                  setShowNewBucket(false);
                  if (onAddBucket) onAddBucket({ name });
                }}
                disabled={!newBucketInput.trim()}
                className="bg-emerald-500 text-white px-4 rounded-xl text-sm font-medium active:scale-95 transition-all disabled:opacity-50">
                <i className="ri-check-line" />
              </button>
            </div>
          )}
          {form.investmentBucket && (
            <p className="text-xs text-emerald-600 flex items-center gap-1">
              <i className="ri-folder-check-line" /> Saving to: <strong>{form.investmentBucket}</strong>
            </p>
          )}
        </div>
      )}

      {/* Date */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Date</label>
        <div className="relative">
          <i className="ri-calendar-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
          <input type="date" value={dateToInputValue(form.date)}
            onChange={e => set('date', inputValueToDate(e.target.value))}
            className="input-field pl-9" max={dateToInputValue(todayStr())} />
        </div>
      </div>

      {/* Comment */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
          Comment <span className="text-gray-300 normal-case font-normal">(optional)</span>
        </label>
        <div className="relative">
          <i className="ri-chat-1-line absolute left-3 top-3 text-gray-400 text-lg" />
          <textarea placeholder="Add a note…" value={form.comment}
            onChange={e => set('comment', e.target.value)}
            className="input-field pl-9 resize-none text-sm" rows={2} maxLength={200} />
        </div>
      </div>

      {/* Submit */}
      <button type="submit" disabled={loading || !form.amount || (!form.paidTo && form.type !== 'Lent' && form.type !== 'Borrowed')}
        className="btn-primary w-full flex items-center justify-center gap-2">
        {loading
          ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          : <><i className={isEdit ? 'ri-save-line' : 'ri-add-circle-line'} />{isEdit ? 'Save Changes' : 'Log Expense'}</>
        }
      </button>

      {isEdit && (
        <p className="text-xs text-gray-400 text-center flex items-center justify-center gap-1">
          <i className="ri-lock-line" /> Type and split details are locked after creation
        </p>
      )}
    </form>
  );
}
