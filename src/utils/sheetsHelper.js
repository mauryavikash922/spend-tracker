const YEAR = new Date().getFullYear();
const SHEET_TITLE = `My Spends - ${YEAR}`;
const FOLDER_NAME = 'SpendWise';

const TABS = {
  TRANSACTIONS: 'Transactions',
  LEDGER: 'People Ledger',
  LEDGER_LEGACY: 'Flatmate Ledger',
  SUMMARY: 'Monthly Summary',
  SETTINGS: 'Settings',
};

const TX_HEADERS = [
  'Date', 'Paid To', 'Full Amount', 'My Share', 'Category',
  'Type', 'Shared With', 'Split Count', 'Settlement Status',
  'Settlement Date', 'Transaction ID', 'Month', 'Comment',
];

const LEDGER_HEADERS = [
  'Person Name', 'Transaction ID', 'Date', 'Amount', 'Status',
  'Settlement Date', 'Note', 'Direction',
];

const SUMMARY_HEADERS = ['Month', 'Total Spent', 'Need', 'Want', 'Investment', 'Shared Total', 'Pending Dues'];
const SETTINGS_HEADERS = ['Key', 'Value'];

async function apiRequest(token, path, method = 'GET', body = null) {
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `API error ${res.status}`);
  }
  return res.json();
}

async function driveGet(token, path) {
  const res = await fetch(`https://www.googleapis.com/drive/v3${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}



async function drivePost(token, body) {
  const res = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function findOrCreateFolder(token) {
  const q = encodeURIComponent(`name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`);
  const data = await driveGet(token, `/files?q=${q}&fields=files(id,name)`);
  if (data.files?.[0]) return data.files[0].id;
  const folder = await drivePost(token, { name: FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder' });
  return folder.id;
}

async function driveSearchInFolder(token, name, folderId) {
  const q = encodeURIComponent(`name='${name}' and mimeType='application/vnd.google-apps.spreadsheet' and '${folderId}' in parents and trashed=false`);
  const data = await driveGet(token, `/files?q=${q}&fields=files(id,name)`);
  return data.files?.[0] || null;
}

async function driveSearchAny(token, name) {
  const q = encodeURIComponent(`name='${name}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`);
  const data = await driveGet(token, `/files?q=${q}&fields=files(id,name,parents)`);
  return data.files?.[0] || null;
}

async function getLedgerTabName(token, sheetId) {
  const data = await apiRequest(token, `/${sheetId}`);
  const titles = data.sheets.map(s => s.properties.title);
  if (titles.includes(TABS.LEDGER)) return TABS.LEDGER;
  if (titles.includes(TABS.LEDGER_LEGACY)) return TABS.LEDGER_LEGACY;
  return TABS.LEDGER;
}

export async function findOrCreateSheet(token) {
  const folderId = await findOrCreateFolder(token);

  // Check inside SpendWise folder first
  const inFolder = await driveSearchInFolder(token, SHEET_TITLE, folderId);
  if (inFolder) return inFolder.id;

  // Check anywhere (old location, no folder) — migrate it into the folder
  const anywhere = await driveSearchAny(token, SHEET_TITLE);
  if (anywhere) {
    const oldParents = (anywhere.parents || []).join(',');
    await fetch(
      `https://www.googleapis.com/drive/v3/files/${anywhere.id}?addParents=${folderId}${oldParents ? `&removeParents=${oldParents}` : ''}&fields=id`,
      { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } }
    );
    return anywhere.id;
  }

  // Create new sheet
  const sheet = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      properties: { title: SHEET_TITLE },
      sheets: [
        { properties: { title: TABS.TRANSACTIONS } },
        { properties: { title: TABS.LEDGER } },
        { properties: { title: TABS.SUMMARY } },
        { properties: { title: TABS.SETTINGS } },
      ],
    }),
  });
  const data = await sheet.json();
  const id = data.spreadsheetId;

  // Move into SpendWise folder
  await fetch(
    `https://www.googleapis.com/drive/v3/files/${id}?addParents=${folderId}&removeParents=root&fields=id`,
    { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } }
  );

  await apiRequest(token, `/${id}/values:batchUpdate`, 'POST', {
    valueInputOption: 'RAW',
    data: [
      { range: `${TABS.TRANSACTIONS}!A1`, values: [TX_HEADERS] },
      { range: `${TABS.LEDGER}!A1`, values: [LEDGER_HEADERS] },
      { range: `${TABS.SUMMARY}!A1`, values: [SUMMARY_HEADERS] },
      { range: `${TABS.SETTINGS}!A1`, values: [SETTINGS_HEADERS] },
    ],
  });

  return id;
}

