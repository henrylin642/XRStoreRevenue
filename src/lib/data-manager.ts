import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { promises as fs } from 'fs';
import path from 'path';

export interface TransactionRecord {
    id: string; // 訂單編號
    invoiceNumber: string;
    date: string; // ISO String
    amount: number;
    paymentMethod: string;
}

export interface Transaction extends TransactionRecord {
    type: string;
    paymentStatus: string;
    invoiceStatus: string;
    storeName: string;
    sourceFile: string;
    year?: number;
    month?: number;
    day?: number;
    hour?: number;
    ym?: string;
}

export async function getTransactionsFromCSV(): Promise<Transaction[]> {
    // This function name is kept for compatibility, but it now fetches from Supabase
    // Use admin client to bypass RLS for reading data as well
    if (!supabaseAdmin) {
        console.warn('Supabase admin client not initialized. Missing env vars?');
        return [];
    }

    let allData: any[] = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
        const { data, error } = await supabaseAdmin
            .from('transactions')
            .select('*')
            .order('date', { ascending: false })
            .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) {
            console.error('Error fetching transactions:', error);
            break;
        }

        if (data) {
            allData = [...allData, ...data];
            if (data.length < pageSize) {
                hasMore = false;
            } else {
                page++;
            }
        } else {
            hasMore = false;
        }
    }

    // Map the aggregated data
    const data = allData;

    return data.map((t: any) => ({
        id: t.id,
        invoiceNumber: t.invoice_number,
        date: t.date,
        amount: Number(t.amount),
        paymentMethod: t.payment_method,
        type: t.transaction_type || '交易成功',
        paymentStatus: t.payment_status || '付款成功',
        invoiceStatus: '已開立',
        storeName: 'Unknown',
        sourceFile: 'database'
    }));
}

// Function to migrate local CSV data to Supabase
// Should be called manually or via a special admin route
export async function migrateLocalDataToSupabase() {
    console.log('Starting migration...');
    if (!supabaseAdmin) throw new Error('Supabase admin client missing');

    // Read local CSV
    const csvPath = path.join(process.cwd(), 'public/data/record.csv');
    try {
        const fileContent = await fs.readFile(csvPath, 'utf-8');
        const rows = fileContent.split('\n').filter(r => r.trim() !== '').slice(1); // skip header

        const records = rows.map(row => {
            const cols = row.split(',');
            // CSV columns: id, invoiceNumber, date, amount, paymentMethod
            return {
                id: cols[0],
                invoice_number: cols[1],
                date: cols[2],
                amount: parseFloat(cols[3]),
                payment_method: cols[4].replace(/"/g, ''),
                payment_status: '付款成功',
                transaction_type: '交易成功'
            };
        });

        console.log(`Found ${records.length} records to upsert.`);

        // Batch insert (upsert)
        const batchSize = 100;
        for (let i = 0; i < records.length; i += batchSize) {
            const batch = records.slice(i, i + batchSize);
            const { error } = await supabaseAdmin.from('transactions').upsert(batch, { onConflict: 'id' });
            if (error) console.error('Batch insert error:', error);
            else console.log(`Inserted batch ${i} - ${i + batch.length}`);
        }
        console.log('Migration complete.');
        return { success: true, count: records.length };

    } catch (e) {
        console.error('Migration failed:', e);
        return { success: false, error: e };
    }
}

import * as XLSX from 'xlsx';

export async function mergeExcelData(fileBuffer: Buffer) {
    if (!supabaseAdmin) throw new Error('Supabase admin client missing');

    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // 1. Find the header row
    // We look for a row containing '訂單編號' (Order ID)
    const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
    let headerRowIndex = -1;

    for (let i = 0; i < Math.min(rawData.length, 20); i++) {
        const row = rawData[i];
        if (row && (row.includes('訂單編號') || row.includes('Order ID'))) {
            headerRowIndex = i;
            break;
        }
    }

    if (headerRowIndex === -1) {
        console.warn('Could not find header row (looking for "訂單編號"), executing with default behavior (header at 0).');
        headerRowIndex = 0;
    }

    // 2. Parse using the found header row
    const jsonData = XLSX.utils.sheet_to_json(sheet, { range: headerRowIndex });

    let added = 0;
    let duplicates = 0;

    // Process and Map Data
    const records = jsonData.map((row: any) => {
        // Mapping logic
        const id = row['訂單編號'] || row['Order ID'] || row['id'];
        const invoiceNumber = row['發票號碼'] || row['Invoice Number'] || row['invoiceNumber'];

        // Date parsing: Support '交易時間', '日期', 'Date'
        let dateRaw = row['交易時間'] || row['日期'] || row['Date'] || row['date'];

        let dateStr = '';
        const TZ_OFFSET = 8 * 60 * 60 * 1000; // 8 hours in milliseconds

        if (typeof dateRaw === 'number') {
            // Excel serial date. parse_date_code returns the time components as written in the cell.
            // E.g., if cell says 15:30, it returns H=15, M=30.
            const date = XLSX.SSF.parse_date_code(dateRaw);

            // We treat these components as GMT+8 (Taipei Time).
            // First, construct a UTC timestamp as if it were UTC (e.g. 15:30Z)
            const asUtc = Date.UTC(date.y, date.m - 1, date.d, date.H, date.M, date.S);

            // Then subtract 8 hours to shift back to true UTC (e.g. 15:30 - 8h = 07:30Z)
            dateStr = new Date(asUtc - TZ_OFFSET).toISOString();
        } else if (dateRaw) {
            // String date
            let str = String(dateRaw).trim();

            // If strictly "YYYY-MM-DD HH:mm:ss", treat as GMT+8 by appending offset
            if (/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}$/.test(str)) {
                str = str.replace(' ', 'T') + '+08:00';
            }

            const d = new Date(str);
            if (!isNaN(d.getTime())) {
                dateStr = d.toISOString();
            }
        }

        const amount = Number(row['交易金額'] || row['金額'] || row['Amount'] || row['amount'] || 0);
        const paymentMethod = String(row['支付方式'] || row['付款方式'] || row['Payment Method'] || row['paymentMethod'] || '其他');
        const transactionType = row['交易類型'] || '交易成功';
        const paymentStatus = row['支付交易類型'] || '付款成功';
        // Note: invoiceStatus is not always available, defaulting to '已開立'
        const invoiceStatus = row['發票狀態'] || '已開立';
        const storeName = row['店鋪名稱'] || 'Unknown';

        // Basic validation
        if (!id || !dateStr) return null;

        return {
            id: String(id),
            invoice_number: String(invoiceNumber || ''),
            date: dateStr,
            amount: amount,
            payment_method: paymentMethod,
            payment_status: paymentStatus,
            transaction_type: transactionType
        };
    }).filter(r => r !== null);

    if (records.length > 0) {
        // Upsert to Supabase
        const { error } = await supabaseAdmin.from('transactions').upsert(records, { onConflict: 'id' });

        if (error) {
            console.error('Error merging Excel data:', error);
            throw error;
        }

        // In upsert, we don't easily know how many were updates vs inserts without checking first.
        // For now, we report all as "added/processed".
        added = records.length;
    }

    return { added, duplicates: 0 };
}
