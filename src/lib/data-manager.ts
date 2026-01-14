import { supabase } from '@/lib/supabase';
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
    if (!supabase) {
        console.warn('Supabase client not initialized. Missing env vars?');
        return [];
    }

    const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false });

    if (error) {
        console.error('Error fetching transactions:', error);
        return [];
    }

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
    if (!supabase) throw new Error('Supabase client missing');
    
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
            const { error } = await supabase.from('transactions').upsert(batch, { onConflict: 'id' });
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
    if (!supabase) throw new Error('Supabase client missing');

    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(sheet);

    let added = 0;
    let duplicates = 0;

    // Process and Map Data
    // Assuming Excel columns map somewhat to our needs. 
    // We need to identify columns. 
    // Based on previous CSV structure: 訂單編號, 發票號碼, 日期, 金額, 付款方式
    
    const records = jsonData.map((row: any) => {
        // Mapping logic (adjust based on actual Excel headers if known, here guessing based on standard formats)
        // Fallback to known column names or trying to find them
        const id = row['訂單編號'] || row['Order ID'] || row['id'];
        const invoiceNumber = row['發票號碼'] || row['Invoice Number'] || row['invoiceNumber'];
        // Date parsing might be tricky from Excel, assuming string or serial
        const dateRaw = row['日期'] || row['Date'] || row['date'];
        
        // Basic validation
        if (!id || !dateRaw) return null;

        return {
            id: String(id),
            invoice_number: String(invoiceNumber || ''),
            date: new Date(dateRaw).toISOString(), // Formatting might be needed
            amount: Number(row['金額'] || row['Amount'] || row['amount'] || 0),
            payment_method: String(row['付款方式'] || row['Payment Method'] || row['paymentMethod'] || '其他'),
            payment_status: '付款成功',
            transaction_type: '交易成功'
        };
    }).filter(r => r !== null);

    if (records.length > 0) {
        // Upsert to Supabase
        const { error } = await supabase.from('transactions').upsert(records, { onConflict: 'id' });
        
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
