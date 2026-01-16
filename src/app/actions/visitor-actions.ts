'use server'

import { supabaseAdmin } from '@/lib/supabase-admin';
import { revalidatePath } from 'next/cache';

export async function updateDailyVisitorCount(date: string, count: number) {
    if (!supabaseAdmin) throw new Error('Supabase admin client not initialized');

    const { error } = await supabaseAdmin
        .from('daily_visitor_stats')
        .upsert({ date, count }, { onConflict: 'date' });

    if (error) {
        console.error('Error updating visitor count:', error);
        throw new Error('Failed to update visitor count');
    }

    revalidatePath('/');
    return { success: true };
}
