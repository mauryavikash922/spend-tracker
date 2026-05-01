import { useState } from 'react';
import { formatCurrency } from '../../utils/formatters';
import { Toast } from '../Layout/Toast';

function SettleModal({ person, totalOwed, direction, onConfirm, onClose, loading }) {
  const [amount, setAmount] = useState(String(totalOwed));
  const [partial, setPartial] = useState(false);
  const [comment, setComment] = useState('');
  const isCredit = direction === 'credit';

  const parsedAmount = parseFloat(amount) || 0;
  const isValid = parsedAmount > 0 && parsedAmount <= totalOwed;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="bg-white rounded-t-3xl w-full max-w-lg p-6 pb-8" onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
        <h3 className="font-bold text-xl text-gray-900 mb-1 flex items-center gap-2">
          <i className={`${isCredit ? 'ri-hand-coin-line text-green-500' : 'ri-refund-line text-blue-500'}`} />
          {isCredit ? `${person} paid you back` : `You paid back ${person}`}
        </h3>
        <p className="text-gray-500 text-sm mb-4">
          Total pending: <span className="font-semibold">{formatCurrency(totalOwed)}</span>
        </p>

        <div className="flex gap-2 mb-4">
          {[
            { label: 'Full Amount', icon: 'ri-checkbox-circle-line', isPartial: false },
            { label: 'Partial', icon: 'ri-edit-line', isPartial: true },
          ].map(opt => (
            <button key={opt.label} onClick={() => { setPartial(opt.isPartial); if (!opt.isPartial) setAmount(String(totalOwed)); }}
              className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all flex items-center justify-center gap-1.5 ${
                partial === opt.isPartial ? 'bg-indigo-500 text-white border-indigo-500' : 'border-gray-200 text-gray-600'
              }`}>
              <i className={opt.icon} />{opt.label}
            </button>
          ))}
        </div>

        {partial && (
          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Amount (₹)</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
              placeholder="Enter amount" className="input-field text-xl font-bold"
              autoFocus min="1" max={totalOwed} step="0.01" />
            {parsedAmount > totalOwed && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <i className="ri-alert-line" />Cannot exceed pending amount of {formatCurrency(totalOwed)}
              </p>
            )}
          </div>
        )}

        <div className="mb-4">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Note (optional)</label>
          <input type="text" value={comment} onChange={e => setComment(e.target.value)}
            placeholder="e.g. Cash, UPI, Bank transfer…" className="input-field" maxLength={100} />
        </div>

        <button onClick={() => onConfirm(parsedAmount, comment)}
          disabled={loading || !isValid}
          className="btn-primary w-full flex items-center justify-center gap-2">
          {loading
            ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : <><i className="ri-check-line" />Confirm — {formatCurrency(parsedAmount)}</>
          }
        </button>
      </div>
    </div>
  );
}

function PersonCard({ name, creditRows, debitRows, transactions, onSettle, onSettleDebt }) {
  const [expanded, setExpanded] = useState(false);
  const [settling, setSettling] = useState(null);

  const totalCredit = creditRows.filter(r => r.status === 'Pending').reduce((s, r) => s + r.amount, 0);
  const totalDebit = debitRows.filter(r => r.status === 'Pending').reduce((s, r) => s + r.amount, 0);
  const allRows = [...creditRows, ...debitRows].sort((a, b) => b.date?.localeCompare(a.date));

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-lg">
            {name[0].toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-gray-900">{name}</p>
            <div className="flex gap-3 mt-0.5">
              {totalCredit > 0 && (
                <span className="text-xs text-green-600 font-medium flex items-center gap-0.5">
                  <i className="ri-arrow-right-up-line" />Owes you {formatCurrency(totalCredit)}
                </span>
              )}
              {totalDebit > 0 && (
                <span className="text-xs text-orange-500 font-medium flex items-center gap-0.5">
                  <i className="ri-arrow-left-down-line" />You owe {formatCurrency(totalDebit)}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {totalCredit > 0 && (
            <button onClick={() => setSettling({ direction: 'credit', total: totalCredit })}
              className="bg-green-500 text-white text-xs font-semibold px-3 py-2 rounded-xl active:scale-95 transition-all flex items-center gap-1">
              <i className="ri-hand-coin-line" />Collect
            </button>
          )}
          {totalDebit > 0 && (
            <button onClick={() => setSettling({ direction: 'debit', total: totalDebit })}
              className="bg-blue-500 text-white text-xs font-semibold px-3 py-2 rounded-xl active:scale-95 transition-all flex items-center gap-1">
              <i className="ri-refund-line" />Repay
            </button>
          )}
        </div>
      </div>

      <button onClick={() => setExpanded(v => !v)}
        className="w-full text-center text-xs text-indigo-500 font-medium mt-3 pt-3 border-t border-gray-100 flex items-center justify-center gap-1">
        <i className={expanded ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'} />
        {expanded ? 'Hide' : `View ${allRows.length} transactions`}
      </button>

      {expanded && (
        <div className="mt-3 space-y-2">
          {allRows.map((row, i) => {
            const tx = transactions.find(t => t.transactionId === row.transactionId);
            const isCredit = row.direction === 'credit';
            return (
              <div key={i} className="flex items-center justify-between text-sm py-2 border-t border-gray-50">
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${isCredit ? 'bg-green-50' : 'bg-blue-50'}`}>
                    <i className={`${isCredit ? 'ri-arrow-right-up-line text-green-500' : 'ri-arrow-left-down-line text-blue-500'} text-sm`} />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800 text-xs">{row.note || tx?.paidTo || '—'}</p>
                    <p className="text-xs text-gray-400">{row.date}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-semibold text-sm ${isCredit ? 'text-green-600' : 'text-blue-600'}`}>
                    {isCredit ? '+' : '-'}{formatCurrency(row.amount)}
                  </p>
                  <span className={`badge text-xs flex items-center gap-0.5 justify-end mt-0.5 ${
                    row.status === 'Settled' ? 'bg-gray-100 text-gray-500' : isCredit ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
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

      {settling && (
        <SettleModal
          person={name}
          totalOwed={settling.total}
          direction={settling.direction}
          onConfirm={async (amt, comment) => {
            if (settling.direction === 'credit') await onSettle(name, amt, comment);
            else await onSettleDebt(name, amt, comment);
            setSettling(null);
          }}
          onClose={() => setSettling(null)}
          loading={false}
        />
      )}
    </div>
  );
}

export function PeopleScreen({ ledger, transactions, onSettle, onSettleDebt }) {
  const [toast, setToast] = useState(null);
  const [showAll, setShowAll] = useState(false);

  const allPeople = [...new Set(ledger.map(r => r.personName))];

  const handle = (fn, successMsg) => async (name, amt, comment) => {
    try {
      await fn(name, amt, comment);
      setToast({ message: successMsg, type: 'success' });
    } catch (e) {
      setToast({ message: 'Failed: ' + e.message, type: 'error' });
    }
  };

  const peopleData = allPeople.map(name => {
    const creditRows = ledger.filter(r => r.personName === name && r.direction === 'credit');
    const debitRows = ledger.filter(r => r.personName === name && r.direction === 'debit');
    const pendingCredit = creditRows.filter(r => r.status === 'Pending').reduce((s, r) => s + r.amount, 0);
    const pendingDebit = debitRows.filter(r => r.status === 'Pending').reduce((s, r) => s + r.amount, 0);
    return { name, creditRows, debitRows, pendingCredit, pendingDebit, totalPending: pendingCredit + pendingDebit };
  });

  // Sort by total pending amount descending
  peopleData.sort((a, b) => b.totalPending - a.totalPending);

  const visiblePeople = showAll ? peopleData : peopleData.filter(p => p.totalPending > 0);
  const settledCount = peopleData.filter(p => p.totalPending === 0).length;

  if (allPeople.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 text-center px-6">
        <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-4">
          <i className="ri-group-line text-3xl text-indigo-400" />
        </div>
        <h3 className="font-bold text-gray-900 text-lg mb-2">No people yet</h3>
        <p className="text-gray-500 text-sm">Log a Shared, Lent, or Borrowed expense to track balances here.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-gray-50 min-h-full pb-24">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="px-4 py-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-xl text-gray-900 flex items-center gap-2">
            <i className="ri-group-line text-indigo-500" />People
          </h2>
          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
            <button onClick={() => setShowAll(false)}
              className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-all ${!showAll ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'}`}>
              Active
            </button>
            <button onClick={() => setShowAll(true)}
              className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-all ${showAll ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'}`}>
              All
            </button>
          </div>
        </div>

        {/* Net summary */}
        {(() => {
          const totalReceivable = ledger.filter(r => r.direction === 'credit' && r.status === 'Pending').reduce((s, r) => s + r.amount, 0);
          const totalPayable = ledger.filter(r => r.direction === 'debit' && r.status === 'Pending').reduce((s, r) => s + r.amount, 0);
          return (
            <div className="flex gap-3">
              <div className="card flex-1 border-l-4 border-green-400">
                <p className="text-xs text-gray-500 flex items-center gap-1"><i className="ri-arrow-right-up-line text-green-500" />Others owe you</p>
                <p className="text-lg font-bold text-green-600 mt-0.5">{formatCurrency(totalReceivable)}</p>
              </div>
              <div className="card flex-1 border-l-4 border-blue-400">
                <p className="text-xs text-gray-500 flex items-center gap-1"><i className="ri-arrow-left-down-line text-blue-500" />You owe others</p>
                <p className="text-lg font-bold text-blue-600 mt-0.5">{formatCurrency(totalPayable)}</p>
              </div>
            </div>
          );
        })()}

        {visiblePeople.map(({ name, creditRows, debitRows }) => (
          <PersonCard
            key={name}
            name={name}
            creditRows={creditRows}
            debitRows={debitRows}
            transactions={transactions}
            onSettle={handle(onSettle, 'Settlement recorded!')}
            onSettleDebt={handle(onSettleDebt, 'Debt marked as repaid!')}
          />
        ))}

        {!showAll && settledCount > 0 && (
          <button onClick={() => setShowAll(true)}
            className="w-full text-center text-xs text-gray-400 py-2 flex items-center justify-center gap-1.5">
            <i className="ri-checkbox-circle-line text-green-400" />
            {settledCount} settled {settledCount === 1 ? 'person' : 'people'} hidden · tap to show all
          </button>
        )}
      </div>
    </div>
  );
}
