import { useState, useMemo } from 'react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { Header } from '../Layout/Header';
import { formatCurrency, currentMonthLabel, monthLabels } from '../../utils/formatters';

const COLORS = { Need: '#6366f1', Want: '#ec4899', Investment: '#22c55e' };

function SummaryCard({ label, value, color, icon }) {
  return (
    <div className="card flex-1 min-w-0">
      <div className="flex items-center gap-1.5 mb-1">
        <i className={`${icon} text-base ${color || 'text-gray-400'}`} />
        <p className="text-xs text-gray-500 font-medium truncate">{label}</p>
      </div>
      <p className={`text-lg font-bold ${color || 'text-gray-900'}`}>{value}</p>
    </div>
  );
}

export function ReportsScreen({ user, transactions, ledger, onLogout }) {
  const [selectedMonth, setSelectedMonth] = useState(currentMonthLabel());
  const [drillCategory, setDrillCategory] = useState(null);

  const monthTx = useMemo(
    () => transactions.filter(t => t.month === selectedMonth),
    [transactions, selectedMonth]
  );

  const totals = useMemo(() => {
    const need = monthTx.filter(t => t.category === 'Need').reduce((s, t) => s + t.myShare, 0);
    const want = monthTx.filter(t => t.category === 'Want').reduce((s, t) => s + t.myShare, 0);
    const inv = monthTx.filter(t => t.category === 'Investment').reduce((s, t) => s + t.myShare, 0);
    const total = need + want + inv;
    const sharedTotal = monthTx.filter(t => t.type === 'Shared').reduce((s, t) => s + t.fullAmount, 0);
    const pendingDues = ledger.filter(r => r.status === 'Pending').reduce((s, r) => s + r.amountOwed, 0);
    const recovered = ledger.filter(r => r.status === 'Settled').reduce((s, r) => s + r.amountOwed, 0);
    return { need, want, inv, total, sharedTotal, pendingDues, recovered };
  }, [monthTx, ledger]);

  const pieData = [
    { name: 'Need', value: totals.need },
    { name: 'Want', value: totals.want },
    { name: 'Investment', value: totals.inv },
  ].filter(d => d.value > 0);

  const last6 = monthLabels(6);
  const barData = last6.map(month => {
    const txs = transactions.filter(t => t.month === month);
    return {
      month: month.split(' ')[0],
      Need: txs.filter(t => t.category === 'Need').reduce((s, t) => s + t.myShare, 0),
      Want: txs.filter(t => t.category === 'Want').reduce((s, t) => s + t.myShare, 0),
      Investment: txs.filter(t => t.category === 'Investment').reduce((s, t) => s + t.myShare, 0),
    };
  });

  const drillTx = drillCategory ? monthTx.filter(t => t.category === drillCategory) : [];

  return (
    <div className="flex flex-col bg-gray-50 min-h-screen">
      <Header user={user} selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} onLogout={onLogout} />

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-24 space-y-4">

        {/* Summary cards */}
        <div className="flex gap-3">
          <SummaryCard label="Total Spent" value={formatCurrency(totals.total)} icon="ri-wallet-3-line" color="text-gray-900" />
          <SummaryCard label="Pending Dues" value={formatCurrency(totals.pendingDues)} icon="ri-time-line" color="text-orange-500" />
        </div>
        <div className="flex gap-3">
          <SummaryCard label="Need" value={formatCurrency(totals.need)} icon="ri-shopping-cart-line" color="text-indigo-600" />
          <SummaryCard label="Want" value={formatCurrency(totals.want)} icon="ri-price-tag-3-line" color="text-pink-500" />
          <SummaryCard label="Investment" value={formatCurrency(totals.inv)} icon="ri-line-chart-line" color="text-green-600" />
        </div>

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
                    <Cell key={entry.name} fill={COLORS[entry.name]} />
                  ))}
                </Pie>
                <Tooltip formatter={(val) => formatCurrency(val)} />
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

        {/* Bar chart */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <i className="ri-bar-chart-2-line text-indigo-500" />
            Last 6 Months
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${v >= 1000 ? (v/1000).toFixed(1)+'k' : v}`} />
              <Tooltip formatter={(val) => formatCurrency(val)} />
              <Bar dataKey="Need" fill={COLORS.Need} stackId="a" />
              <Bar dataKey="Want" fill={COLORS.Want} stackId="a" />
              <Bar dataKey="Investment" fill={COLORS.Investment} stackId="a" radius={[4, 4, 0, 0]} />
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
