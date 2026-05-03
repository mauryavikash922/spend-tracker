import { useState, useMemo } from 'react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { Header } from '../Layout/Header';
import { formatCurrency, currentMonthLabel, monthLabels } from '../../utils/formatters';

// Fixed colours for the 3 defaults; extras cycle through this palette
const DEFAULT_COLORS = { Need: '#6366f1', Want: '#ec4899', Investment: '#22c55e' };
const EXTRA_COLORS = ['#f59e0b', '#14b8a6', '#f97316', '#8b5cf6', '#06b6d4', '#ef4444', '#84cc16'];

function getCatColor(label, allCategories) {
  if (DEFAULT_COLORS[label]) return DEFAULT_COLORS[label];
  const customOnly = allCategories.filter(c => !DEFAULT_COLORS[c.label]);
  const idx = customOnly.findIndex(c => c.label === label);
  return EXTRA_COLORS[idx >= 0 ? idx % EXTRA_COLORS.length : 0];
}

function SummaryCard({ label, value, color, icon }) {
  return (
    <div className="card flex-shrink-0 min-w-[110px]">
      <div className="flex items-center gap-1.5 mb-1">
        <i className={`${icon} text-base`} style={{ color }} />
        <p className="text-xs text-gray-500 font-medium truncate">{label}</p>
      </div>
      <p className="text-base font-bold" style={{ color }}>{value}</p>
    </div>
  );
}

export function ReportsScreen({ user, transactions, ledger, allCategories = [], onLogout }) {
  const [selectedMonth, setSelectedMonth] = useState(currentMonthLabel());
  const [drillCategory, setDrillCategory] = useState(null);

  const monthTx = useMemo(
    () => transactions.filter(t => t.month === selectedMonth),
    [transactions, selectedMonth]
  );

  // Compute totals dynamically for ALL categories
  const totals = useMemo(() => {
    const byCategory = {};
    allCategories.forEach(cat => {
      byCategory[cat.label] = monthTx
        .filter(t => t.category === cat.label)
        .reduce((s, t) => s + t.myShare, 0);
    });
    const total = Object.values(byCategory).reduce((s, v) => s + v, 0);
    const sharedTotal = monthTx.filter(t => t.type === 'Shared').reduce((s, t) => s + t.fullAmount, 0);
    const pendingDues = ledger
      .filter(r => r.status === 'Pending' && r.direction === 'credit')
      .reduce((s, r) => s + r.amount, 0);
    const recovered = ledger
      .filter(r => r.status === 'Settled' && r.direction === 'credit')
      .reduce((s, r) => s + r.amount, 0);
    return { byCategory, total, sharedTotal, pendingDues, recovered };
  }, [monthTx, ledger, allCategories]);

  // Pie data — one slice per category with spend > 0
  const pieData = useMemo(() =>
    allCategories
      .map(cat => ({ name: cat.label, value: totals.byCategory[cat.label] || 0 }))
      .filter(d => d.value > 0),
    [allCategories, totals]
  );

  // Bar data — one entry per month, one key per category
  const barData = useMemo(() => {
    const last6 = monthLabels(6);
    return last6.map(month => {
      const txs = transactions.filter(t => t.month === month);
      const entry = { month: month.split(' ')[0] };
      allCategories.forEach(cat => {
        entry[cat.label] = txs
          .filter(t => t.category === cat.label)
          .reduce((s, t) => s + t.myShare, 0);
      });
      return entry;
    });
  }, [transactions, allCategories]);

  const drillTx = drillCategory ? monthTx.filter(t => t.category === drillCategory) : [];

  return (
    <div className="flex flex-col bg-gray-50 min-h-screen">
      <Header user={user} selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} onLogout={onLogout} />

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-24 space-y-4">

        {/* Top summary row */}
        <div className="flex gap-3">
          <SummaryCard label="Total Spent" value={formatCurrency(totals.total)} icon="ri-wallet-3-line" color="#111827" />
          <SummaryCard label="Pending Dues" value={formatCurrency(totals.pendingDues)} icon="ri-time-line" color="#f97316" />
        </div>

        {/* Per-category cards — horizontally scrollable, all categories */}
        {allCategories.length > 0 && (
          <div className="flex gap-3 overflow-x-auto pb-1">
            {allCategories.map(cat => (
              <SummaryCard
                key={cat.label}
                label={cat.label}
                value={formatCurrency(totals.byCategory[cat.label] || 0)}
                icon={cat.icon}
                color={getCatColor(cat.label, allCategories)}
              />
            ))}
          </div>
        )}

        {/* Donut chart */}
        {pieData.length > 0 && (
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <i className="ri-pie-chart-line text-indigo-500" />
              Category Breakdown
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                  onClick={d => setDrillCategory(drillCategory === d.name ? null : d.name)}
                >
                  {pieData.map(entry => (
                    <Cell key={entry.name} fill={getCatColor(entry.name, allCategories)} />
                  ))}
                </Pie>
                <Tooltip formatter={val => formatCurrency(val)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
            <p className="text-xs text-gray-400 text-center mt-1 flex items-center justify-center gap-1">
              <i className="ri-cursor-line" /> Tap a segment to see transactions
            </p>
          </div>
        )}

        {/* Category drilldown */}
        {drillCategory && drillTx.length > 0 && (
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <i className="ri-list-check text-indigo-500" />
                {drillCategory} Transactions
              </h3>
              <button onClick={() => setDrillCategory(null)} className="text-gray-400 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100">
                <i className="ri-close-line text-lg" />
              </button>
            </div>
            <div className="space-y-2">
              {drillTx.map(tx => (
                <div key={tx.transactionId} className="flex items-center justify-between text-sm py-2 border-t border-gray-50">
                  <div>
                    <p className="font-medium text-gray-900">{tx.paidTo}</p>
                    <p className="text-xs text-gray-400 flex items-center gap-1"><i className="ri-calendar-line" />{tx.date}</p>
                  </div>
                  <span className="font-semibold text-gray-900">{formatCurrency(tx.myShare)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bar chart — dynamic bars per category */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <i className="ri-bar-chart-2-line text-indigo-500" />
            Last 6 Months
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v}`} />
              <Tooltip formatter={val => formatCurrency(val)} />
              {allCategories.map((cat, i) => (
                <Bar
                  key={cat.label}
                  dataKey={cat.label}
                  fill={getCatColor(cat.label, allCategories)}
                  stackId="a"
                  radius={i === allCategories.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Shared expense summary */}
        {totals.sharedTotal > 0 && (
          <div className="card space-y-2">
            <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <i className="ri-group-line text-indigo-500" />
              Shared Expense Summary
            </h3>
            {[
              { label: 'Paid on behalf of others', value: totals.sharedTotal, color: 'text-gray-900', icon: 'ri-hand-coin-line' },
              { label: 'Recovered (settled)', value: totals.recovered, color: 'text-green-600', icon: 'ri-checkbox-circle-line' },
              { label: 'Still pending', value: totals.pendingDues, color: 'text-orange-500', icon: 'ri-time-line' },
            ].map(item => (
              <div key={item.label} className="flex justify-between items-center text-sm py-1">
                <span className="text-gray-500 flex items-center gap-1.5">
                  <i className={`${item.icon} ${item.color}`} />
                  {item.label}
                </span>
                <span className={`font-semibold ${item.color}`}>{formatCurrency(item.value)}</span>
              </div>
            ))}
          </div>
        )}

        {monthTx.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <i className="ri-bar-chart-2-line text-5xl block mb-2" />
            <p>No transactions for {selectedMonth}</p>
          </div>
        )}
      </div>
    </div>
  );
}