export async function appendTransaction(token, sheetId, row) {
  await apiRequest(token, `/${sheetId}/values/${encodeURIComponent(TABS.TRANSACTIONS)}!A1:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, 'POST', {
    values: [row],
  });
}

export async function updateTransaction(token, sheetId, rowIndex, row) {
  await apiRequest(token, `/${sheetId}/values/${encodeURIComponent(TABS.TRANSACTIONS)}!A${rowIndex}:M${rowIndex}?valueInputOption=RAW`, 'PUT', {
    values: [row],
  });
}

export async function appendLedgerRows(token, sheetId, rows) {
  if (!rows.length) return;
  const ledgerTab = await getLedgerTabName(token, sheetId);
  await apiRequest(token, `/${sheetId}/values/${encodeURIComponent(ledgerTab)}!A1:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, 'POST', {
    values: rows,
  });
}

export async function getSheetData(token, sheetId) {
  const ledgerTab = await getLedgerTabName(token, sheetId);

  const data = await apiRequest(token, `/${sheetId}/values:batchGet?ranges=${encodeURIComponent(TABS.TRANSACTIONS + '!A1:M')}&ranges=${encodeURIComponent(ledgerTab + '!A1:H')}`);
  const [txRange, ledgerRange] = data.valueRanges || [];

  const transactions = (txRange?.values || []).slice(1).map((r, i) => ({
    _rowIndex: i + 2,
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
    comment: r[12] || '',
  }));

  const ledger = (ledgerRange?.values || []).slice(1).map((r, i) => ({
    rowIndex: i + 2,
    personName: r[0] || '',
    transactionId: r[1] || '',
    date: r[2] || '',
    amount: parseFloat(r[3]) || 0,
    status: r[4] || 'Pending',
    settlementDate: r[5] || '',
    note: r[6] || '',
    direction: r[7] || 'credit',
  }));

  return { transactions: transactions.reverse(), ledger };
}

export async function getCustomCategories(token, sheetId) {
  try {
    const data = await apiRequest(token, `/${sheetId}/values/${encodeURIComponent(TABS.SETTINGS)}!A2:B`);
    const rows = data.values || [];
    const row = rows.find(r => r[0] === 'custom_categories');
    if (row && row[1]) return JSON.parse(row[1]);
    return [];
  } catch { return []; }
}

