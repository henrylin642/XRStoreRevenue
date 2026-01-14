
import path from 'path';
import * as XLSX from 'xlsx';
import { promises as fs } from 'fs';

export interface Transaction {
  id: string; // 訂單編號
  storeName: string; // 店鋪名稱
  amount: number; // 交易金額
  date: string; // 交易時間 (ISO)
  type: string; // 交易類型 (一般銷售, 退貨 etc)
  paymentStatus: string; // 支付交易類型 (付款成功)
  paymentMethod: string; // 支付方式
  invoiceStatus: string; // 發票狀態
  invoiceNumber: string; // 發票號碼
  sourceFile: string; // 來源檔案 (便於追蹤月份)
}

export async function getAllTransactions(): Promise<Transaction[]> {
  const dataDir = path.join(process.cwd(), 'public/data');
  // Get all files
  const files = await fs.readdir(dataDir);
  const excelFiles = files.filter(f => f.startsWith('智慧刷卡機交易紀錄_') && f.endsWith('.xlsx') && !f.startsWith('~$'));

  let allTransactions: Transaction[] = [];

  for (const file of excelFiles) {
    const filePath = path.join(dataDir, file);
    const fileBuffer = await fs.readFile(filePath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

    // Find header row
    let headerRowIndex = -1;
    for (let i = 0; i < rawData.length; i++) {
      if (rawData[i][0] === '訂單編號') {
        headerRowIndex = i;
        break;
      }
    }
    if (headerRowIndex === -1) continue;

    const headers = rawData[headerRowIndex];
    const dataRows = rawData.slice(headerRowIndex + 1);

    const transactions = dataRows.map(row => {
      const getVal = (name: string) => {
        const idx = headers.indexOf(name);
        return idx !== -1 ? row[idx] : undefined;
      };

      const amountStr = getVal('交易金額');
      const amount = typeof amountStr === 'number' ? amountStr : parseFloat(amountStr) || 0;
      let dateStr = getVal('交易時間') || '';

      // Excel date serial number handling
      if (typeof dateStr === 'number') {
        const date = XLSX.SSF.parse_date_code(dateStr);
        // Format: YYYY-MM-DDTHH:mm:ss
        dateStr = `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}T${String(date.H).padStart(2, '0')}:${String(date.M).padStart(2, '0')}:${String(date.S).padStart(2, '0')}`;
      } else if (typeof dateStr === 'string') {
        // Replace space with T if it looks like YYYY-MM-DD HH:mm:ss
        dateStr = dateStr.trim().replace(' ', 'T');
      }

      return {
        id: getVal('訂單編號')?.toString() || '',
        storeName: getVal('店鋪名稱') || '',
        amount,
        date: dateStr,
        type: getVal('交易類型') || '',
        paymentStatus: getVal('支付交易類型') || '',
        paymentMethod: getVal('支付方式') || '',
        invoiceStatus: getVal('發票狀態') || '',
        invoiceNumber: getVal('發票號碼')?.toString() || '',
        sourceFile: file
      };
    }).filter(t => t.id && t.date);

    allTransactions = allTransactions.concat(transactions);
  }

  // Sort by date desc
  return allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
