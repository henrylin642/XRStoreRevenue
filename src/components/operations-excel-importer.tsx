"use client";

import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet, Check, AlertCircle, Loader2, X } from 'lucide-react';
import { getSystemConfigsByPattern, updateSystemConfigsBatch } from '@/app/actions/config-actions';
import { useRouter } from 'next/navigation';

const KNOWN_GAMES = [
    'F1星軌飆速', '星際謎域', '星際射手', '蛋蛋大逃殺', '銀河追魂',
    '易動拳靶', '幽靈獵手AR槍', '極光突襲'
];

interface LogEntry {
    dateStr: string;
    attractions: Record<string, number>;
    remark?: string;
}

export function OperationsExcelImporter() {
    const [isOpen, setIsOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [message, setMessage] = useState('');
    const [targetYear, setTargetYear] = useState<number>(2024);
    const [previewSummary, setPreviewSummary] = useState<string>('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsProcessing(true);
        setMessage('正在解析 Excel 檔案...');
        setPreviewSummary('');

        try {
            const buffer = await file.arrayBuffer();
            const workbook = XLSX.read(buffer, { type: 'array' });

            const allUpdates: LogEntry[] = [];
            let totalDaysFound = 0;

            // Iterate through sheets
            for (const sheetName of workbook.SheetNames) {
                // Try to detect month from sheet name (e.g., "1月", "Jan", "January")
                const monthMatch = sheetName.match(/(\d+)月/) || sheetName.match(/^(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i);
                let month = 0;
                if (sheetName.includes('月')) {
                    month = parseInt(sheetName.replace(/\D/g, ''));
                } else {
                    // Check simple number
                    const num = parseInt(sheetName);
                    if (!isNaN(num) && num >= 1 && num <= 12) month = num;
                }

                if (!month || month < 1 || month > 12) continue;

                const sheet = workbook.Sheets[sheetName];
                const data = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });

                // Find Date Row (look for "1/1", "1/2", etc.)
                let dateRowIndex = -1;
                let dateColMap: Record<number, string> = {}; // colIndex -> "YYYY-MM-DD"

                for (let r = 0; r < Math.min(data.length, 10); r++) {
                    const row = data[r];
                    if (!row) continue;
                    let foundDate = false;
                    row.forEach((cell: any, colIdx: number) => {
                        // Check for date-like value
                        // In Excel, dates might be serial numbers or strings
                        let day = 0;
                        if (typeof cell === 'number' && cell > 40000) {
                            // Excel serial date
                            const date = XLSX.SSF.parse_date_code(cell);
                            if (date && date.m === month) day = date.d;
                        } else if (typeof cell === 'string') {
                            // "1/23" or "23"
                            const parts = cell.split('/');
                            if (parts.length >= 2) {
                                const m = parseInt(parts[0]);
                                const d = parseInt(parts[1]);
                                if (m === month) day = d;
                            } else if (!isNaN(parseInt(cell)) && parseInt(cell) > 0 && parseInt(cell) <= 31) {
                                // Just "23", need to be careful. Check previous row for "1月"?
                                // Let's assume typical format "M/D"
                            }
                        }

                        if (day > 0) {
                            const dateStr = `${targetYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                            dateColMap[colIdx] = dateStr;
                            foundDate = true;
                        }
                    });
                    if (foundDate) {
                        dateRowIndex = r;
                        break;
                    }
                }

                if (dateRowIndex === -1) continue;

                // Process Rows
                const sheetUpdates: Record<string, LogEntry> = {}; // dateStr -> Entry

                for (let r = dateRowIndex + 1; r < data.length; r++) {
                    const row = data[r];
                    if (!row || !row[0]) continue;

                    const label = String(row[0]).trim();

                    // Check if it is a Game Row
                    const isGame = KNOWN_GAMES.some(g => label.includes(g) || g.includes(label));
                    // Check if it is Remark Row
                    const isRemark = label.includes('質化觀察') || label.includes('觀察');

                    if (!isGame && !isRemark) continue;

                    // Iterate columns
                    Object.entries(dateColMap).forEach(([colIdx, dateStr]) => {
                        const val = row[parseInt(colIdx)];
                        if (!sheetUpdates[dateStr]) {
                            sheetUpdates[dateStr] = { dateStr, attractions: {} };
                        }

                        if (isGame) {
                            // Find standard game name
                            const stdName = KNOWN_GAMES.find(g => label.includes(g) || g.includes(label));
                            if (stdName) {
                                sheetUpdates[dateStr].attractions[stdName] = Number(val) || 0;
                            }
                        } else if (isRemark && val) {
                            sheetUpdates[dateStr].remark = String(val).trim();
                        }
                    });
                }

                Object.values(sheetUpdates).forEach(entry => allUpdates.push(entry));
                totalDaysFound += Object.keys(sheetUpdates).length;
            }

            if (totalDaysFound === 0) {
                setMessage('找不到有效的日期數據。請確認 Excel 格式是否包含 "M/D" 格式的日期列。');
                setIsProcessing(false);
                return;
            }

            setMessage(`解析成功！共找到 ${totalDaysFound} 天的數據。正在合併至系統...`);

            // Fetch Existing Data
            const existingConfigs = await getSystemConfigsByPattern(`ops_granular_${targetYear}%`);

            // Prepare Batch Updates
            const dbUpdates: { key: string, value: string }[] = [];

            allUpdates.forEach(entry => {
                const key = `ops_granular_${entry.dateStr}`;
                const existingJson = existingConfigs[key];
                let data = existingJson ? JSON.parse(existingJson) : {};

                // Merge Attractions (Coverage directly)
                if (Object.keys(entry.attractions).length > 0) {
                    data.attractions = { ...(data.attractions || {}), ...entry.attractions };
                }

                // Merge Remarks (Append)
                if (entry.remark) {
                    if (data.remark) {
                        if (!data.remark.includes(entry.remark)) {
                            // Only append if not already present
                            data.remark = `${data.remark}\n${entry.remark}`;
                        }
                    } else {
                        data.remark = entry.remark;
                    }
                }

                dbUpdates.push({ key, value: JSON.stringify(data) });
            });

            // Upload
            await updateSystemConfigsBatch(dbUpdates);

            setMessage(`匯入完成！成功更新 ${dbUpdates.length} 筆資料。`);
            setIsProcessing(false);
            setPreviewSummary(`更新了 ${dbUpdates.length} 天的資料。請切換至對應年份查看。`);
            router.refresh();

        } catch (e: any) {
            console.error(e);
            setMessage(`匯入失敗: ${e.message}`);
            setIsProcessing(false);
        }

        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-md hover:bg-slate-50 text-slate-700 shadow-sm transition-colors"
                title="匯入歷史營運 Excel"
            >
                <FileSpreadsheet className="w-4 h-4 text-green-600" />
                <span className="hidden sm:inline">匯入歷史日誌</span>
            </button>
        );
    }

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-xl max-w-lg w-full space-y-6 relative animate-in zoom-in-95 duration-200">
                <button
                    onClick={() => setIsOpen(false)}
                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
                >
                    <X className="w-5 h-5" />
                </button>

                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <FileSpreadsheet className="w-6 h-6 text-green-600" />
                    歷史營運日誌匯入
                </h3>

                <div className="space-y-4">
                    <p className="text-sm text-slate-600 leading-relaxed">
                        由此匯入過去的 Excel 營運記錄。系統將會合併<b>「遊戲體驗人次」</b>並將<b>「質化觀察」</b>疊加至現有的備註中 (不會覆蓋假日資訊)。
                    </p>

                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
                        <div className="flex items-center gap-3">
                            <label className="text-sm font-medium text-slate-700 whitespace-nowrap">目標年份:</label>
                            <select
                                value={targetYear}
                                onChange={(e) => setTargetYear(Number(e.target.value))}
                                className="flex-1 border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                                disabled={isProcessing}
                            >
                                <option value={2024}>2024</option>
                                <option value={2025}>2025</option>
                                <option value={2023}>2023</option>
                            </select>
                        </div>

                        <div className="relative">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".xlsx, .xls"
                                onChange={handleFileChange}
                                className="hidden"
                                id="excel-upload-modal"
                                disabled={isProcessing}
                            />
                            <label
                                htmlFor="excel-upload-modal"
                                className={`
                                    w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all cursor-pointer border-2 border-dashed
                                    ${isProcessing
                                        ? 'bg-slate-100 border-slate-300 text-slate-400 cursor-not-allowed'
                                        : 'bg-green-50 border-green-300 text-green-700 hover:bg-green-100 hover:border-green-400'}
                                `}
                            >
                                {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                                {isProcessing ? '正在處理數據...' : '選擇 Excel 檔案 (.xlsx)'}
                            </label>
                        </div>
                    </div>

                    {message && (
                        <div className={`text-sm p-4 rounded-lg flex items-start gap-3 ${message.includes('失敗') ? 'bg-red-50 text-red-800 border border-red-100' : 'bg-blue-50 text-blue-800 border border-blue-100'}`}>
                            {message.includes('失敗') ? <AlertCircle className="w-5 h-5 shrink-0" /> : <CheckCircle className="w-5 h-5 shrink-0" />}
                            <span className="font-medium">{message}</span>
                        </div>
                    )}

                    {previewSummary && (
                        <div className="text-sm p-4 bg-green-50 text-green-800 border border-green-100 rounded-lg flex items-center gap-3 animate-in slide-in-from-bottom-2">
                            <Check className="w-5 h-5 shrink-0" />
                            <span className="font-medium">{previewSummary}</span>
                        </div>
                    )}
                </div>

                <div className="pt-2 border-t border-slate-100">
                    <p className="text-xs text-slate-400 text-center">
                        支援格式：各月份工作表 (Sheet Name含&quot;月&quot;)，日期列為M/D格式，第一欄需包含遊戲名稱或「質化觀察」。
                    </p>
                </div>
            </div>
        </div>
    );
}

function CheckCircle({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
    );
}
