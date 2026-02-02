'use client';

import React, { useState } from 'react';
import { Download, Loader2, Database } from 'lucide-react';

export function BackupManager() {
    const [isExporting, setIsExporting] = useState(false);

    const handleExportBackup = async () => {
        setIsExporting(true);
        try {
            // 1. Fetch all system configs (using existing server action but we need a new one to get ALL)
            // Since we don't have a "get all" action, we'll implement a specific download endpoint or action.
            // For now, let's use a dynamic fetch approach or ask the server to dump everything.

            // We will invoke a server action that returns the full JSON dump
            const response = await fetch('/api/backup/download');

            if (!response.ok) throw new Error('Download failed');

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            // Generate filename with timestamp
            const date = new Date();
            const timestamp = `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}_${date.getHours().toString().padStart(2, '0')}${date.getMinutes().toString().padStart(2, '0')}`;
            a.download = `leimen_backup_${timestamp}.json`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

        } catch (error) {
            console.error('Backup failed:', error);
            alert('備份失敗，請稍後再試');
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <button
            onClick={handleExportBackup}
            disabled={isExporting}
            className="flex items-center gap-2 px-3 py-2 bg-slate-100 border border-slate-200 text-slate-600 hover:bg-slate-200 hover:text-slate-800 rounded-lg transition-all shadow-sm group"
            title="下載全站數據備份"
        >
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
            <span className="text-sm font-bold">數據備份</span>
        </button>
    );
}
