import { useState, useCallback, useRef, useEffect } from 'react';
import {
  getSheetData, appendTransaction, appendLedgerRows,
  deleteTransaction, settlePerson, settleDebt,
  updateTransaction, getCustomCategories, saveCustomCategories,
  getInvestmentBuckets, saveInvestmentBuckets,
} from '../utils/sheetsHelper';
import { toMonthLabel } from '../utils/formatters';
import { DEFAULT_CATEGORIES } from '../utils/categories';
import { v4 as uuidv4 } from 'uuid';

function buildLedgerRow(personName, transactionId, date, amount, note, direction) {
  return [personName, transactionId, date, amount, 'Pending', '', note, direction];
}

export function useGoogleSheets(token, sheetId) {
  const [transactions, setTransactions] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [customCategories, setCustomCategories] = useState([]);
  const [investmentBuckets, setInvestmentBuckets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const hasFetched = useRef(false);

  // Reset hasFetched whenever the token or sheetId changes (e.g. logout → re-login),
  // so the next fetchAll call always loads fresh data instead of bailing out early.
  useEffect(() => {
    hasFetched.current = false;
  }, [token, sheetId]);

  const allCategories = [...DEFAULT_CATEGORIES, ...customCategories];

  const fetchAll = useCallback(async (force = false) => {
    if (!token || !sheetId) return;
    if (hasFetched.current && !force) return;
    setLoading(true);
    setError(null);
    try {
      const [data, cats, buckets] = await Promise.all([
        getSheetData(token, sheetId),
        getCustomCategories(token, sheetId),
        getInvestmentBuckets(token, sheetId),
      ]);
      setTransactions(data.transactions);
      setLedger(data.ledger);
      setCustomCategories(cats);
      setInvestmentBuckets(buckets);
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
    const month = toMonthLabel(form.date);
    const type = form.type;
    const fullAmount = parseFloat(form.fullAmount);

    let myShare = fullAmount;
    if (type === 'Shared') {
      myShare = form.splitType === 'custom'
        ? parseFloat(form.myShare)
        : fullAmount / Math.max(1, parseInt(form.splitCount) || 1);
    } else if (type === 'Lent' || type === 'Borrowed') {
      myShare = 0;
    }

    const settlementStatus = (type === 'Shared' || type === 'Lent' || type === 'Borrowed') ? 'Pending' : 'NA';

    const txRow = [
      form.date, form.paidTo, fullAmount, myShare, form.category,
      type,
      (type === 'Shared' || type === 'Lent' || type === 'Borrowed') ? form.personName || form.sharedWith : '',
      type === 'Shared' ? (parseInt(form.splitCount) || 1) : 1,
      settlementStatus, '', transactionId, month, form.comment || '',
    ];

    await appendTransaction(token, sheetId, txRow);

    const ledgerRows = [];
    if (type === 'Shared') {
      const names = (form.sharedWith || '').split(',').map(n => n.trim()).filter(Boolean);
      const eachShare = myShare;
      names.forEach(name => {
        ledgerRows.push(buildLedgerRow(name, transactionId, form.date, eachShare, form.paidTo, 'credit'));
      });
    } else if (type === 'Lent') {
      ledgerRows.push(buildLedgerRow(form.personName, transactionId, form.date, fullAmount, form.paidTo || 'Lent', 'credit'));
    } else if (type === 'Borrowed') {
      ledgerRows.push(buildLedgerRow(form.personName, transactionId, form.date, fullAmount, form.paidTo || 'Borrowed', 'debit'));
    }

    if (ledgerRows.length) await appendLedgerRows(token, sheetId, ledgerRows);

    const newTx = {
      _rowIndex: transactions.length + 2,
      date: form.date, paidTo: form.paidTo, fullAmount, myShare,
      category: form.category, type,
      sharedWith: txRow[6],
      splitCount: txRow[7],
      settlementStatus, settlementDate: '', transactionId, month, comment: form.comment || '',
    };

    setTransactions(prev => [newTx, ...prev]);

    const newLedgerRows = ledgerRows.map((r, i) => ({
      rowIndex: ledger.length + i + 2,
      personName: r[0], transactionId: r[1], date: r[2],
      amount: r[3], status: 'Pending', settlementDate: '', note: r[6], direction: r[7],
    }));
    if (newLedgerRows.length) setLedger(prev => [...prev, ...newLedgerRows]);

    return transactionId;
  }, [token, sheetId, transactions, ledger]);

  const editExpense = useCallback(async (transactionId, form) => {
    if (!token || !sheetId) throw new Error('Not connected');
    const tx = transactions.find(t => t.transactionId === transactionId);
    if (!tx) throw new Error('Transaction not found');

    const fullAmount = parseFloat(form.fullAmount);
    const month = toMonthLabel(form.date);
    const type = tx.type;

    let myShare = fullAmount;
    if (type === 'Shared') {
      myShare = fullAmount / Math.max(1, tx.splitCount);
    } else if (type === 'Lent' || type === 'Borrowed') {
      myShare = 0;
    }

    const txRow = [
      form.date, form.paidTo, fullAmount, myShare, form.category,
      type, tx.sharedWith, tx.splitCount,
      tx.settlementStatus, tx.settlementDate, transactionId, month, form.comment || '',
    ];

    await updateTransaction(token, sheetId, tx._rowIndex, txRow);
    setTransactions(prev => prev.map(t =>
      t.transactionId === transactionId
        ? { ...t, date: form.date, paidTo: form.paidTo, fullAmount, myShare, category: form.category, month, comment: form.comment || '' }
        : t
    ));
  }, [token, sheetId, transactions]);

  const removeTx = useCallback(async (transactionId) => {
    if (!token || !sheetId) throw new Error('Not connected');
    await deleteTransaction(token, sheetId, transactionId);
    setTransactions(prev => prev.filter(t => t.transactionId !== transactionId));
    setLedger(prev => prev.filter(r => r.transactionId !== transactionId));
  }, [token, sheetId]);

  const settle = useCallback(async (personName, amount, comment = '') => {
    if (!token || !sheetId) throw new Error('Not connected');
    await settlePerson(token, sheetId, personName, amount, ledger, transactions, comment);
    await fetchAll(true);
  }, [token, sheetId, ledger, transactions, fetchAll]);

  const settleMyDebt = useCallback(async (personName, amount, comment = '') => {
    if (!token || !sheetId) throw new Error('Not connected');
    await settleDebt(token, sheetId, personName, amount, ledger, comment);
    await fetchAll(true);
  }, [token, sheetId, ledger, fetchAll]);

  const addCategory = useCallback(async (category) => {
    const updated = [...customCategories, category];
    setCustomCategories(updated);
    await saveCustomCategories(token, sheetId, updated);
  }, [token, sheetId, customCategories]);

  const removeCategory = useCallback(async (label) => {
    const updated = customCategories.filter(c => c.label !== label);
    setCustomCategories(updated);
    await saveCustomCategories(token, sheetId, updated);
  }, [token, sheetId, customCategories]);

  const addBucket = useCallback(async (bucket) => {
    const updated = [...investmentBuckets, bucket];
    setInvestmentBuckets(updated);
    await saveInvestmentBuckets(token, sheetId, updated);
  }, [token, sheetId, investmentBuckets]);

  const removeBucket = useCallback(async (name) => {
    const updated = investmentBuckets.filter(b => b.name !== name);
    setInvestmentBuckets(updated);
    await saveInvestmentBuckets(token, sheetId, updated);
  }, [token, sheetId, investmentBuckets]);

  const personNames = [...new Set(
    transactions
      .filter(t => ['Shared', 'Lent', 'Borrowed'].includes(t.type) && t.sharedWith)
      .flatMap(t => t.sharedWith.split(',').map(n => n.trim()))
      .filter(Boolean)
  )];

  return {
    transactions, ledger, customCategories, allCategories,
    investmentBuckets,
    loading, error, fetchAll,
    logExpense, editExpense, removeTx,
    settle, settleMyDebt,
    addCategory, removeCategory,
    addBucket, removeBucket,
    personNames,
  };
}
