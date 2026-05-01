import { useState } from 'react';
import { LogForm } from './LogForm';
import { Header } from '../Layout/Header';
import { Toast } from '../Layout/Toast';
import { formatCurrency, currentMonthLabel } from '../../utils/formatters';

const CATEGORY_STYLES = {
  Need: 'bg-blue-100 text-blue-700',
  Want: 'bg-pink-100 text-pink-700',
  Investment: 'bg-green-100 text-green-700',
};

const TYPE_ICONS = {
  Personal: 'ri-user-line',
  Shared: 'ri-group-line',
  Lent: 'ri-arrow-right-up-line',
  Borrowed: 'ri-arrow-left-down-line',
};

export function HomeScreen({ user, transactions, onLogExpense, onEditExpense, allCategories, personNames, onLogout }) {
  const [toast, setToast] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthLabel());
  const [editTx, setEditTx] = useState(null);

  const monthTx = transactions.filter(t => t.month === selectedMonth);
  const totalSpent = monthTx
    .filter(t => t.type !== 'Borrowed')
    .reduce((s, t) => s + t.myShare, 0);

  const handleSubmit = async (form) => {
    setSubmitting(true);
    try {
      await onLogExpense(form);
      setToast({ message: 'Expense logged!', type: 'success' });
    } catch (e) {
      setToast({ message: 'Failed: ' + e.message, type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (transactionId, form) => {
    setSubmitting(true);
    try {
      await onEditExpense(transactionId, form);
      setToast({ message: 'Updated!', type: 'success' });
      setEditTx(null);
    } catch (e) {
      setToast({ message: 'Update failed: ' + e.message, type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const getCatStyle = (cat) => CATEGORY_STYLES[cat] || 'bg-gray-100 text-gray-600';
  const getCatIcon = (cat) => allCategories.find(c => c.label === cat)?.icon || 'ri-bill-line';

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header user={user} selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} onLogout={onLogout} />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Summary strip */}
      <div className="bg-indigo-500 text-white px-4 py-4">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-indigo-200 text-xs font-medium flex items-center gap-1">
              <i className="ri-calendar-line" /> Spent this month
            </p>
            <p className="text-2xl font-bold mt-0.5">{formatCurrency(totalSpent)}</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-24">
        <div className="card">
          <h2 className="font-bold text-gray-900 mb-4 text-lg flex items-center gap-2">
            <i className="ri-add-circle-line text-indigo-500" />Quick Log
          </h2>
          <LogForm
            onSubmit={handleSubmit}
            loading={submitting}
            personNames={personNames}
            allCategories={allCategories}
          />
        </div>

        {/* Recent transactions */}
        {monthTx.length > 0 && (
          <div className="mt-4">
            <h3 className="font-semibold text-gray-700 mb-2 text-sm flex items-center gap-1">
              <i className="ri-history-line text-gray-400" />Recent ({selectedMonth})
            </h3>
            <div className="space-y-2">
              {monthTx.slice(0, 5).map(tx => (
                <div key={tx.transactionId} className="card flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${getCatStyle(tx.category)}`}>
                      <i className={`${getCatIcon(tx.category)} text-base`} />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{tx.paidTo || tx.sharedWith}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <i className={`${TYPE_ICONS[tx.type] || 'ri-bill-line'} text-xs text-gray-400`} />
                        <span className="text-xs text-gray-400">{tx.type} · {tx.date}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900">{formatCurrency(tx.myShare || tx.fullAmount)}</span>
                    <button onClick={() => setEditTx(tx)} className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors">
                      <i className="ri-edit-line text-sm" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Edit modal */}
      {editTx && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center" onClick={() => setEditTx(null)}>
          <div className="bg-white rounded-t-3xl w-full max-w-lg overflow-y-auto" style={{ maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-3" />
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <i className="ri-edit-line text-indigo-500" />Edit Entry
                </h3>
              </div>
              <button onClick={() => setEditTx(null)} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:bg-gray-100 rounded-lg">
                <i className="ri-close-line text-lg" />
              </button>
            </div>
            <div className="p-4">
              <LogForm
                editTx={editTx}
                onEditSubmit={handleEdit}
                loading={submitting}
                personNames={personNames}
                allCategories={allCategories}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
