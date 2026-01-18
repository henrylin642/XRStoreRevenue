'use server'

import { supabaseAdmin } from '@/lib/supabase-admin';
import { revalidatePath } from 'next/cache';

export async function getSystemConfig(key: string, defaultValue: any) {
    if (!supabaseAdmin) return defaultValue;

    const { data, error } = await supabaseAdmin
        .from('system_configs')
        .select('value')
        .eq('key', key)
        .single();

    if (error || !data) {
        return defaultValue;
    }

    return data.value;
}

export async function updateSystemConfig(key: string, value: any) {
    if (!supabaseAdmin) throw new Error('Supabase admin client not initialized');

    const { error } = await supabaseAdmin
        .from('system_configs')
        .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });

    if (error) {
        console.error(`Error updating config ${key}:`, error);
        throw new Error('Failed to update system configuration');
    }

    revalidatePath('/');
    return { success: true };
}
