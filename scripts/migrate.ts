import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function main() {
    console.log('=== DATA MIGRATION STARTED ===');
    console.log('Loaded env:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'YES' : 'NO');

    // Dynamic import to ensure process.env is populated first
    const { migrateLocalDataToSupabase } = await import('../src/lib/data-manager');
    const { FALLBACK_VISITOR_DATA } = await import('../src/lib/visitor-data');
    const { createClient } = await import('@supabase/supabase-js');

    // Use Service Role Key if available for bypassing RLS, otherwise use Anon Key
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    if (!supabase) {
        console.error('Supabase client failed to initialize inside main(). Check env vars.');
        process.exit(1);
    }
    
    // Override the client used in data-manager (this is tricky because data-manager imports the global one)
    // Actually, data-manager uses the exported 'supabase' client from @/lib/supabase.
    // We cannot easily override it unless we redesign data-manager to accept a client.
    // However, since we are constrained, let's just re-implement the insert logic here using our privileged client,
    // OR ask the user to temporarily allow public inserts.
    
    // Easier path: Re-implement inserts here using the privileged client.
    
    // 1. Transactions
    console.log('Migrating transactions...');
    try {
        const fs = (await import('fs')).promises;
        const path = (await import('path')).default;
        
        const csvPath = path.join(process.cwd(), 'public/data/record.csv');
        const fileContent = await fs.readFile(csvPath, 'utf-8');
        const rows = fileContent.split('\n').filter(r => r.trim() !== '').slice(1);
        
        const records = rows.map(row => {
            const cols = row.split(',');
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

        console.log(`Found ${records.length} transactions.`);
        const batchSize = 100;
        for (let i = 0; i < records.length; i += batchSize) {
            const batch = records.slice(i, i + batchSize);
            const { error } = await supabase.from('transactions').upsert(batch, { onConflict: 'id' });
            if (error) throw error;
            if (i % 1000 === 0) console.log(`Processed ${i} records...`);
        }
        console.log('Transactions migration complete.');
    } catch(e) {
        console.error('Transaction migration failed:', e);
    }

    // 2. Visitor Stats
    console.log('Starting Visitor Data Migration...');
    const records = [];
    for (const yearStr in FALLBACK_VISITOR_DATA) {
        const year = parseInt(yearStr);
        const months = FALLBACK_VISITOR_DATA[year];
        for (const monthStr in months) {
            const month = parseInt(monthStr);
            const count = months[month];
            records.push({ year, month, count });
        }
    }

    if (records.length > 0) {
        const { error } = await supabase.from('visitor_stats').upsert(records, { onConflict: 'year,month' });
        if (error) {
            console.error('Error migrating visitor stats:', error);
        } else {
            console.log(`Successfully migrated ${records.length} visitor stats records.`);
        }
    } else {
        console.log('No visitor data to migrate.');
    }

    console.log('=== DATA MIGRATION FINISHED ===');
}

main().catch(console.error);
