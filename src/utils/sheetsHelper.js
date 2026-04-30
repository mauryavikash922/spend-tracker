const SHEET_NAME_PREFIX = 'My Spends';
const YEAR = new Date().getFullYear();
const SHEET_TITLE = `${SHEET_NAME_PREFIX} - ${YEAR}`;

const TABS = {
  TRANSACTIONS: 'Transactions',
  LEDGER: 'Flatmate Ledger',
  SUMMARY: 'Monthly Summary',
};

const TX_HEADERS = [
  'Date', 'Paid To', 'Full Amount', 'My Share', 'Category',
  'Type', 'Shared With', 'Split Count', 'Settlement Status',
  'Settlement Date', 'Transaction ID', 'Month',
];

const LEDGER_HEADERS = [
  'Flatmate Name', 'Transaction ID', 'Date', 'Amount Owed',
  'Status', 'Settlement Date', 'Note',
];

const SUMMARY_HEADERS = ['Month', 'Total Spent', 'Need', 'Want', 'Investment', 'Shared Total', 'Pending Dues'];

async function apiRequest(token, path, method = 'GET', body = null) {
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `API error ${res.status}`);
  }
  return res.json();
}

async function driveSearch(token, name) {
  const q = encodeURIComponent(`name='${name}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`);
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  return data.files?.[0] || null;
}

export async function findOrCreateSheet(token) {
  const existing = await driveSearch(token, SHEET_TITLE);
  if (existing) return existing.id;

  const sheet = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      properties: { title: SHEET_TITLE },
      sheets: [
        { properties: { title: TABS.TRANSACTIONS } },
        { properties: { title: TABS.LEDGER } },
        { properties: { title: TABS.SUMMARY } },
      ],
    }),
  });
  const data = await sheet.json();
  const id = data.spreadsheetId;

  await apiRequest(token, `/${id}/values:batchUpdate`, 'POST', {
    valueInputOption: 'RAW',
    data: [
      { range: `${TABS.TRANSACTIONS}!A1`, values: [TX_HEADERS] },
      { range: `${TABS.LEDGER}!A1`, values: [LEDGER_HEADERS] },
      { range: `${TABS.SUMMARY}!A1`, values: [SUMMARY_HEADERS] },
    ],
  });

  return id;
}

export async function appendTransaction(token, sheetId, row) {
  await apiRequest(token, `/${sheetId}/values/${encodeURIComponent(TABS.TRANSACTIONS)}!A1:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, 'POST', {
    values: [row],
  });
}

export async function appendLedgerRows(token, sheetId, rows) {
  if (!rows.length) return;
  await apiRequest(token, `/${sheetId}/values/${encodeURIComponent(TABS.LEDGER)}!A1:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, 'POST', {
    values: rows,
  });
}

export async function getAllTransactions(token, sheetId) {
  const data = await apiRequest(token, `/${sheetId}/values/${encodeURIComponent(TABS.TRANSACTIONS)}!A1:L`);
  const rows = data.values || [];
  if (rows.length <= 1) return [];
  return rows.slice(1).map(r => ({
    date: r[0] || '',
    paidTo: r[1] || '',
    fullAmount: parseFloat(r[2]) || 0,
    myShare: parseFloat(r[3]) || 0,
    category: r[4] || '',
    type: r[5] || '',
    sharedWith: r[6] || '',
    splitCount: parseInt(r[7]) || 1,
    settlementStatus: r[8] || 'NA',
    settlementDate: r[9] || '',
    transactionId: r[10] || '',
    month: r[11] || '',
  }));
}

export async function getAllLedgerRows(token, sheetId) {
  const data = await apiRequest(token, `/${sheetId}/values/${encodeURIComponent(TABS.LEDGER)}!A1:G`);
  const rows = data.values || [];
  if (rows.length <= 1) return [];
  return rows.slice(1).map((r, i) => ({
    rowIndex: i + 2,
    flatmateName: r[0] || '',
    transactionId: r[1] || '',
    date: r[2] || '',
    amountOwed: parseFloat(r[3]) || 0,
    status: r[4] || 'Pending',
    settlementDate: r[5] || '',
    note: r[6] || '',
  }));
}

