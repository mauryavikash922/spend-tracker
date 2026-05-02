import { useState, useMemo } from 'react';
import { formatCurrency } from '../../utils/formatters';
import { Toast } from '../Layout/Toast';
import { LogForm } from '../LogForm/LogForm';

const TYPE_ICONS = {
  Personal: 'ri-user-line',
  Shared: 'ri-group-line',
  Lent: 'ri-arrow-right-up-line',
  Borrowed: 'ri-arrow-left-down-line',
};

function TxRow({ tx, onDelete, onEdit, allCategories }) {
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const cat = allCategories.find(c => c.label === tx.category);
  const catIcon = cat?.icon || 'ri-bill-line';

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    try { await onDelete(tx.transactionId); } finally { setDeleting(false); }
  };

  const amountDisplay = tx.type === 'Lent' || tx.type === 'Borrowed'
    ? tx.fullAmount
    : tx.myShare;

  const amountColor = tx.type === 'Lent' ? 'text-orange-500'
    : tx.type === 'Borrowed' ? 'text-blue-500'
    : 'text-gray-900';

  return (
    <div className="card py-3">
      <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpanded(e => !e)}>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
            tx.type === 'Lent' ? 'bg-orange-100 text-orange-500' :
            tx.type === 'Borrowed' ? 'bg-blue-100 text-blue-500' :
            tx.category === 'Need' ? 'bg-blue-100 text-blue-700' :
            tx.category === 'Want' ? 'bg-pink-100 text-pink-700' :
            tx.category === 'Investment' ? 'bg-green-100 text-green-700' :
            'bg-indigo-100 text-indigo-600'
          }`}>
            <i className={`${tx.type === 'Lent' || tx.type === 'Borrowed' ? TYPE_ICONS[tx.type] : catIcon} text-base`} />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-gray-900 text-sm truncate">{tx.paidTo || tx.sharedWith || '—'}</p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="text-xs text-gray-400 flex items-center gap-0.5">
                <i className={`${TYPE_ICONS[tx.type]} text-xs`} />{tx.type}
              </span>
              <span className="text-xs text-gray-400">{tx.date}</span>
              {tx.comment && <i className="ri-chat-1-line text-xs text-indigo-300" />}
            </div>
          </div>
        </div>
        <div className="ml-3 flex items-center gap-2">
          <p className={`font-bold ${amountColor}`}>{formatCurrency(amountDisplay)}</p>
          <i className={`${expanded ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'} text-gray-300 text-lg`} />
        </div>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-2 text-sm">
          {tx.fullAmount !== tx.myShare && tx.type === 'Shared' && (
            <div className="flex justify-between text-gray-600">
              <span className="flex items-center gap-1"><i className="ri-money-rupee-circle-line text-gray-400" />Full Amount</span>
              <span className="font-medium">{formatCurrency(tx.fullAmount)}</span>
            </div>
          )}
          {(tx.type === 'Shared' || tx.type === 'Lent' || tx.type === 'Borrowed') && (
            <div className="flex justify-between text-gray-600">
              <span className="flex items-center gap-1"><i className="ri-user-line text-gray-400" />
                {tx.type === 'Lent' ? 'Lent To' : tx.type === 'Borrowed' ? 'Borrowed From' : 'Shared With'}
              </span>
              <span className="font-medium">{tx.sharedWith}</span>
            </div>
          )}
          {tx.type === 'Shared' && (
            <div className="flex justify-between text-gray-600">
              <span className="flex items-center gap-1"><i className="ri-checkbox-circle-line text-gray-400" />Settlement</span>
              <span className={`font-medium ${tx.settlementStatus === 'Settled' ? 'text-green-600' : 'text-orange-500'}`}>
                {tx.settlementStatus}{tx.settlementDate ? ` · ${tx.settlementDate}` : ''}
              </span>
            </div>
          )}
          {tx.comment && (
            <div className="bg-gray-50 rounded-xl p-3 flex gap-2">
              <i className="ri-chat-1-line text-indigo-400 flex-shrink-0 mt-0.5" />
              <p className="text-gray-600 text-sm">{tx.comment}</p>
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <button onClick={() => onEdit(tx)}
              className="flex-1 py-2 rounded-xl text-sm font-medium bg-indigo-50 text-indigo-600 flex items-center justify-center gap-1.5 active:scale-95 transition-all">
              <i className="ri-edit-line" />Edit
            </button>
            <button onClick={handleDelete} disabled={deleting}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
                confirmDelete ? 'bg-red-500 text-white' : 'bg-red-50 text-red-600'
              }`}>
              <i className={confirmDelete ? 'ri-alert-line' : 'ri-delete-bin-line'} />
              {deleting ? 'Deleting…' : confirmDelete ? 'Confirm?' : 'Delete'}
            </button>
          </div>
          {confirmDelete && !deleting && (
            <button onClick={() => setConfirmDelete(false)} className="w-full text-xs text-gray-400 text-center flex items-center justify-center gap-1">
              <i className="ri-close-line" />Cancel
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function HistoryScreen({ transactions, onDelete, onEdit, allCategories }) {
  const [filters, setFilters] = useState({ month: 'All', category: 'All', type: 'All' });
  const [toast, setToast] = useState(null);
  const [editTx, setEditTx] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const filtered = useMemo(() => transactions.filter(tx => {
    if (filters.month !== 'All' && tx.month !== filters.month) return false;
    if (filters.category !== 'All' && tx.category !== filters.category) return false;
    if (filters.type !== 'All' && tx.type !== filters.type) return false;
    return true;
  }), [transactions, filters]);

  const handleDelete = async (id) => {
    try {
      await onDelete(id);
      setToast({ message: 'Deleted', type: 'success' });
    } catch (e) {
      setToast({ message: 'Delete failed: ' + e.message, type: 'error' });
    }
  };

  const handleEditSubmit = async (transactionId, form) => {
    setSubmitting(true);
    try {
      await onEdit(transactionId, form);
      setToast({ message: 'Updated!', type: 'success' });
      setEditTx(null);
    } catch (e) {
      setToast({ message: 'Update failed: ' + e.message, type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const setFilter = (key, val) => setFilters(f => ({ ...f, [key]: val }));

  const FilterRow = ({ options, filterKey }) => (
    <div className="flex gap-1.5 flex-wrap">
      {options.map(opt => (
        <button key={opt} onClick={() => setFilter(filterKey, opt)}
          className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
            filters[filterKey] === opt ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-600'
          }`}>
          {opt}
        </button>
      ))}
    </div>
  );

  const months = ['All', ...([...new Set(transactions.map(t => t.month))].filter(Boolean))];

  return (
    <div className="flex flex-col bg-gray-50 min-h-screen pb-24">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="bg-white border-b border-gray-100 px-4 py-3 space-y-3 sticky top-0 z-10">
        <h2 className="font-bold text-xl text-gray-900 flex items-center gap-2">
          <i className="ri-history-line text-indigo-500" />History
        </h2>
        <div>
          <p className="text-xs text-gray-400 font-medium mb-1">Month</p>
          <FilterRow options={months.slice(0, 4)} filterKey="month" />
        </div>
        <div className="flex gap-6">
          <div>
            <p className="text-xs text-gray-400 font-medium mb-1">Category</p>
            <FilterRow options={['All', ...allCategories.map(c => c.label)]} filterKey="category" />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium mb-1">Type</p>
            <FilterRow options={['All', 'Personal', 'Shared', 'Lent', 'Borrowed']} filterKey="type" />
          </div>
        </div>
      </div>

      <div className="px-4 py-3 space-y-2">
        <p className="text-xs text-gray-400 flex items-center gap-1">
          <i className="ri-list-check" />{filtered.length} transactions
        </p>
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <i className="ri-inbox-line text-5xl block mb-2" />
            <p>No transactions match your filters</p>
          </div>
        ) : (
          filtered.map(tx => (
            <TxRow key={tx.transactionId} tx={tx} onDelete={handleDelete} onEdit={setEditTx} allCategories={allCategories} />
          ))
        )}
      </div>

      {/* Edit modal */}
      {editTx && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center" onClick={() => setEditTx(null)}>
          <div className="bg-white rounded-t-3xl w-full max-w-lg overflow-y-auto" style={{ maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <i className="ri-edit-line text-indigo-500" />Edit Entry
              </h3>
              <button onClick={() => setEditTx(null)} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:bg-gray-100 rounded-lg">
                <i className="ri-close-line text-lg" />
              </button>
            </div>
            <div className="p-4">
              <LogForm editTx={editTx} onEditSubmit={handleEditSubmit} loading={submitting} allCategories={allCategories} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