export async function saveCustomCategories(token, sheetId, categories) {
  const data = await apiRequest(token, `/${sheetId}/values/${encodeURIComponent(TABS.SETTINGS)}!A2:B`);
  const rows = data.values || [];
  const rowIdx = rows.findIndex(r => r[0] === 'custom_categories');

  const range = rowIdx >= 0
    ? `${TABS.SETTINGS}!A${rowIdx + 2}:B${rowIdx + 2}`
    : `${TABS.SETTINGS}!A2:B2`;

  if (rowIdx >= 0) {
    await apiRequest(token, `/${sheetId}/values/${encodeURIComponent(range)}?valueInputOption=RAW`, 'PUT', {
      values: [['custom_categories', JSON.stringify(categories)]],
    });
  } else {
    await apiRequest(token, `/${sheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, 'POST', {
      values: [['custom_categories', JSON.stringify(categories)]],
    });
  }
}

export async function deleteTransaction(token, sheetId, transactionId) {
  const data = await apiRequest(token, `/${sheetId}/values/${encodeURIComponent(TABS.TRANSACTIONS)}!A1:M`);
  const rows = (data.values || []).slice(1);
  const rowIndex = rows.findIndex(r => r[10] === transactionId);
  if (rowIndex === -1) return;

  const spreadsheet = await apiRequest(token, `/${sheetId}`);
  const txSheet = spreadsheet.sheets.find(s => s.properties.title === TABS.TRANSACTIONS);

  await apiRequest(token, `/${sheetId}:batchUpdate`, 'POST', {
    requests: [{
      deleteDimension: {
        range: {
          sheetId: txSheet?.properties?.sheetId,
          dimension: 'ROWS',
          startIndex: rowIndex + 1,
          endIndex: rowIndex + 2,
        },
      },
    }],
  });
}

export async function settlePerson(token, sheetId, personName, amount, ledger, transactions, settleComment = '') {
  const today = new Date();
  const dd = String(today.getDate()).padStart(2, '0');
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const yyyy = today.getFullYear();
  const settlementDate = `${dd}/${mm}/${yyyy}`;

  const ledgerTab = await getLedgerTabName(token, sheetId);
  const pendingRows = ledger.filter(r => r.personName === personName && r.status === 'Pending' && r.direction === 'credit');
  let remaining = amount;

  const ledgerUpdates = [];
  const txUpdates = [];
  const newLedgerRows = [];

  for (const row of pendingRows) {
    if (remaining <= 0) break;
    if (remaining >= row.amount) {
      remaining -= row.amount;
      ledgerUpdates.push({
        range: `${ledgerTab}!E${row.rowIndex}:G${row.rowIndex}`,
        values: [['Settled', settlementDate, settleComment || row.note]],
      });
      const tx = transactions.find(t => t.transactionId === row.transactionId);
      if (tx) {
        txUpdates.push({
          range: `${TABS.TRANSACTIONS}!I${tx._rowIndex}:J${tx._rowIndex}`,
          values: [['Settled', settlementDate]],
        });
      }
    } else {
      // Partial: settle `remaining` of this row, carry leftover as a new pending row
      const settledPortion = remaining;
      const leftover = row.amount - remaining;
      remaining = 0;
      ledgerUpdates.push({
        range: `${ledgerTab}!D${row.rowIndex}:G${row.rowIndex}`,
        values: [[settledPortion, 'Settled', settlementDate, settleComment || row.note]],
      });
      newLedgerRows.push([personName, row.transactionId, row.date, leftover, 'Pending', '', row.note, 'credit']);
    }
  }

  if (ledgerUpdates.length > 0 || txUpdates.length > 0) {
    await apiRequest(token, `/${sheetId}/values:batchUpdate`, 'POST', {
      valueInputOption: 'RAW',
      data: [...ledgerUpdates, ...txUpdates],
    });
  }
  if (newLedgerRows.length > 0) {
    await appendLedgerRows(token, sheetId, newLedgerRows);
  }
}

export async function settleDebt(token, sheetId, personName, amount, ledger, settleComment = '') {
  const today = new Date();
  const dd = String(today.getDate()).padStart(2, '0');
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const yyyy = today.getFullYear();
  const settlementDate = `${dd}/${mm}/${yyyy}`;

  const ledgerTab = await getLedgerTabName(token, sheetId);
  const pendingRows = ledger.filter(r => r.personName === personName && r.status === 'Pending' && r.direction === 'debit');
  let remaining = amount;

  const updates = [];
  const newLedgerRows = [];

  for (const row of pendingRows) {
    if (remaining <= 0) break;
    if (remaining >= row.amount) {
      remaining -= row.amount;
      updates.push({
        range: `${ledgerTab}!E${row.rowIndex}:G${row.rowIndex}`,
        values: [['Settled', settlementDate, settleComment || row.note]],
      });
    } else {
      const settledPortion = remaining;
      const leftover = row.amount - remaining;
      remaining = 0;
      updates.push({
        range: `${ledgerTab}!D${row.rowIndex}:G${row.rowIndex}`,
        values: [[settledPortion, 'Settled', settlementDate, settleComment || row.note]],
      });
      newLedgerRows.push([personName, row.transactionId, row.date, leftover, 'Pending', '', row.note, 'debit']);
    }
  }

  if (updates.length > 0) {
    await apiRequest(token, `/${sheetId}/values:batchUpdate`, 'POST', {
      valueInputOption: 'RAW',
      data: updates,
    });
  }
  if (newLedgerRows.length > 0) {
    await appendLedgerRows(token, sheetId, newLedgerRows);
  }
}

export async function getInvestmentBuckets(token, sheetId) {
  try {
    const data = await apiRequest(token, `/${sheetId}/values/${encodeURIComponent(TABS.SETTINGS)}!A2:B`);
    const rows = data.values || [];
    const row = rows.find(r => r[0] === 'investment_buckets');
    if (row && row[1]) return JSON.parse(row[1]);
    return [];
  } catch { return []; }
}

export async function saveInvestmentBuckets(token, sheetId, buckets) {
  const data = await apiRequest(token, `/${sheetId}/values/${encodeURIComponent(TABS.SETTINGS)}!A2:B`);
  const rows = data.values || [];
  const rowIdx = rows.findIndex(r => r[0] === 'investment_buckets');
  const range = rowIdx >= 0
    ? `${TABS.SETTINGS}!A${rowIdx + 2}:B${rowIdx + 2}`
    : `${TABS.SETTINGS}!A2:B2`;

  if (rowIdx >= 0) {
    await apiRequest(token, `/${sheetId}/values/${encodeURIComponent(range)}?valueInputOption=RAW`, 'PUT', {
      values: [['investment_buckets', JSON.stringify(buckets)]],
    });
  } else {
    await apiRequest(token, `/${sheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, 'POST', {
      values: [['investment_buckets', JSON.stringify(buckets)]],
    });
  }
}
