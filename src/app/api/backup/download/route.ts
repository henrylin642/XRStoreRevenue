import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    if (!supabaseAdmin) {
        return NextResponse.json({ error: 'Database connection not initialized' }, { status: 500 });
    }

    try {
        // Fetch ALL data from system_configs
        const { data, error } = await supabaseAdmin
            .from('system_configs')
            .select('*')
            .order('key', { ascending: true });

        if (error) {
            console.error('Backup Error:', error);
            return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
        }

        const backupData = {
            timestamp: new Date().toISOString(),
            recordCount: data.length,
            records: data
        };

        // Create a JSON response
        const jsonString = JSON.stringify(backupData, null, 2);

        return new NextResponse(jsonString, {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Content-Disposition': `attachment; filename="leimen_backup_${new Date().toISOString().slice(0, 10)}.json"`,
            },
        });

    } catch (e: any) {
        console.error('Backup Exception:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
