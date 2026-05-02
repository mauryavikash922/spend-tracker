import { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatCurrency, parseBucket } from '../../utils/formatters';

const BUCKET_COLORS = [
  '#6366f1', '#10b981', '#f59e0b', '#ec4899',
  '#14b8a6', '#f97316', '#8b5cf6', '#06b6d4', '#ef4444', '#84cc16',
];

function masked(amount, hidden) {
  return hidden ? '● ● ●' : formatCurrency(amount);
}

function getBucketColor(name, allNames) {
  const idx = allNames.indexOf(name);
  return BUCKET_COLORS[idx >= 0 ? idx % BUCKET_COLORS.length : 0];
}

export function InvestmentsScreen({ transactions, investmentBuckets, onAddBucket, onRemoveBucket }) {
  const [hidden, setHidden] = useState(true); // hidden by default for privacy
  const [selectedBucket, setSelectedBucket] = useState(null);
  const [newBucketName, setNewBucketName] = useState('');
  const [showAddBucket, setShowAddBucket] = useState(false);
  const [addingBucket, setAddingBucket] = useState(false);

  // All investment transactions with bucket parsed from comment
  const txWithBucket = useMemo(() =>
    transactions
      .filter(t => t.category === 'Investment')
      .map(tx => {
        const { bucket, userComment } = parseBucket(tx.comment);
        return { ...tx, bucketName: bucket || 'Uncategorised', userComment };
      }),
    [transactions]
  );

  const totalInvested = useMemo(
    () => txWithBucket.reduce((s, t) => s + (t.myShare || t.fullAmount || 0), 0),
    [txWithBucket]
  );

  // All unique bucket names (saved + from transactions)
  const allBucketNames = useMemo(() => {
    const fromSaved = investmentBuckets.map(b => b.name);
    const fromTx = txWithBucket.map(t => t.bucketName).filter(b => b !== 'Uncategorised');
    return [...new Set([...fromSaved, ...fromTx])];
  }, [investmentBuckets, txWithBucket]);

  // Per-bucket totals
  const bucketTotals = useMemo(() => {
    const map = {};
    txWithBucket.forEach(tx => {
      map[tx.bucketName] = (map[tx.bucketName] || 0) + (tx.myShare || tx.fullAmount || 0);
    });
    return map;
  }, [txWithBucket]);

  const pieData = useMemo(() =>
    allBucketNames
      .filter(name => (bucketTotals[name] || 0) > 0)
      .map(name => ({ name, value: bucketTotals[name] || 0 }))
      .sort((a, b) => b.value - a.value),
    [allBucketNames, bucketTotals]
  );

  const displayTx = selectedBucket
    ? txWithBucket.filter(t => t.bucketName === selectedBucket)
    : txWithBucket;

  const handleAddBucket = async () => {
    if (!newBucketName.trim()) return;
    setAddingBucket(true);
    try {
      await onAddBucket({ name: newBucketName.trim() });
      setNewBucketName('');
      setShowAddBucket(false);
    } finally {
      setAddingBucket(false);
    }
  };

  return (
    <div className="flex flex-col bg-gray-50 min-h-screen pb-24">

      {/* Hero Header */}
      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 pt-12 pb-8 px-4 text-white">
        <div className="flex items-start justify-between mb-2">
          <div>
            <p className="text-emerald-100 text-xs font-medium flex items-center gap-1 mb-1">
              <i className="ri-line-chart-line" /> Total Invested · All Time
            </p>
            <p className={`font-bold transition-all ${hidden ? 'text-2xl tracking-widest text-emerald-200' : 'text-3xl'}`}>
              {masked(totalInvested, hidden)}
            </p>
          </div>
          <button
            onClick={() => setHidden(h => !h)}
            title={hidden ? 'Show amounts' : 'Hide amounts'}
            className="w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center active:scale-95 transition-all mt-1"
          >
            <i className={`${hidden ? 'ri-eye-off-line' : 'ri-eye-line'} text-xl`} />
          </button>
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 mt-4 no-scrollbar">
          <button
            onClick={() => setSelectedBucket(null)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              !selectedBucket ? 'bg-white text-emerald-700' : 'bg-white/20 text-white'
            }`}
          >
            All
          </button>
          {allBucketNames.map(name => (
            <button
              key={name}
              onClick={() => setSelectedBucket(selectedBucket === name ? null : name)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                selectedBucket === name ? 'bg-white text-emerald-700' : 'bg-white/20 text-white'
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">

        {/* Donut Chart */}
        {pieData.length > 0 && (
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
              <i className="ri-pie-chart-line text-emerald-500" />
              Portfolio Split
            </h3>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={58}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                  onClick={d => setSelectedBucket(selectedBucket === d.name ? null : d.name)}
                >
                  {pieData.map((entry, i) => (
                    <Cell
                      key={entry.name}
                      fill={BUCKET_COLORS[i % BUCKET_COLORS.length]}
                      opacity={selectedBucket && selectedBucket !== entry.name ? 0.25 : 1}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={val => [hidden ? '● ● ●' : formatCurrency(val), 'Amount']}
                />
                <Legend
                  formatter={(name, entry) => {
                    const pct = totalInvested > 0
                      ? ((entry.payload.value / totalInvested) * 100).toFixed(1)
                      : '0';
                    return `${name}  ${pct}%`;
                  }}
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: '11px' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <p className="text-xs text-gray-400 text-center -mt-1 flex items-center justify-center gap-1">
              <i className="ri-cursor-line" /> Tap a slice to filter
            </p>
          </div>
        )}

        {/* Bucket Manager */}
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <i className="ri-folders-line text-emerald-500" />
              Buckets
            </h3>
            <button
              onClick={() => setShowAddBucket(v => !v)}
              className="flex items-center gap-1 text-sm text-emerald-600 font-semibold"
            >
              <i className="ri-add-line" /> New
            </button>
          </div>

          {showAddBucket && (
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. Mutual Fund 1, Stocks…"
                value={newBucketName}
                onChange={e => setNewBucketName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddBucket()}
                className="input-field flex-1 py-2.5 text-sm"
                autoFocus
                maxLength={30}
              />
              <button
                onClick={handleAddBucket}
                disabled={addingBucket || !newBucketName.trim()}
                className="btn-primary px-4 py-2.5 text-sm flex items-center gap-1 bg-emerald-500 hover:bg-emerald-600"
              >
                {addingBucket
                  ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <><i className="ri-check-line" /> Add</>
                }
              </button>
            </div>
          )}

          {allBucketNames.length === 0 && !showAddBucket && (
            <p className="text-sm text-gray-400 text-center py-3">
              Create buckets to organise your investments
            </p>
          )}

          {allBucketNames.map((name) => (
            <div key={name} className="flex items-center justify-between py-2 border-t border-gray-50 first:border-t-0">
              <div className="flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ background: getBucketColor(name, allBucketNames) }}
                />
                <span className="font-medium text-gray-800 text-sm">{name}</span>
                <span className="text-xs text-gray-400">
                  {txWithBucket.filter(t => t.bucketName === name).length} txn
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`font-semibold text-sm ${hidden ? 'text-gray-300 tracking-widest' : 'text-emerald-600'}`}>
                  {masked(bucketTotals[name] || 0, hidden)}
                </span>
                {investmentBuckets.some(b => b.name === name) && (
                  <button
                    onClick={() => onRemoveBucket(name)}
                    className="w-7 h-7 flex items-center justify-center text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <i className="ri-delete-bin-line text-sm" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Transaction List */}
        <div>
          <h3 className="font-semibold text-gray-700 text-sm flex items-center gap-2 mb-3">
            <i className="ri-history-line text-gray-400" />
            {selectedBucket ? `${selectedBucket}` : 'All Investments'}
            <span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-0.5 rounded-full font-semibold">
              {displayTx.length}
            </span>
          </h3>

          {displayTx.length === 0 ? (
            <div className="text-center py-14 text-gray-400">
              <i className="ri-line-chart-line text-5xl block mb-3 text-emerald-200" />
              <p className="font-medium">No investment transactions yet</p>
              <p className="text-xs mt-1">Log an expense with the <strong>Investment</strong> category</p>
            </div>
          ) : (
            <div className="space-y-2">
              {displayTx.map(tx => {
                const color = getBucketColor(tx.bucketName, allBucketNames);
                return (
                  <div key={tx.transactionId} className="card py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: color + '20', color }}
                      >
                        <i className="ri-line-chart-line text-base" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 text-sm truncate">{tx.paidTo || '—'}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span
                            className="text-xs font-semibold px-2 py-0.5 rounded-full"
                            style={{ background: color + '20', color }}
                          >
                            {tx.bucketName}
                          </span>
                          <span className="text-xs text-gray-400">{tx.date}</span>
                          {tx.userComment && (
                            <span className="text-xs text-gray-400 italic truncate max-w-[120px]">{tx.userComment}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <span className={`font-bold ml-3 flex-shrink-0 ${hidden ? 'text-xs text-gray-300 tracking-widest' : 'text-emerald-600'}`}>
                      {masked(tx.myShare || tx.fullAmount, hidden)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
