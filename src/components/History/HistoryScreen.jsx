import { useState, useMemo } from 'react';
import { formatCurrency, monthLabels, currentMonthLabel } from '../../utils/formatters';
import { Toast } from '../Layout/Toast';

const CATEGORY_STYLES = {
  Need: { bg: 'bg-blue-100 text-blue-700', icon: 'ri-shopping-cart-line' },
  Want: { bg: 'bg-pink-100 text-pink-700', icon: 'ri-price-tag-3-line' },
  Investment: { bg: 'bg-green-100 text-green-700', icon: 'ri-line-chart-line' },
};

function TxRow({ tx, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    try { await onDelete(tx.transactionId); } finally { setDeleting(false); }
  };

  const catStyle = CATEGORY_STYLES[tx.category] || { bg: 'bg-gray-100 text-gray-600', icon: 'ri-bill-line' };

  return (
    <div className="card py-3">
      <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpanded(e => !e)}>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${catStyle.bg}`}>
            <i className={`${catStyle.icon} text-base`} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-medium text-gray-900 text-sm truncate">{tx.paidTo}</p>
              {tx.type === 'Shared' && (
                <span className="badge bg-purple-100 text-purple-700 text-xs flex items-center gap-0.5">
                  <i className="ri-group-line text-xs" /> Shared
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
              <i className="ri-calendar-line" /> {tx.date}
            </p>
          </div>
        </div>
        <div className="text-right ml-3 flex-shrink-0 flex items-center gap-2">
          <p className="font-bold text-gray-900">{formatCurrency(tx.myShare)}</p>
          <i className={`${expanded ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'} text-gray-300 text-lg`} />
        </div>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-2 text-sm">
          <div className="flex justify-between text-gray-600">
            <span className="flex items-center gap-1"><i className="ri-money-rupee-circle-line text-gray-400" /> Full Amount</span>
            <span className="font-medium">{formatCurrency(tx.fullAmount)}</span>
          </div>
          {tx.type === 'Shared' && (
            <>
              <div className="flex justify-between text-gray-600">
                <span className="flex items-center gap-1"><i className="ri-group-line text-gray-400" /> Shared With</span>
                <span className="font-medium">{tx.sharedWith}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span className="flex items-center gap-1"><i className="ri-team-line text-gray-400" /> Split Count</span>
                <span className="font-medium">{tx.splitCount} people</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span className="flex items-center gap-1"><i className="ri-checkbox-circle-line text-gray-400" /> Settlement</span>
                <span className={`font-medium ${
                  tx.settlementStatus === 'Settled' ? 'text-green-600' :
                  tx.settlementStatus === 'Pending' ? 'text-orange-500' : 'text-gray-500'
                }`}>
                  {tx.settlementStatus}{tx.settlementDate ? ` (${tx.settlementDate})` : ''}
                </span>
              </div>
            </>
          )}
          <div className="flex justify-between text-gray-400 text-xs">
            <span className="flex items-center gap-1"><i className="ri-fingerprint-line" /> ID</span>
            <span className="truncate max-w-[140px]">{tx.transactionId}</span>
          </div>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className={`w-full py-2 rounded-xl text-sm font-medium transition-all mt-1 flex items-center justify-center gap-1.5 ${
              confirmDelete ? 'bg-red-500 text-white' : 'bg-red-50 text-red-600'
            }`}
          >
            <i className={confirmDelete ? 'ri-alert-line' : 'ri-delete-bin-line'} />
            {deleting ? 'Deleting…' : confirmDelete ? 'Tap again to confirm delete' : 'Delete transaction'}
          </button>
          {confirmDelete && !deleting && (
            <button onClick={() => setConfirmDelete(false)} className="w-full text-xs text-gray-400 text-center flex items-center justify-center gap-1">
              <i className="ri-close-line" /> Cancel
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function HistoryScreen({ transactions, onDelete }) {
  const [filters, setFilters] = useState({
    month: 'All',
    category: 'All',
    type: 'All',
    settlement: 'All',
  });
  const [toast, setToast] = useState(null);

  const filtered = useMemo(() => {
    return transactions.filter(tx => {
      if (filters.month !== 'All' && tx.month !== filters.month) return false;
      if (filters.category !== 'All' && tx.category !== filters.category) return false;
      if (filters.type !== 'All' && tx.type !== filters.type) return false;
      if (filters.settlement !== 'All' && tx.settlementStatus !== filters.settlement) return false;
      return true;
    });
  }, [transactions, filters]);

  const handleDelete = async (id) => {
    try {
      await onDelete(id);
      setToast({ message: 'Transaction deleted', type: 'success' });
    } catch (e) {
      setToast({ message: 'Delete failed: ' + e.message, type: 'error' });
    }
  };

  const setFilter = (key, val) => setFilters(f => ({ ...f, [key]: val }));

  const FilterRow = ({ options, filterKey }) => (
    <div className="flex gap-1.5 flex-wrap">
      {options.map(opt => (
        <button
          key={opt}
          onClick={() => setFilter(filterKey, opt)}
          className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
            filters[filterKey] === opt
              ? 'bg-indigo-500 text-white'
              : 'bg-gray-100 text-gray-600'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );

  return (
    <div className="flex flex-col bg-gray-50 min-h-screen pb-24">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Filters */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 space-y-3 sticky top-0 z-10">
        <h2 className="font-bold text-xl text-gray-900 flex items-center gap-2">
          <i className="ri-history-line text-indigo-500" />
          History
        </h2>
        <div>
          <p className="text-xs text-gray-400 font-medium mb-1">Month</p>
          <FilterRow options={['All', currentMonthLabel()]} filterKey="month" />
        </div>
        <div className="flex gap-6">
          <div>
            <p className="text-xs text-gray-400 font-medium mb-1">Category</p>
            <FilterRow options={['All', 'Need', 'Want', 'Investment']} filterKey="category" />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium mb-1">Type</p>
            <FilterRow options={['All', 'Personal', 'Shared']} filterKey="type" />
          </div>
        </div>
      </div>

      {/* List */}
      <div className="px-4 py-3 space-y-2">
        <p className="text-xs text-gray-400 flex items-center gap-1">
          <i className="ri-list-check" /> {filtered.length} transactions
        </p>
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <i className="ri-inbox-line text-5xl block mb-2" />
            <p>No transactions match your filters</p>
          </div>
        ) : (
          filtered.map(tx => (
            <TxRow key={tx.transactionId} tx={tx} onDelete={handleDelete} />
          ))
        )}
      </div>
    </div>
  );
}