export async function getSheetData(token, sheetId) {
  const data = await apiRequest(token, `/${sheetId}/values:batchGet?ranges=${encodeURIComponent(TABS.TRANSACTIONS + '!A1:L')}&ranges=${encodeURIComponent(TABS.LEDGER + '!A1:G')}`);
  const [txRange, ledgerRange] = data.valueRanges || [];

  const txRows = (txRange?.values || []).slice(1);
  const ledgerRows = (ledgerRange?.values || []).slice(1);

  const transactions = txRows.map(r => ({
    date: r[0] || '',
    paidTo: r[1] || '',
    fullAmount: parseFloat(r[2]) || 0,
    myShare: parseFloat(r[3]) || 0,
    category: r[4] || '',
    type: r[5] || '',
    sharedWith: r[6] || '',
    splitCount: parseInt(r[7]) || 1,
    settlementStatus: r[8] || 'NA',
    settlementDate: r[9] || '',
    transactionId: r[10] || '',
    month: r[11] || '',
  }));

  const ledger = ledgerRows.map((r, i) => ({
    rowIndex: i + 2,
    flatmateName: r[0] || '',
    transactionId: r[1] || '',
    date: r[2] || '',
    amountOwed: parseFloat(r[3]) || 0,
    status: r[4] || 'Pending',
    settlementDate: r[5] || '',
    note: r[6] || '',
  }));

  return { transactions, ledger };
}

export async function deleteTransaction(token, sheetId, transactionId) {
  const allTx = await getAllTransactions(token, sheetId);
  const rowIndex = allTx.findIndex(t => t.transactionId === transactionId);
  if (rowIndex === -1) return;

  const spreadsheet = await apiRequest(token, `/${sheetId}`);
  const txSheet = spreadsheet.sheets.find(s => s.properties.title === TABS.TRANSACTIONS);
  const sheetGid = txSheet?.properties?.sheetId;

  await apiRequest(token, `/${sheetId}:batchUpdate`, 'POST', {
    requests: [{
      deleteDimension: {
        range: {
          sheetId: sheetGid,
          dimension: 'ROWS',
          startIndex: rowIndex + 1,
          endIndex: rowIndex + 2,
        },
      },
    }],
  });
}

export async function settleFlatmate(token, sheetId, flatmateName, amount, ledgerRows, allTransactions) {
  const today = new Date();
  const dd = String(today.getDate()).padStart(2, '0');
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const yyyy = today.getFullYear();
  const settlementDate = `${dd}/${mm}/${yyyy}`;

  const pendingRows = ledgerRows.filter(r => r.flatmateName === flatmateName && r.status === 'Pending');
  let remaining = amount;

  const ledgerUpdates = [];
  const txUpdates = [];

  for (const row of pendingRows) {
    if (remaining <= 0) break;
    const settleAmt = Math.min(remaining, row.amountOwed);
    remaining -= settleAmt;

    if (settleAmt >= row.amountOwed) {
      ledgerUpdates.push({
        range: `${TABS.LEDGER}!E${row.rowIndex}:F${row.rowIndex}`,
        values: [['Settled', settlementDate]],
      });

      const txIdx = allTransactions.findIndex(t => t.transactionId === row.transactionId);
      if (txIdx !== -1) {
        txUpdates.push({
          range: `${TABS.TRANSACTIONS}!I${txIdx + 2}:J${txIdx + 2}`,
          values: [['Settled', settlementDate]],
        });
      }
    }
  }

  if (ledgerUpdates.length > 0) {
    await apiRequest(token, `/${sheetId}/values:batchUpdate`, 'POST', {
      valueInputOption: 'RAW',
      data: [...ledgerUpdates, ...txUpdates],
    });
  }
}
