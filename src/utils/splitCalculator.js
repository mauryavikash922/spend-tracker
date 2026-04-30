export function calcEqualSplit(totalAmount, splitCount) {
  const count = Math.max(1, parseInt(splitCount) || 1);
  return Math.round((totalAmount / count) * 100) / 100;
}

export function buildFlatmateLedgerRows(transaction) {
  const { date, paidTo, fullAmount, splitCount, sharedWith, transactionId } = transaction;
  const names = (sharedWith || '').split(',').map(n => n.trim()).filter(Boolean);
  const eachShare = calcEqualSplit(fullAmount, splitCount);
  return names.map(name => ({
    flatmateName: name,
    transactionId,
    date,
    amountOwed: eachShare,
    status: 'Pending',
    settlementDate: '',
    note: paidTo,
  }));
}
