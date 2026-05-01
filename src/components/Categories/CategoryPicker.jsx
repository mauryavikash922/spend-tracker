import { useState } from 'react';
import { REMIX_ICONS } from '../../utils/categories';

function IconPickerModal({ onSelect, onClose }) {
  const [search, setSearch] = useState('');
  const filtered = search
    ? REMIX_ICONS.filter(i => i.label.toLowerCase().includes(search.toLowerCase()))
    : REMIX_ICONS;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="bg-white rounded-t-3xl w-full max-w-lg flex flex-col" style={{ maxHeight: '80vh' }} onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-gray-100">
          <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-3" />
          <h3 className="font-bold text-gray-900 mb-3">Pick an Icon</h3>
          <div className="relative">
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search icons…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input-field pl-9 py-2 text-sm"
              autoFocus
            />
          </div>
        </div>
        <div className="overflow-y-auto p-3 grid grid-cols-5 gap-2">
          {filtered.map(({ icon, label }) => (
            <button
              key={icon}
              onClick={() => onSelect(icon)}
              title={label}
              className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-indigo-50 active:bg-indigo-100 transition-colors"
            >
              <i className={`${icon} text-2xl text-gray-700`} />
              <span className="text-[9px] text-gray-400 truncate w-full text-center">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function CategoryManager({ customCategories, onAdd, onRemove }) {
  const [showAdd, setShowAdd] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newIcon, setNewIcon] = useState('ri-star-line');
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!newLabel.trim()) return;
    setSaving(true);
    try {
      await onAdd({ label: newLabel.trim(), icon: newIcon });
      setNewLabel('');
      setNewIcon('ri-star-line');
      setShowAdd(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <i className="ri-apps-line text-indigo-500" />
          Custom Categories
        </h3>
        <button
          onClick={() => setShowAdd(v => !v)}
          className="flex items-center gap-1 text-sm text-indigo-600 font-medium"
        >
          <i className="ri-add-line" />
          Add
        </button>
      </div>

      {showAdd && (
        <div className="bg-indigo-50 rounded-2xl p-4 space-y-3 border border-indigo-100">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowIconPicker(true)}
              className="w-12 h-12 bg-white rounded-xl border border-indigo-200 flex items-center justify-center flex-shrink-0 active:scale-95 transition-all"
            >
              <i className={`${newIcon} text-2xl text-indigo-500`} />
            </button>
            <input
              type="text"
              placeholder="Category name"
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              className="input-field flex-1"
              maxLength={20}
            />
          </div>
          <p className="text-xs text-gray-400 flex items-center gap-1">
            <i className="ri-information-line" /> Tap the icon to change it
          </p>
          <div className="flex gap-2">
            <button onClick={() => setShowAdd(false)} className="btn-secondary flex-1 py-2 text-sm">
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={saving || !newLabel.trim()}
              className="btn-primary flex-1 py-2 text-sm flex items-center justify-center gap-1"
            >
              {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><i className="ri-save-line" /> Save</>}
            </button>
          </div>
        </div>
      )}

      {customCategories.length > 0 && (
        <div className="space-y-2">
          {customCategories.map(cat => (
            <div key={cat.label} className="flex items-center justify-between bg-white rounded-xl p-3 border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center">
                  <i className={`${cat.icon} text-indigo-500 text-lg`} />
                </div>
                <span className="font-medium text-gray-800 text-sm">{cat.label}</span>
              </div>
              <button
                onClick={() => onRemove(cat.label)}
                className="w-8 h-8 flex items-center justify-center text-red-400 hover:bg-red-50 rounded-lg transition-colors"
              >
                <i className="ri-delete-bin-line" />
              </button>
            </div>
          ))}
        </div>
      )}

      {customCategories.length === 0 && !showAdd && (
        <p className="text-sm text-gray-400 text-center py-2">No custom categories yet</p>
      )}

      {showIconPicker && (
        <IconPickerModal
          onSelect={icon => { setNewIcon(icon); setShowIconPicker(false); }}
          onClose={() => setShowIconPicker(false)}
        />
      )}
    </div>
  );
}
