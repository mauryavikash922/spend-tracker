import { useState } from 'react';
import { formatCurrency } from '../../utils/formatters';
import { Toast } from '../Layout/Toast';

function SettleModal({ flatmate, totalOwed, onConfirm, onClose, loading }) {
  const [amount, setAmount] = useState(String(totalOwed));
  const [partial, setPartial] = useState(false);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="bg-white rounded-t-3xl w-full max-w-lg p-6 pb-8" onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
        <h3 className="font-bold text-xl text-gray-900 mb-1 flex items-center gap-2">
          <i className="ri-hand-coin-line text-indigo-500" />
          Settle with {flatmate}
        </h3>
        <p className="text-gray-500 text-sm mb-4">Total pending: {formatCurrency(totalOwed)}</p>

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => { setPartial(false); setAmount(String(totalOwed)); }}
            className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all flex items-center justify-center gap-1.5 ${
              !partial ? 'bg-indigo-500 text-white border-indigo-500' : 'border-gray-200 text-gray-600'
            }`}
          >
            <i className="ri-checkbox-circle-line" />
            Full Settlement
          </button>
          <button
            onClick={() => { setPartial(true); setAmount(''); }}
            className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all flex items-center justify-center gap-1.5 ${
              partial ? 'bg-indigo-500 text-white border-indigo-500' : 'border-gray-200 text-gray-600'
            }`}
          >
            <i className="ri-edit-line" />
            Partial Amount
          </button>
        </div>

        {partial && (
          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Amount Paid (₹)</label>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="Enter amount"
              className="input-field text-xl font-bold"
              autoFocus
              min="1"
              max={totalOwed}
              step="0.01"
            />
          </div>
        )}

        <button
          onClick={() => onConfirm(parseFloat(amount) || 0)}
          disabled={loading || !amount || parseFloat(amount) <= 0}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <i className="ri-check-line text-lg" />
              Confirm — {formatCurrency(parseFloat(amount) || 0)}
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export function FlatmateScreen({ ledger, transactions, onSettle, loading }) {
  const [settling, setSettling] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [expandedFlatmate, setExpandedFlatmate] = useState(null);

  const flatmates = [...new Set(ledger.map(r => r.flatmateName))];

  const getFlatmateData = (name) => {
    const rows = ledger.filter(r => r.flatmateName === name);
    const pending = rows.filter(r => r.status === 'Pending').reduce((s, r) => s + r.amountOwed, 0);
    const settled = rows.filter(r => r.status === 'Settled').reduce((s, r) => s + r.amountOwed, 0);
    return { rows, pending, settled };
  };

  const handleSettle = async (amount) => {
    setSubmitting(true);
    try {
      await onSettle(settling, amount);
      setToast({ message: `Settlement recorded for ${settling}!`, type: 'success' });
      setSettling(null);
    } catch (e) {
      setToast({ message: 'Failed: ' + e.message, type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  if (flatmates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 text-center px-6">
        <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-4">
          <i className="ri-group-line text-3xl text-indigo-400" />
        </div>
        <h3 className="font-bold text-gray-900 text-lg mb-2">No shared expenses yet</h3>
        <p className="text-gray-500 text-sm">Log a shared expense from the Home tab to track flatmate dues here.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-gray-50 min-h-full pb-24">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="px-4 py-4 space-y-3">
        <h2 className="font-bold text-xl text-gray-900 flex items-center gap-2">
          <i className="ri-group-line text-indigo-500" />
          Flatmate Ledger
        </h2>

        {flatmates.map(name => {
          const { rows, pending, settled } = getFlatmateData(name);
          const isExpanded = expandedFlatmate === name;

          return (
            <div key={name} className="card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-lg">
                    {name[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{name}</p>
                    {settled > 0 && (
                      <p className="text-xs text-gray-400 flex items-center gap-1">
                        <i className="ri-checkbox-circle-line text-green-500" />
                        Settled: {formatCurrency(settled)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-xs text-gray-400">Owes you</p>
                    <p className={`font-bold text-lg ${pending > 0 ? 'text-orange-500' : 'text-green-500'}`}>
                      {formatCurrency(pending)}
                    </p>
                  </div>
                  {pending > 0 && (
                    <button
                      onClick={() => setSettling(name)}
                      className="bg-indigo-500 text-white text-sm font-semibold px-3 py-2 rounded-xl active:scale-95 transition-all flex items-center gap-1"
                    >
                      <i className="ri-hand-coin-line" />
                      Settle
                    </button>
                  )}
                </div>
              </div>

              <button
                onClick={() => setExpandedFlatmate(isExpanded ? null : name)}
                className="w-full text-center text-xs text-indigo-500 font-medium mt-3 pt-3 border-t border-gray-100 flex items-center justify-center gap-1"
              >
                <i className={isExpanded ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'} />
                {isExpanded ? 'Hide transactions' : `View ${rows.length} transactions`}
              </button>

              {isExpanded && (
                <div className="mt-3 space-y-2">
                  {rows.map((row, i) => {
                    const tx = transactions.find(t => t.transactionId === row.transactionId);
                    return (
                      <div key={i} className="flex items-center justify-between text-sm py-2 border-t border-gray-50">
                        <div className="flex items-center gap-2">
                          <i className="ri-receipt-line text-gray-300 text-base" />
                          <div>
                            <p className="font-medium text-gray-800">{row.note || tx?.paidTo || '—'}</p>
                            <p className="text-xs text-gray-400">{row.date}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">{formatCurrency(row.amountOwed)}</p>
                          <span className={`badge text-xs flex items-center gap-0.5 justify-end ${
                            row.status === 'Settled' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                          }`}>
                            <i className={row.status === 'Settled' ? 'ri-checkbox-circle-line' : 'ri-time-line'} />
                            {row.status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {settling && (
        <SettleModal
          flatmate={settling}
          totalOwed={getFlatmateData(settling).pending}
          onConfirm={handleSettle}
          onClose={() => setSettling(null)}
          loading={submitting}
        />
      )}
    </div>
  );
}
