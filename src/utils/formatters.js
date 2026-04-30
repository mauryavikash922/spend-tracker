export function formatCurrency(amount) {
  return `₹${Number(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function formatDate(dateStr) {
  if (!dateStr) return '';
  const [d, m, y] = dateStr.split('/');
  return `${d}/${m}/${y}`;
}

export function todayStr() {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export function dateToInputValue(dateStr) {
  if (!dateStr) return '';
  const [dd, mm, yyyy] = dateStr.split('/');
  return `${yyyy}-${mm}-${dd}`;
}

export function inputValueToDate(val) {
  if (!val) return '';
  const [yyyy, mm, dd] = val.split('-');
  return `${dd}/${mm}/${yyyy}`;
}

export function toMonthLabel(dateStr) {
  if (!dateStr) return '';
  const [, mm, yyyy] = dateStr.split('/');
  const date = new Date(`${yyyy}-${mm}-01`);
  return date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

export function currentMonthLabel() {
  return new Date().toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

export function monthLabels(count = 6) {
  const labels = [];
  const d = new Date();
  for (let i = count - 1; i >= 0; i--) {
    const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
    labels.push(m.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }));
  }
  return labels;
}

export function prevMonth(label) {
  const [mon, yr] = label.split(' ');
  const d = new Date(`${mon} 1 ${yr}`);
  d.setMonth(d.getMonth() - 1);
  return d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

export function nextMonth(label) {
  const [mon, yr] = label.split(' ');
  const d = new Date(`${mon} 1 ${yr}`);
  d.setMonth(d.getMonth() + 1);
  return d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}
