const XLSX = require('xlsx');
const fs = require('fs');

const filePath = '/Users/henry642/Desktop/Projects/antigravity_prj/LEIMEN/public/data/掃描-LINE PAY/1sha_54987742.PS_20260101000000_20260116235959_TRANSACTION (1).csv';
const buffer = fs.readFileSync(filePath);
const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
const ws = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(ws, { raw: false });

console.log('Total rows:', data.length);
console.log('Keys of first row:', Object.keys(data[0]));
console.log('Values of first row:', data[0]);

const rule = {
    dateFields: ['交易日期', '日期'],
    timeFields: ['交易時間', '時間'],
    amountFields: ['付款金額', '支付金額', '金額'],
    idFields: ['交易號碼', '訂單號碼'],
    statusFields: ['交易狀態', '付款狀態'],
    successStatuses: ['PAYMENT', 'CAPTURE', '成功', 'SUCCESS', 'Paid']
};

const findVal = (row, fields) => {
    for (const f of fields) if (row[f] !== undefined) return row[f];
    return null;
};

const row = data[0];
const rawDate = findVal(row, rule.dateFields);
const rawTime = findVal(row, rule.timeFields) || '00:00:00';
const amount = Number(findVal(row, rule.amountFields) || 0);
const txId = String(findVal(row, rule.idFields) || '-');
const status = String(findVal(row, rule.statusFields) || '已付款').trim();

console.log('Result:', { rawDate, rawTime, amount, txId, status });
