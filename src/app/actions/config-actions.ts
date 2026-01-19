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

export async function getSystemConfigsByPattern(pattern: string) {
    if (!supabaseAdmin) return {};

    const { data, error } = await supabaseAdmin
        .from('system_configs')
        .select('key, value')
        .like('key', pattern);

    if (error) {
        console.error(`Error fetching configs by pattern ${pattern}:`, error);
        return {};
    }

    if (!data) return {};

    // Transform array to object { key: value }
    return data.reduce((acc, curr) => {
        acc[curr.key] = curr.value;
        return acc;
    }, {} as Record<string, any>);
}

export async function updateSystemConfigsBatch(updates: { key: string, value: any }[]) {
    if (!supabaseAdmin) throw new Error('Supabase admin client not initialized');

    if (updates.length === 0) return { success: true };

    const { error } = await supabaseAdmin
        .from('system_configs')
        .upsert(
            updates.map(u => ({
                key: u.key,
                value: u.value,
                updated_at: new Date().toISOString()
            })),
            { onConflict: 'key' }
        );

    if (error) {
        console.error('Error batch updating configs:', error);
        throw new Error('Failed to batch update system configurations');
    }

    revalidatePath('/');
    return { success: true };
}
