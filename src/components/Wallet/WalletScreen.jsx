import { useState, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { formatCurrency, currentMonthLabel, todayStr } from '../../utils/formatters';

const BANK_COLORS = ['#6366f1','#10b981','#f59e0b','#ec4899','#14b8a6','#f97316'];
const CARD_GRADIENTS = {
  'grad-dark':    'linear-gradient(135deg,#1e293b,#0f172a)',
  'grad-indigo':  'linear-gradient(135deg,#4f46e5,#7c3aed)',
  'grad-emerald': 'linear-gradient(135deg,#059669,#0d9488)',
  'grad-orange':  'linear-gradient(135deg,#ea580c,#dc2626)',
  'grad-blue':    'linear-gradient(135deg,#2563eb,#0891b2)',
};
const GRAD_KEYS = Object.keys(CARD_GRADIENTS);

function masked(v, hidden) { return hidden ? '● ● ●' : formatCurrency(v); }

function computeBalances(wallets, transactions, month) {
  const res = {};
  wallets.forEach(w => {
    if (w.type === 'bank') {
      let b = w.initialBalance || 0;
      transactions.forEach(t => {
        if (t.wallet !== w.name) return;
        const amt = t.fullAmount || 0;
        const share = t.myShare || 0;
        if (t.type === 'Credit' || t.type === 'Borrowed') b += amt;
        else if (t.type === 'CardPayment') b -= amt;
        else if (t.type === 'Shared') b -= amt;
        else b -= share;
      });
      res[w.name] = { balance: b };
    } else {
      const spent = transactions
        .filter(t => t.wallet === w.name && t.month === month && !['Credit','CardPayment'].includes(t.type))
        .reduce((s, t) => s + (t.myShare || t.fullAmount || 0), 0) + (w.currentMonthSpends || 0);
      const paid = transactions
        .filter(t => t.type === 'CardPayment' && t.paidTo === w.name && t.month === month)
        .reduce((s, t) => s + (t.fullAmount || 0), 0);
      const outstanding = Math.max(0, spent - paid);
      res[w.name] = { outstanding, available: Math.max(0, (w.creditLimit || 0) - outstanding), thisMonthSpend: spent, paid };
    }
  });
  return res;
}

// ── Sub-modals ────────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="bg-white rounded-t-3xl w-full max-w-lg" style={{ maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:bg-gray-100 rounded-lg">
            <i className="ri-close-line text-lg" />
          </button>
        </div>
        <div className="p-4 space-y-4">{children}</div>
      </div>
    </div>
  );
}

function InputRow({ label, type = 'text', value, onChange, placeholder }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="input-field w-full" />
    </div>
  );
}

