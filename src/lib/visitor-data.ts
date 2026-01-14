
export interface VisitorRecord {
    year: number;
    month: number;
    count: number;
}

import { supabase } from '@/lib/supabase';

// Helper to get visitor stats. To be used in server components or actions.
export async function getVisitorStats() {
    if (!supabase) return {};

    const { data, error } = await supabase.from('visitor_stats').select('*');
    if (error) {
        console.error('Error fetching visitor stats:', error);
        return {};
    }

    const result: Record<number, Record<number, number>> = {};
    
    data.forEach((row: any) => {
        if (!result[row.year]) result[row.year] = {};
        result[row.year][row.month] = row.count;
    });

    return result;
}

// Keep a fallback or initial state if needed, but primary source is DB.
// We can't export a const async data structure, components must call the async function.
// For backward compatibility while refactoring consumers:
export const FALLBACK_VISITOR_DATA: Record<number, Record<number, number>> = {
    2024: { 1: 164597, 2: 240331, 3: 137054, 4: 183238, 5: 129451, 6: 135328, 7: 207787, 8: 262261, 9: 78570, 10: 139023, 11: 144385, 12: 155617 },
    2025: { 1: 182253, 2: 137728, 3: 116253, 4: 185571, 5: 140048, 6: 120266, 7: 187709, 8: 241442, 9: 96607, 10: 136022, 11: 128419, 12: 137657 }
};
