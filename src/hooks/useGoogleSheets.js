import { useState, useCallback, useRef } from 'react';
import { getSheetData, appendTransaction, appendLedgerRows, deleteTransaction, settleFlatmate } from '../utils/sheetsHelper';
import { buildFlatmateLedgerRows } from '../utils/splitCalculator';
import { toMonthLabel, todayStr } from '../utils/formatters';
import { v4 as uuidv4 } from 'uuid';

export function useGoogleSheets(token, sheetId) {
  const [transactions, setTransactions] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const hasFetched = useRef(false);

  const fetchAll = useCallback(async (force = false) => {
    if (!token || !sheetId) return;
    if (hasFetched.current && !force) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getSheetData(token, sheetId);
      setTransactions(data.transactions.reverse());
      setLedger(data.ledger);
      hasFetched.current = true;
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [token, sheetId]);

  const logExpense = useCallback(async (form) => {
    if (!token || !sheetId) throw new Error('Not connected');
    const transactionId = uuidv4();
    const myShare = form.type === 'Personal'
      ? parseFloat(form.fullAmount)
      : form.splitType === 'custom'
        ? parseFloat(form.myShare)
        : parseFloat(form.fullAmount) / Math.max(1, parseInt(form.splitCount) || 1);
    const month = toMonthLabel(form.date);

    const txRow = [
      form.date,
      form.paidTo,
      parseFloat(form.fullAmount),
      myShare,
      form.category,
      form.type,
      form.type === 'Shared' ? form.sharedWith : '',
      form.type === 'Shared' ? (parseInt(form.splitCount) || 1) : 1,
      form.type === 'Shared' ? 'Pending' : 'NA',
      '',
      transactionId,
      month,
    ];

    await appendTransaction(token, sheetId, txRow);

    if (form.type === 'Shared') {
      const ledgerRows = buildFlatmateLedgerRows({
        date: form.date,
        paidTo: form.paidTo,
        fullAmount: parseFloat(form.fullAmount),
        splitCount: parseInt(form.splitCount) || 1,
        sharedWith: form.sharedWith,
        transactionId,
      });
      const ledgerRowsFormatted = ledgerRows.map(r => [
        r.flatmateName, r.transactionId, r.date, r.amountOwed, r.status, r.settlementDate, r.note,
      ]);
      await appendLedgerRows(token, sheetId, ledgerRowsFormatted);
    }

    const newTx = {
      date: form.date,
      paidTo: form.paidTo,
      fullAmount: parseFloat(form.fullAmount),
      myShare,
      category: form.category,
      type: form.type,
      sharedWith: form.type === 'Shared' ? form.sharedWith : '',
      splitCount: form.type === 'Shared' ? (parseInt(form.splitCount) || 1) : 1,
      settlementStatus: form.type === 'Shared' ? 'Pending' : 'NA',
      settlementDate: '',
      transactionId,
      month,
    };

    setTransactions(prev => [newTx, ...prev]);

    if (form.type === 'Shared') {
      const newLedgerRows = buildFlatmateLedgerRows({
        date: form.date, paidTo: form.paidTo,
        fullAmount: parseFloat(form.fullAmount),
        splitCount: parseInt(form.splitCount) || 1,
        sharedWith: form.sharedWith,
        transactionId,
      }).map((r, i) => ({ ...r, rowIndex: ledger.length + i + 2 }));
      setLedger(prev => [...prev, ...newLedgerRows]);
    }

    return transactionId;
  }, [token, sheetId, ledger]);

  const removeTx = useCallback(async (transactionId) => {
    if (!token || !sheetId) throw new Error('Not connected');
    await deleteTransaction(token, sheetId, transactionId);
    setTransactions(prev => prev.filter(t => t.transactionId !== transactionId));
    await fetchAll(true);
  }, [token, sheetId, fetchAll]);

  const settle = useCallback(async (flatmateName, amount) => {
    if (!token || !sheetId) throw new Error('Not connected');
    await settleFlatmate(token, sheetId, flatmateName, amount, ledger, transactions);
    await fetchAll(true);
  }, [token, sheetId, ledger, transactions, fetchAll]);

  const flatmateNames = [...new Set(
    transactions
      .filter(t => t.type === 'Shared' && t.sharedWith)
      .flatMap(t => t.sharedWith.split(',').map(n => n.trim()))
      .filter(Boolean)
  )];

  return { transactions, ledger, loading, error, fetchAll, logExpense, removeTx, settle, flatmateNames };
}