function RecentTxList({ txs, hidden, isDark, walletName, onRemoveTx }) {
  if (txs.length === 0) return (
    <p className={`text-xs text-center mt-3 pt-3 border-t ${isDark ? 'border-white/20 text-white/50' : 'border-gray-100 text-gray-400'}`}>No transactions this month</p>
  );
  return (
    <div className={`mt-3 pt-3 border-t space-y-2 ${isDark ? 'border-white/20 text-white/90' : 'border-gray-100 text-gray-700'}`}>
      <p className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-white/60' : 'text-gray-400'}`}>This Month&apos;s Activity</p>
      {txs.map(t => {
        const isCredit = t.type === 'Credit' || t.type === 'Borrowed' || (t.type === 'CardPayment' && t.paidTo === walletName);
        return (
          <div key={t.transactionId} className="flex justify-between items-center text-xs group">
            <div className="truncate pr-2 flex items-center gap-1.5">
              <span className={`opacity-60 text-[10px]`}>{t.date.substring(0, 5)}</span>
              <span className="truncate">{t.paidTo || t.category}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`font-semibold tabular-nums shrink-0 ${isCredit ? (isDark ? 'text-emerald-300' : 'text-emerald-600') : ''}`}>
                {isCredit ? '+' : '-'} {masked(t.myShare || t.fullAmount || 0, hidden)}
              </span>
              <button onClick={(e) => { e.stopPropagation(); onRemoveTx(t); }} className={`p-1 rounded opacity-50 active:scale-95 transition-all ${isDark ? 'hover:bg-white/20 hover:opacity-100' : 'hover:bg-gray-200 hover:opacity-100'}`}>
                <i className="ri-delete-back-2-line" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Bank Account card ─────────────────────────────────────────────────────────

function BankCard({ wallet, balance, hidden, txs, onUpdateBalance, onAddCredit, onDelete, onRemoveTx }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="card flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer" onClick={() => setExpanded(!expanded)}>
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: wallet.color + '20' }}>
            <i className="ri-bank-line text-xl" style={{ color: wallet.color }} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-gray-900 truncate">{wallet.name}</p>
            <p className={`text-lg font-bold ${hidden ? 'tracking-widest text-gray-300 text-sm' : ''}`}
              style={hidden ? {} : { color: wallet.color }}>
              {masked(balance, hidden)}
            </p>
          </div>
          <i className={`ri-arrow-${expanded ? 'up' : 'down'}-s-line text-gray-400`} />
        </div>
        <div className="flex gap-1.5 flex-shrink-0">
          <button onClick={onAddCredit} title="Add Credit"
            className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center active:scale-95 transition-all">
            <i className="ri-arrow-down-circle-line" />
          </button>
          <button onClick={onUpdateBalance} title="Update Balance"
            className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center active:scale-95 transition-all">
            <i className="ri-edit-line" />
          </button>
          <button onClick={onDelete} title="Delete"
            className="w-8 h-8 rounded-xl bg-red-50 text-red-400 flex items-center justify-center active:scale-95 transition-all">
            <i className="ri-delete-bin-line text-sm" />
          </button>
        </div>
      </div>
      {expanded && <RecentTxList txs={txs} hidden={hidden} isDark={false} walletName={wallet.name} onRemoveTx={onRemoveTx} />}
    </div>
  );
}

// ── Credit Card ───────────────────────────────────────────────────────────────

function CreditCardUI({ wallet, bal, hidden, txs, onPayBill, onEdit, onDelete, onRemoveTx }) {
  const [expanded, setExpanded] = useState(false);
  const grad = CARD_GRADIENTS[wallet.color] || CARD_GRADIENTS['grad-dark'];
  const usedPct = wallet.creditLimit > 0 ? Math.min(100, ((bal.outstanding || 0) / wallet.creditLimit) * 100) : 0;
  return (
    <div className="rounded-2xl p-5 text-white shadow-xl relative overflow-hidden flex flex-col" style={{ background: grad }}>
      {/* Decorative circles */}
      <div className="absolute right-4 top-4 flex opacity-30 pointer-events-none">
        <div className="w-14 h-14 rounded-full bg-white" />
        <div className="w-14 h-14 rounded-full bg-white/60 -ml-7" />
      </div>
      {/* Header row */}
      <div className="flex justify-between items-start mb-6 relative z-10">
        <div className="cursor-pointer flex-1" onClick={() => setExpanded(!expanded)}>
          <p className="font-bold text-lg flex items-center gap-1">
            {wallet.name} <i className={`ri-arrow-${expanded ? 'up' : 'down'}-s-line opacity-50`} />
          </p>
          <p className="text-white/60 text-xs mt-0.5">
            Limit {hidden ? '●●●●' : formatCurrency(wallet.creditLimit)}
            {wallet.billDate && ` • Bill: ${wallet.billDate}th`}
          </p>
        </div>
        <div className="flex gap-1.5 z-10 shrink-0">
          <button onClick={onEdit} className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/10 active:scale-95">
            <i className="ri-edit-line text-sm" />
          </button>
          <button onClick={onDelete} className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/10 active:scale-95">
            <i className="ri-delete-bin-line text-sm" />
          </button>
        </div>
      </div>
      {/* Chip */}
      <div className="w-10 h-7 rounded bg-yellow-300/80 mb-6 grid grid-cols-2 gap-0.5 p-1 relative z-10">
        {[0,1,2,3].map(i => <div key={i} className="bg-yellow-600/40 rounded-sm" />)}
      </div>
      {/* Stats */}
      <div className="flex justify-between mb-3 relative z-10">
        <div><p className="text-white/60 text-xs">This Month</p>
          <p className="font-bold text-xl">{masked(bal.outstanding || 0, hidden)}</p>
        </div>
        <div className="text-right"><p className="text-white/60 text-xs">Available</p>
          <p className="font-bold text-xl">{masked(bal.available || 0, hidden)}</p>
        </div>
      </div>
      {/* Usage bar */}
      <div className="bg-white/20 rounded-full h-1.5 mb-3 relative z-10">
        <div className="bg-white rounded-full h-1.5 transition-all" style={{ width: `${usedPct}%` }} />
      </div>
      <button onClick={onPayBill}
        className="flex items-center gap-1.5 text-xs font-semibold bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-all active:scale-95 w-max relative z-10">
        <i className="ri-bank-card-line" /> Pay Bill
      </button>

      {expanded && <RecentTxList txs={wallet.currentMonthSpends > 0 ? [{ transactionId: `init-${wallet.id}`, date: wallet.createdAt, paidTo: 'Spends So Far', type: 'Personal', myShare: wallet.currentMonthSpends, wallet: wallet.name }, ...txs] : txs} hidden={hidden} isDark={true} walletName={wallet.name} onRemoveTx={onRemoveTx} />}
    </div>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export function WalletScreen({ transactions, wallets, onAddWallet, onRemoveWallet, onUpdateWallet, onLogExpense, onRemoveTx }) {
  const [hidden, setHidden] = useState(true);
  const [modal, setModal] = useState(null); // 'addBank'|'addCard'|'updateBal'|'addCredit'|'payCard'
  const [target, setTarget] = useState(null); // wallet for action
  const [saving, setSaving] = useState(false);
  const month = currentMonthLabel();

  // form state for all modals
  const [mName, setMName] = useState('');
  const [mAmount, setMAmount] = useState('');
  const [mLimit, setMLimit] = useState('');
  const [mColor, setMColor] = useState(BANK_COLORS[0]);
  const [mGrad, setMGrad] = useState(GRAD_KEYS[0]);
  const [mNote, setMNote] = useState('');
  const [mPayFrom, setMPayFrom] = useState('');
  const [mBillDate, setMBillDate] = useState('');
  const [mThisMonth, setMThisMonth] = useState('');

  const balances = useMemo(() => computeBalances(wallets, transactions, month), [wallets, transactions, month]);
  const banks = wallets.filter(w => w.type === 'bank');
  const cards = wallets.filter(w => w.type === 'credit');

  const netWorth = useMemo(() => {
    const bankTotal = banks.reduce((s, w) => s + (balances[w.name]?.balance || 0), 0);
    const cardDebt = cards.reduce((s, w) => s + (balances[w.name]?.outstanding || 0), 0);
    return bankTotal - cardDebt;
  }, [banks, cards, balances]);

  function closeModal() { setModal(null); setTarget(null); setMName(''); setMAmount(''); setMLimit(''); setMNote(''); setMPayFrom(''); setMBillDate(''); setMThisMonth(''); }

  async function handleRemoveLocalTx(walletId, tx) {
    if (tx.transactionId.startsWith('init-')) {
      await onUpdateWallet(walletId, { currentMonthSpends: 0 });
    } else {
      await onRemoveTx(tx.transactionId);
    }
  }

  async function handleAddBank() {
    if (!mName.trim()) return;
    setSaving(true);
    try {
      await onAddWallet({ id: uuidv4(), name: mName.trim(), type: 'bank', color: mColor, initialBalance: parseFloat(mAmount) || 0, creditLimit: 0, createdAt: todayStr() });
      closeModal();
    } finally { setSaving(false); }
  }

  async function handleAddCard() {
    if (!mName.trim() || !mLimit) return;
    setSaving(true);
    try {
      await onAddWallet({ id: uuidv4(), name: mName.trim(), type: 'credit', color: mGrad, initialBalance: 0, creditLimit: parseFloat(mLimit) || 0, createdAt: todayStr(), billDate: mBillDate, currentMonthSpends: parseFloat(mThisMonth) || 0 });
      closeModal();
    } finally { setSaving(false); }
  }

  async function handleEditCard() {
    if (!mName.trim() || !mLimit) return;
    setSaving(true);
    try {
      await onUpdateWallet(target.id, { name: mName.trim(), creditLimit: parseFloat(mLimit) || 0, color: mGrad, billDate: mBillDate, currentMonthSpends: parseFloat(mThisMonth) || 0 });
      closeModal();
    } finally { setSaving(false); }
  }

  async function handleUpdateBalance() {
    if (!mAmount) return;
    setSaving(true);
    try { await onUpdateWallet(target.id, { initialBalance: parseFloat(mAmount) || 0 }); closeModal(); }
    finally { setSaving(false); }
  }

  async function handleAddCredit() {
    if (!mAmount) return;
    setSaving(true);
    try {
      await onLogExpense({ amount: mAmount, fullAmount: parseFloat(mAmount), paidTo: mNote || 'Credit', category: 'Credit', type: 'Credit', date: todayStr(), comment: mNote || '', wallet: target.name, investmentBucket: '', personName: '', sharedWith: '', splitCount: '1', splitType: 'equal', myShare: parseFloat(mAmount) });
      closeModal();
    } finally { setSaving(false); }
  }

  async function handlePayBill() {
    if (!mAmount || !mPayFrom) return;
    setSaving(true);
    try {
      await onLogExpense({ amount: mAmount, fullAmount: parseFloat(mAmount), paidTo: target.name, category: 'CardPayment', type: 'CardPayment', date: todayStr(), comment: mNote || '', wallet: mPayFrom, investmentBucket: '', personName: '', sharedWith: '', splitCount: '1', splitType: 'equal', myShare: parseFloat(mAmount) });
      closeModal();
    } finally { setSaving(false); }
  }

  const bankOptions = banks.map(b => b.name);

  return (
    <div className="flex flex-col bg-gray-50 min-h-screen pb-24">

      {/* Hero */}
      <div className="bg-gradient-to-br from-violet-600 to-indigo-700 px-4 pt-12 pb-8 text-white">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-violet-200 text-xs font-medium flex items-center gap-1 mb-1">
              <i className="ri-wallet-3-line" /> Net Worth
            </p>
            <p className={`font-bold transition-all ${hidden ? 'text-2xl tracking-widest text-violet-300' : 'text-3xl'}`}>
              {masked(netWorth, hidden)}
            </p>
            <p className="text-violet-200 text-xs mt-1">{banks.length} account{banks.length !== 1 ? 's' : ''} · {cards.length} card{cards.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={() => setHidden(h => !h)}
            className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center active:scale-95 transition-all mt-1">
            <i className={`${hidden ? 'ri-eye-off-line' : 'ri-eye-line'} text-xl`} />
          </button>
        </div>
      </div>

      <div className="px-4 py-4 space-y-5">

        {/* Bank Accounts */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <i className="ri-bank-line text-violet-500" /> Bank Accounts
            </h3>
            <button onClick={() => { setMColor(BANK_COLORS[banks.length % BANK_COLORS.length]); setModal('addBank'); }}
              className="flex items-center gap-1 text-sm text-violet-600 font-semibold">
              <i className="ri-add-line" /> Add
            </button>
          </div>
          {banks.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4 card">No bank accounts yet — add one to track your balance</p>
          )}
          <div className="space-y-3">
            {banks.map(w => {
              const txs = transactions.filter(t => t.month === month && (t.wallet === w.name || (t.type === 'CardPayment' && t.wallet === w.name)));
              return (
                <BankCard key={w.id} wallet={w} balance={balances[w.name]?.balance || 0} hidden={hidden} txs={txs}
                  onUpdateBalance={() => { setTarget(w); setMAmount(String(balances[w.name]?.balance || 0)); setModal('updateBal'); }}
                  onAddCredit={() => { setTarget(w); setModal('addCredit'); }}
                  onDelete={() => onRemoveWallet(w.id)}
                  onRemoveTx={(tx) => handleRemoveLocalTx(w.id, tx)} />
              );
            })}
          </div>
        </div>

        {/* Credit Cards */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <i className="ri-bank-card-line text-violet-500" /> Credit Cards
            </h3>
            <button onClick={() => { setMGrad(GRAD_KEYS[cards.length % GRAD_KEYS.length]); setModal('addCard'); }}
              className="flex items-center gap-1 text-sm text-violet-600 font-semibold">
              <i className="ri-add-line" /> Add
            </button>
          </div>
          {cards.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4 card">No credit cards yet — add one to track spending</p>
          )}
          <div className="space-y-4">
            {cards.map(w => {
              const txs = transactions.filter(t => t.month === month && (t.wallet === w.name || (t.type === 'CardPayment' && t.paidTo === w.name)));
              return (
                <CreditCardUI key={w.id} wallet={w} bal={balances[w.name] || {}} hidden={hidden} txs={txs}
                  onPayBill={() => { setTarget(w); setMPayFrom(banks[0]?.name || ''); setModal('payCard'); }}
                  onEdit={() => { setTarget(w); setMName(w.name); setMLimit(String(w.creditLimit || '')); setMGrad(w.color || GRAD_KEYS[0]); setMBillDate(w.billDate || ''); setMThisMonth(String(w.currentMonthSpends || '')); setModal('editCard'); }}
                  onDelete={() => onRemoveWallet(w.id)}
                  onRemoveTx={(tx) => handleRemoveLocalTx(w.id, tx)} />
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Modals ── */}

      {modal === 'addBank' && (
        <Modal title="Add Bank Account" onClose={closeModal}>
          <InputRow label="Account Name" value={mName} onChange={setMName} placeholder="e.g. HDFC Bank, SBI" />
          <InputRow label="Current Balance (₹)" type="number" value={mAmount} onChange={setMAmount} placeholder="0" />
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Colour</label>
            <div className="flex gap-3">
              {BANK_COLORS.map(c => (
                <button key={c} onClick={() => setMColor(c)} type="button"
                  className={`w-8 h-8 rounded-full transition-all ${mColor === c ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''}`}
                  style={{ background: c }} />
              ))}
            </div>
          </div>
          <button onClick={handleAddBank} disabled={saving || !mName.trim()}
            className="btn-primary w-full flex items-center justify-center gap-2">
            {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><i className="ri-bank-line" /> Add Account</>}
          </button>
        </Modal>
      )}

      {modal === 'addCard' && (
        <Modal title="Add Credit Card" onClose={closeModal}>
          <InputRow label="Card Name" value={mName} onChange={setMName} placeholder="e.g. HDFC Regalia, SBI Prime" />
          <InputRow label="Credit Limit (₹)" type="number" value={mLimit} onChange={setMLimit} placeholder="100000" />
          <div className="grid grid-cols-2 gap-3">
            <InputRow label="Bill Gen Date (Optional)" type="number" value={mBillDate} onChange={setMBillDate} placeholder="e.g. 15" />
            <InputRow label="Spends So Far (₹)" type="number" value={mThisMonth} onChange={setMThisMonth} placeholder="0" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Card Theme</label>
            <div className="flex gap-2 flex-wrap">
              {GRAD_KEYS.map(k => (
                <button key={k} onClick={() => setMGrad(k)} type="button"
                  className={`w-16 h-10 rounded-lg transition-all ${mGrad === k ? 'ring-2 ring-offset-2 ring-gray-400 scale-105' : ''}`}
                  style={{ background: CARD_GRADIENTS[k] }} />
              ))}
            </div>
          </div>
          <button onClick={handleAddCard} disabled={saving || !mName.trim() || !mLimit}
            className="btn-primary w-full flex items-center justify-center gap-2">
            {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><i className="ri-bank-card-line" /> Add Card</>}
          </button>
        </Modal>
      )}

      {modal === 'editCard' && target && (
        <Modal title="Edit Credit Card" onClose={closeModal}>
          <InputRow label="Card Name" value={mName} onChange={setMName} placeholder="e.g. HDFC Regalia, SBI Prime" />
          <InputRow label="Credit Limit (₹)" type="number" value={mLimit} onChange={setMLimit} placeholder="100000" />
          <div className="grid grid-cols-2 gap-3">
            <InputRow label="Bill Gen Date (Optional)" type="number" value={mBillDate} onChange={setMBillDate} placeholder="e.g. 15" />
            <InputRow label="Spends So Far (₹)" type="number" value={mThisMonth} onChange={setMThisMonth} placeholder="0" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Card Theme</label>
            <div className="flex gap-2 flex-wrap">
              {GRAD_KEYS.map(k => (
                <button key={k} onClick={() => setMGrad(k)} type="button"
                  className={`w-16 h-10 rounded-lg transition-all ${mGrad === k ? 'ring-2 ring-offset-2 ring-gray-400 scale-105' : ''}`}
                  style={{ background: CARD_GRADIENTS[k] }} />
              ))}
            </div>
          </div>
          <button onClick={handleEditCard} disabled={saving || !mName.trim() || !mLimit}
            className="btn-primary w-full flex items-center justify-center gap-2">
            {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><i className="ri-save-line" /> Save Changes</>}
          </button>
        </Modal>
      )}

      {modal === 'updateBal' && target && (
        <Modal title={`Update Balance — ${target.name}`} onClose={closeModal}>
          <p className="text-xs text-gray-500">This sets a new base balance. Subsequent transactions will adjust from this value.</p>
          <InputRow label="Current Balance (₹)" type="number" value={mAmount} onChange={setMAmount} placeholder="0" />
          <button onClick={handleUpdateBalance} disabled={saving || !mAmount}
            className="btn-primary w-full flex items-center justify-center gap-2">
            {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><i className="ri-save-line" /> Save</>}
          </button>
        </Modal>
      )}

      {modal === 'addCredit' && target && (
        <Modal title={`Add Credit to ${target.name}`} onClose={closeModal}>
          <p className="text-xs text-gray-500">Log money received into this account (salary, refund, transfer).</p>
          <InputRow label="Amount (₹)" type="number" value={mAmount} onChange={setMAmount} placeholder="0" />
          <InputRow label="Source (optional)" value={mNote} onChange={setMNote} placeholder="e.g. Salary, Refund" />
          <button onClick={handleAddCredit} disabled={saving || !mAmount}
            className="btn-primary w-full flex items-center justify-center gap-2" style={{ background: '#10b981' }}>
            {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><i className="ri-arrow-down-circle-line" /> Log Credit</>}
          </button>
        </Modal>
      )}

      {modal === 'payCard' && target && (
        <Modal title={`Pay Bill — ${target.name}`} onClose={closeModal}>
          <p className="text-xs text-gray-500">Outstanding this month: <strong>{masked(balances[target.name]?.outstanding || 0, false)}</strong></p>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Pay From</label>
            <div className="flex gap-2 flex-wrap">
              {bankOptions.map(n => (
                <button key={n} type="button" onClick={() => setMPayFrom(n)}
                  className={`px-3 py-2 rounded-xl text-sm font-medium border transition-all ${mPayFrom === n ? 'bg-violet-500 text-white border-violet-500' : 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                  {n}
                </button>
              ))}
              {bankOptions.length === 0 && <p className="text-xs text-gray-400">No bank accounts yet</p>}
            </div>
          </div>
          <InputRow label="Payment Amount (₹)" type="number" value={mAmount} onChange={setMAmount} placeholder="0" />
          <InputRow label="Note (optional)" value={mNote} onChange={setMNote} placeholder="e.g. Full payment" />
          <button onClick={handlePayBill} disabled={saving || !mAmount || !mPayFrom}
            className="btn-primary w-full flex items-center justify-center gap-2">
            {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><i className="ri-bank-card-line" /> Pay Bill</>}
          </button>
        </Modal>
      )}
    </div>
  );
}
