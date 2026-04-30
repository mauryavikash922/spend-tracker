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

const CATEGORY_ICONS = {
  Need: 'ri-shopping-cart-line',
  Want: 'ri-price-tag-3-line',
  Investment: 'ri-line-chart-line',
};

export function HomeScreen({ user, transactions, onLogExpense, loading, flatmateNames, onLogout }) {
  const [toast, setToast] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthLabel());

  const monthTx = transactions.filter(t => t.month === selectedMonth);
  const totalSpent = monthTx.reduce((s, t) => s + t.myShare, 0);
  const pendingDues = transactions
    .filter(t => t.settlementStatus === 'Pending')
    .reduce((s, t) => s + (t.fullAmount - t.myShare) / Math.max(1, t.splitCount - 1), 0);

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
          {pendingDues > 0 && (
            <div className="text-right">
              <p className="text-indigo-200 text-xs font-medium flex items-center gap-1 justify-end">
                <i className="ri-time-line" /> Pending dues
              </p>
              <p className="text-lg font-bold text-yellow-300 mt-0.5">{formatCurrency(pendingDues)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-24">
        <div className="card">
          <h2 className="font-bold text-gray-900 mb-4 text-lg flex items-center gap-2">
            <i className="ri-add-circle-line text-indigo-500" />
            Quick Log
          </h2>
          <LogForm onSubmit={handleSubmit} loading={submitting} flatmateNames={flatmateNames} />
        </div>

        {/* Recent transactions */}
        {monthTx.length > 0 && (
          <div className="mt-4">
            <h3 className="font-semibold text-gray-700 mb-2 text-sm flex items-center gap-1">
              <i className="ri-history-line text-gray-400" />
              Recent ({selectedMonth})
            </h3>
            <div className="space-y-2">
              {monthTx.slice(0, 5).map(tx => (
                <div key={tx.transactionId} className="card flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${CATEGORY_STYLES[tx.category] || 'bg-gray-100 text-gray-600'}`}>
                      <i className={`${CATEGORY_ICONS[tx.category] || 'ri-bill-line'} text-base`} />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{tx.paidTo}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {tx.type === 'Shared' && (
                          <span className="badge bg-purple-100 text-purple-700 text-xs flex items-center gap-0.5">
                            <i className="ri-group-line text-xs" /> Shared
                          </span>
                        )}
                        <span className="text-xs text-gray-400">{tx.date}</span>
                      </div>
                    </div>
                  </div>
                  <span className="font-bold text-gray-900">{formatCurrency(tx.myShare)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
