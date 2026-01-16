"use client";

import React, { useMemo, useState, useEffect } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, ComposedChart
} from 'recharts';
import { Transaction } from '@/lib/data-manager';
import {
    CloudRain, CreditCard, Ticket, DollarSign, Calendar, TrendingUp, AlertTriangle, CheckCircle, Users,
    Thermometer, Sun, Cloud, CloudSnow, CloudLightning, FileText, Smartphone as SmartphoneIcon,
    Info, Trash2, X, Printer
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { getVisitorStats, getDailyVisitorStats } from '@/lib/visitor-data';
import { HOLIDAY_DATA_2026, getDailyRemark, isPublicHoliday } from '@/lib/holiday-data-2026';
import { updateDailyVisitorCount } from '@/app/actions/visitor-actions';

interface DashboardViewProps {
    transactions: Transaction[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

// Helper to format date in Taipei time
const formatDateInTaipei = (dateStr: string, includeTime = true) => {
    if (!dateStr) return '-';
    try {
        const date = new Date(dateStr);
        return new Intl.DateTimeFormat('zh-TW', {
            timeZone: 'Asia/Taipei',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: includeTime ? '2-digit' : undefined,
            minute: includeTime ? '2-digit' : undefined,
            second: includeTime ? '2-digit' : undefined,
            hour12: false
        }).format(date).replace(/\//g, '-');
    } catch (e) {
        return dateStr;
    }
};

export default function DashboardView({ transactions }: DashboardViewProps) {
    const [activeTab, setActiveTab] = useState<'overview' | 'growth' | 'invoice' | 'ops2026' | 'visitor_stats' | 'reconciliation'>('overview');
    const [selectedYear, setSelectedYear] = useState<string>('2026');
    const [selectedMonth, setSelectedMonth] = useState<string>('All');

    // Parse dates once
    const parsedData = useMemo(() => {
        return transactions.map(t => {
            const d = new Date(t.date);
            // Use Intl.DateTimeFormat to get parts in Taipei timezone
            const formatter = new Intl.DateTimeFormat('en-US', {
                timeZone: 'Asia/Taipei',
                year: 'numeric',
                month: 'numeric',
                day: 'numeric',
                hour: 'numeric',
                hour12: false
            });

            const parts = formatter.formatToParts(d);
            const getPart = (type: string) => parts.find(p => p.type === type)?.value;

            const year = parseInt(getPart('year') || '0');
            const month = parseInt(getPart('month') || '0');
            const day = parseInt(getPart('day') || '0');
            const hour = parseInt(getPart('hour') || '0');

            return {
                ...t,
                year,
                month,
                day,
                hour,
                ym: `${year}-${String(month).padStart(2, '0')}`
            };
        }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [transactions]);

    // Available Years/Months for Filter
    const years = useMemo(() => Array.from(new Set(parsedData.map(d => d.year.toString()))).sort(), [parsedData]);
    const months = useMemo(() => Array.from(new Set(parsedData.map(d => d.month.toString()))).sort((a, b) => parseInt(a) - parseInt(b)), [parsedData]);

    // Filtered Data
    const filteredData = useMemo(() => {
        return parsedData.filter(d => {
            const yearMatch = selectedYear === 'All' || d.year.toString() === selectedYear;
            const monthMatch = selectedMonth === 'All' || d.month.toString() === selectedMonth;
            return yearMatch && monthMatch;
        });
    }, [parsedData, selectedYear, selectedMonth]);

    const validTransactions = useMemo(() => filteredData.filter(t => t.type === '交易成功' && t.paymentStatus === '付款成功'), [filteredData]);

    // For Pivot Table: Ignore time filters, use all data
    const allValidTransactions = useMemo(() => parsedData.filter(t => t.type === '交易成功' && t.paymentStatus === '付款成功'), [parsedData]);

    // Basic Stats
    // Basic Stats
    const [granularity, setGranularity] = useState<'day' | 'week' | 'month'>('day');

    // Basic Stats & Trend Data
    const stats = useMemo(() => {
        const totalRevenue = validTransactions.reduce((acc, t) => acc + t.amount, 0);
        const totalTx = validTransactions.length;
        const avgTicket = totalTx > 0 ? totalRevenue / totalTx : 0;

        // Payment Methods
        const paymentMethods: Record<string, number> = {};
        validTransactions.forEach(t => {
            const key = t.paymentMethod || '未知';
            paymentMethods[key] = (paymentMethods[key] || 0) + 1;
        });

        // --- Aggregation Logic ---
        const dailyMap: Record<string, { date: string, revenue: number, count: number }> = {};
        const weeklyMap: Record<string, { date: string, revenue: number, count: number }> = {};
        const monthlyMap: Record<string, { date: string, revenue: number, count: number }> = {};

        validTransactions.forEach(t => {
            const d = new Date(t.date);
            if (isNaN(d.getTime())) return;

            // 1. Daily
            const dayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            if (!dailyMap[dayKey]) dailyMap[dayKey] = { date: dayKey, revenue: 0, count: 0 };
            dailyMap[dayKey].revenue += t.amount;
            dailyMap[dayKey].count += 1;

            // 2. Weekly (ISO Week) - Simple approach: Start of week (Monday)
            // Adjust to local Monday
            const day = d.getDay();
            const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
            const monday = new Date(d.setDate(diff));
            const weekKey = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;

            if (!weeklyMap[weekKey]) weeklyMap[weekKey] = { date: weekKey, revenue: 0, count: 0 };
            weeklyMap[weekKey].revenue += t.amount;
            weeklyMap[weekKey].count += 1;

            // 3. Monthly
            const monthKey = `${t.year}-${String(t.month).padStart(2, '0')}`;
            if (!monthlyMap[monthKey]) monthlyMap[monthKey] = { date: monthKey, revenue: 0, count: 0 };
            monthlyMap[monthKey].revenue += t.amount;
            monthlyMap[monthKey].count += 1;
        });

        // Sort Daily
        let dailyData = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

        // Fill gaps logic for Daily only
        if (selectedYear !== 'All' && selectedMonth !== 'All' && granularity === 'day') {
            const year = parseInt(selectedYear);
            const month = parseInt(selectedMonth);
            const daysInMonth = new Date(year, month, 0).getDate();
            const filled = [];
            for (let d = 1; d <= daysInMonth; d++) {
                const k = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                filled.push(dailyMap[k] || { date: k, revenue: 0, count: 0 });
            }
            dailyData = filled;
        }

        // Prepare Trend Data based on granularity
        let trendData: any[] = [];
        if (granularity === 'day') {
            trendData = dailyData;
        } else if (granularity === 'week') {
            trendData = Object.values(weeklyMap).sort((a, b) => a.date.localeCompare(b.date));
        } else {
            trendData = Object.values(monthlyMap).sort((a, b) => a.date.localeCompare(b.date));
        }

        // Add ATV, Highlight, and Cumulative to trendData
        let cumulativeRevenue = 0;
        trendData = trendData.map(d => {
            cumulativeRevenue += d.revenue;

            // Highlight if Weekend or Holiday
            let isHighlight = false;
            if (granularity === 'day') {
                const dateObj = new Date(d.date);
                const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
                const isHoliday = isPublicHoliday(d.date);
                isHighlight = isWeekend || isHoliday;
            }

            return {
                ...d,
                atv: d.count > 0 ? Math.round(d.revenue / d.count) : 0,
                isHighlight,
                cumulativeRevenue
            };
        });

        const totalActualCumulative = trendData.length > 0 ? trendData[trendData.length - 1].cumulativeRevenue : 0;

        // Hourly (unchanged)
        const hourlyMap: Record<number, number> = {};
        for (let i = 0; i < 24; i++) hourlyMap[i] = 0;
        validTransactions.forEach(t => {
            const d = new Date(t.date);
            if (!isNaN(d.getTime())) {
                hourlyMap[d.getHours()] = (hourlyMap[d.getHours()] || 0) + t.amount;
            }
        });
        const hourlyData = Object.entries(hourlyMap).map(([h, v]) => ({ hour: `${h}:00`, revenue: v }));

        return { totalRevenue, totalTx, avgTicket, paymentMethods, dailyData, trendData, hourlyData, totalActualCumulative };
    }, [validTransactions, selectedYear, selectedMonth, granularity]);

    // Growth Analysis (MoM, YoY)
    const growthStats = useMemo(() => {
        // Group by YYYY-MM
        const monthlyData: Record<string, number> = {};
        parsedData.filter(t => t.type === '交易成功').forEach(t => {
            monthlyData[t.ym] = (monthlyData[t.ym] || 0) + t.amount;
        });

        const sortedMonths = Object.keys(monthlyData).sort();
        const chartData = sortedMonths.map((ym, idx) => {
            const revenue = monthlyData[ym];
            const prevMonth = sortedMonths[idx - 1];
            const prevMonthRev = prevMonth ? monthlyData[prevMonth] : 0;
            const mom = prevMonthRev > 0 ? ((revenue - prevMonthRev) / prevMonthRev) * 100 : 0;

            // YoY
            const [y, m] = ym.split('-');
            const prevYearYM = `${parseInt(y) - 1}-${m}`;
            const prevYearRev = monthlyData[prevYearYM] || 0;
            const yoy = prevYearRev > 0 ? ((revenue - prevYearRev) / prevYearRev) * 100 : 0;

            return { ym, revenue, mom, yoy };
        });

        return chartData;
    }, [parsedData]);

    // Invoice Tab State
    const [invoiceSubTab, setInvoiceSubTab] = useState<'list' | 'anomaly'>('list');

    // Default Date Range: 1st of current month to Today
    const [invoiceStartDate, setInvoiceStartDate] = useState<string>(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    });
    const [invoiceEndDate, setInvoiceEndDate] = useState<string>(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    });
    const [invoicePaymentFilter, setInvoicePaymentFilter] = useState<string>('All');

    // Payment Method Options
    const paymentMethodOptions = useMemo(() => {
        const methods = new Set(parsedData.map(t => t.paymentMethod).filter(Boolean));
        return Array.from(methods).sort();
    }, [parsedData]);

    // Identify Refund Invoices (Invoice numbers that have at least one negative amount record)
    const refundSet = useMemo(() => {
        const set = new Set<string>();
        parsedData.forEach(t => {
            if (t.invoiceNumber && t.invoiceNumber.trim() !== '-' && t.amount < 0) {
                set.add(t.invoiceNumber);
            }
        });
        return set;
    }, [parsedData]);

    // Data for Invoice List (Applied all filters + Only Valid Invoices)
    const invoiceTabData = useMemo(() => {
        let data = parsedData;

        // Date Range Filter (Overrides global Year/Month if set)
        if (invoiceStartDate || invoiceEndDate) {
            data = data.filter(t => {
                const dStr = `${t.year}-${String(t.month).padStart(2, '0')}-${String(t.day).padStart(2, '0')}`;
                if (invoiceStartDate && dStr < invoiceStartDate) return false;
                if (invoiceEndDate && dStr > invoiceEndDate) return false;
                return true;
            });
        } else {
            // Fallback to global filter
            data = data.filter(d => {
                const yearMatch = selectedYear === 'All' || d.year.toString() === selectedYear;
                const monthMatch = selectedMonth === 'All' || d.month.toString() === selectedMonth;
                return yearMatch && monthMatch;
            });
        }

        // Only show successful transactions for invoice audit
        data = data.filter(t => t.type === '交易成功');

        // Payment Method Filter
        if (invoicePaymentFilter !== 'All') {
            data = data.filter(t => t.paymentMethod === invoicePaymentFilter);
        }

        // Only show records with Invoice Number <--- REMOVED FILTER
        // data = data.filter(t => t.invoiceNumber && t.invoiceNumber.trim() !== '' && t.invoiceNumber !== '-');

        // Sort by Date DESC (Newest First)
        return data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [parsedData, selectedYear, selectedMonth, invoiceStartDate, invoiceEndDate, invoicePaymentFilter]);

    // Data for Anomaly Detection (Applied Date filter ONLY, ignore Payment filter)
    const invoiceAnomalyData = useMemo(() => {
        let data = parsedData;

        // Date Range Filter (Same logic as above)
        if (invoiceStartDate || invoiceEndDate) {
            data = data.filter(t => {
                const dStr = `${t.year}-${String(t.month).padStart(2, '0')}-${String(t.day).padStart(2, '0')}`;
                if (invoiceStartDate && dStr < invoiceStartDate) return false;
                if (invoiceEndDate && dStr > invoiceEndDate) return false;
                return true;
            });
        } else {
            data = data.filter(d => {
                const yearMatch = selectedYear === 'All' || d.year.toString() === selectedYear;
                const monthMatch = selectedMonth === 'All' || d.month.toString() === selectedMonth;
                return yearMatch && monthMatch;
            });
        }

        // Only successful transactions for anomaly detection
        data = data.filter(t => t.type === '交易成功');

        // Anomaly Logic
        // Anomaly Logic
        const issues: { ym: string, type: string, desc: string, invoices: string[] }[] = [];
        const groupedByYM: Record<string, { num: number, full: string }[]> = {};

        // Group for Duplicate/Refund Check
        const invoiceMap: Record<string, typeof data> = {};

        data.forEach(t => {
            // Check for Missing Invoice Number (Anomaly #2)
            if (!t.invoiceNumber || t.invoiceNumber.trim() === '' || t.invoiceNumber === '-') {
                // We typically handle missing invoices in the list view, but if we want them in anomaly:
                // Let's keep them here as "漏開發票"
                issues.push({
                    ym: t.ym,
                    type: '漏開發票',
                    desc: `交易成功但未開立發票 (${t.date})`,
                    invoices: [t.id]
                });
                return;
            }

            if (!invoiceMap[t.invoiceNumber]) invoiceMap[t.invoiceNumber] = [];
            invoiceMap[t.invoiceNumber].push(t);

            if (t.invoiceNumber.length > 2) {
                const numPart = parseInt(t.invoiceNumber.slice(2));
                if (!isNaN(numPart)) {
                    if (!groupedByYM[t.ym]) groupedByYM[t.ym] = [];
                    // Avoid adding duplicates to this list for gap checking
                    if (!groupedByYM[t.ym].some(item => item.full === t.invoiceNumber)) {
                        groupedByYM[t.ym].push({ num: numPart, full: t.invoiceNumber });
                    }
                }
            }
        });

        // Check Invoice Map for Duplicates / Refunds
        Object.entries(invoiceMap).forEach(([invNum, txs]) => {
            if (txs.length > 1) {
                const hasNegative = txs.some(t => t.amount < 0);
                const ym = txs[0].ym; // use the first record's YM

                if (hasNegative) {
                    issues.push({
                        ym,
                        type: '銷退',
                        desc: `發票 ${invNum} 包含銷退記錄 (正負抵銷或退款)`,
                        invoices: [invNum]
                    });
                } else {
                    issues.push({
                        ym,
                        type: '重複',
                        desc: `發票號碼 ${invNum} 重複出現 ${txs.length} 次`,
                        invoices: [invNum]
                    });
                }
            }
        });

        // Check for Gaps (Anomaly #1)
        Object.keys(groupedByYM).sort().forEach(ym => {
            const list = groupedByYM[ym].sort((a, b) => a.num - b.num);
            if (list.length < 2) return;

            for (let i = 1; i < list.length; i++) {
                const diff = list[i].num - list[i - 1].num;
                if (diff > 1) {
                    // Assume < 500 is a gap
                    if (diff < 500) {
                        issues.push({
                            ym,
                            type: '斷號',
                            desc: `在 ${list[i - 1].full} 與 ${list[i].full} 之間缺少 ${diff - 1} 張發票`,
                            invoices: [list[i - 1].full, list[i].full]
                        });
                    }
                }
            }
        });

        return issues;
    }, [parsedData, selectedYear, selectedMonth, invoiceStartDate, invoiceEndDate]);



    // Yearly Pivot Data (Rows: Month 1-12, Cols: Years)
    const pivotData = useMemo(() => {
        const map: Record<number, Record<string, number>> = {};
        // Initialize 1-12 months
        for (let m = 1; m <= 12; m++) map[m] = {};

        allValidTransactions.forEach(t => {
            if (!map[t.month]) map[t.month] = {};
            map[t.month][t.year] = (map[t.month][t.year] || 0) + t.amount;
        });

        // Fixed years columns as requested or dynamic
        // User requested cols: Month, 2024, 2025, 2026, YoY
        const years = [2024, 2025, 2026];

        return { map, years };
    }, [allValidTransactions]);

    // 2026 Target State
    const [target2026, setTarget2026] = useState<number>(5600000);

    const yearPivotData = useMemo(() => {
        // Calculate Total 2025 Revenue first to determine proportions
        let total2025 = 0;
        for (let m = 1; m <= 12; m++) {
            total2025 += (pivotData.map[m][2025] || 0);
        }

        return Array.from({ length: 12 }, (_, i) => i + 1).map(m => {
            const r2024 = pivotData.map[m][2024] || 0;
            const r2025 = pivotData.map[m][2025] || 0;
            const r2026 = pivotData.map[m][2026] || 0;

            // Calculate 2026 Target based on 2025 proportion
            let target = 0;
            if (total2025 > 0) {
                target = (r2025 / total2025) * target2026;
            }

            let yoy = null;
            if (r2025 > 0) {
                yoy = ((r2026 - r2025) / r2025) * 100;
            }
            return { month: m, '2024': r2024, '2025': r2025, '2026': r2026, target2026: target, yoy };
        });
    }, [pivotData, target2026]);

    const receivableTarget = useMemo(() => {
        if (selectedYear !== '2026') return 0;

        let target = 0;
        if (selectedMonth === 'All') {
            target = target2026;
            // Approximate target for current progress in the year
            const today = new Date();
            if (today.getFullYear() === 2026) {
                const startOfYear = new Date(2026, 0, 1);
                const diffTime = Math.abs(today.getTime() - startOfYear.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                target = (target2026 / 365) * diffDays;
            }
        } else {
            const m = parseInt(selectedMonth);
            const row = yearPivotData.find(r => r.month === m);
            if (row) {
                target = row.target2026;
                // If current month, split by days
                const today = new Date();
                if (today.getFullYear() === 2026 && (today.getMonth() + 1) === m) {
                    const daysInMonth = new Date(2026, m, 0).getDate();
                    target = (target / daysInMonth) * today.getDate();
                }
            }
        }
        return Math.round(target);
    }, [selectedYear, selectedMonth, target2026, yearPivotData]);


    // 2026 Operations Tab Logic (Moved here to depend on pivotData & target2026)
    const [ops2026Month, setOps2026Month] = useState<number>(new Date().getFullYear() === 2026 ? new Date().getMonth() + 1 : 1);
    const [weatherData, setWeatherData] = useState<Record<string, { min: number, max: number, code: number }>>({});
    const [remarks, setRemarks] = useState<Record<string, string>>({});
    const [dailyVisitorStats, setDailyVisitorStats] = useState<Record<string, number>>({});

    // Reconciliation State
    const [platformData, setPlatformData] = useState<any[]>([]);
    const [isMatching, setIsMatching] = useState(false);
    const [reconStartDate, setReconStartDate] = useState('2026-01-01');
    const [reconEndDate, setReconEndDate] = useState<string>(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    });
    const [reconPaymentMethod, setReconPaymentMethod] = useState<string>('一般信用卡');
    const [inspectedRow, setInspectedRow] = useState<any | null>(null);

    // Platform Reconciliation Rules Configuration
    const RECON_RULES: Record<string, {
        dateFields: string[],
        timeFields: string[],
        amountFields: string[],
        idFields: string[],
        statusFields: string[],
        successStatuses: string[]
    }> = {
        '一般信用卡': {
            dateFields: ['訂單交易日期', '支付日期', '交易日期', 'Date', '日期', '訂單日期'],
            timeFields: ['交易時間(台北時間)', '交易時間', '時間', 'Time'],
            amountFields: ['主支付金額', '特店支付金額', '主支付數值(金額)', '交易金額', '金額', 'Amount', '金額(TWD)'],
            idFields: ['特店訂單編號', '藍新金流交易序號', '藍新金流訂單編號', '訂單編號', '交易編號', 'Transaction ID', '序號', '藍新序號', '平台單號'],
            statusFields: ['訂單支付狀態', '主支付狀態', '訂單交易狀態', '交易狀態', 'Status', '交易回覆訊息'],
            successStatuses: ['已付款', '付款成功', '成功', 'Success', 'Paid', 'SUCCESS', 'SUCCESS_PAY', 'AUTHORIZE_SUCCESS', '授權成功']
        },
        '掃碼-全支付': {
            dateFields: ['交易時間', '日期'],
            timeFields: ['時間'],
            amountFields: ['支付金額', '交易金額', '金額'],
            idFields: ['商戶交易編號', '訂單編號'],
            statusFields: ['交易類型', '狀態'],
            successStatuses: ['付款', '成功', 'SUCCESS', 'Paid']
        },
        '掃碼-街口支付': {
            dateFields: ['交易時間', '日期'],
            timeFields: ['時間'],
            amountFields: ['支付金額', '訂單金額', '金額'],
            idFields: ['訂單編號', '廠商端訂單編號'],
            statusFields: ['交易行為', '狀態'],
            successStatuses: ['支付', '成功', 'SUCCESS', 'Paid']
        },
        '掃碼-LINE Pay': {
            dateFields: ['交易日期', '日期'],
            timeFields: ['交易時間', '時間'],
            amountFields: ['付款金額', '支付金額', '金額'],
            idFields: ['交易號碼', '訂單號碼'],
            statusFields: ['交易狀態', '付款狀態'],
            successStatuses: ['PAYMENT', 'CAPTURE', '成功', 'SUCCESS', 'Paid']
        }
    };

    const handlePlatformUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.[0]) return;
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const dataRaw = event.target?.result;
                const wb = XLSX.read(dataRaw, { type: 'array', cellDates: true });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                // Use raw: false to get formatted strings from cells, which helps with date formats
                const data = XLSX.utils.sheet_to_json(ws, { raw: false });

                if (!data || data.length === 0) {
                    alert('讀取失敗：檔案內容為空或無法解析');
                    return;
                }

                // Map platform data to a standard format
                const parsed = data.map((row: any) => {
                    // Pre-process row values: strip =" and " common in CSV exports for Excel
                    const cleanRow: any = {};
                    Object.entries(row).forEach(([k, v]) => {
                        let val = v;
                        if (typeof v === 'string') {
                            if (v.startsWith('="') && v.endsWith('"')) {
                                val = v.substring(2, v.length - 1);
                            } else if (v.startsWith('"') && v.endsWith('"')) {
                                val = v.substring(1, v.length - 1);
                            }
                        }
                        cleanRow[k] = val;
                    });

                    // 1. Get current rule
                    const rule = RECON_RULES[reconPaymentMethod] || RECON_RULES['一般信用卡'];

                    // 2. Map fields based on rule
                    const findVal = (fields: string[]) => {
                        for (const f of fields) if (cleanRow[f] !== undefined) return cleanRow[f];
                        return null;
                    };

                    const rawDate = findVal(rule.dateFields);
                    const rawTime = findVal(rule.timeFields) || '00:00:00';
                    const amount = Number(findVal(rule.amountFields) || 0);
                    const txId = String(findVal(rule.idFields) || '-');
                    const status = String(findVal(rule.statusFields) || '已付款').trim();

                    let dateStr = '';
                    if (rawDate) {
                        let combinedDate: Date | null = null;

                        // Check if it's already a Date object
                        if (rawDate instanceof Date) {
                            combinedDate = rawDate;
                        } else if (typeof rawDate === 'number') {
                            combinedDate = new Date(Math.round((rawDate - 25569) * 864e5));
                        } else {
                            let fullStr = String(rawDate).trim();

                            // Special handling for LINE Pay YYYYMMDDHHMMSS (14 digits)
                            if (/^\d{14}$/.test(fullStr)) {
                                fullStr = `${fullStr.substring(0, 4)}-${fullStr.substring(4, 6)}-${fullStr.substring(6, 8)} ${fullStr.substring(8, 10)}:${fullStr.substring(10, 12)}:${fullStr.substring(12, 14)}`;
                            }

                            if (rawTime && !fullStr.includes(':')) {
                                fullStr += ' ' + String(rawTime).trim();
                            }

                            // Remove any existing timezone suffix to force +0800
                            const cleanDateStr = fullStr.replace(/\s*[+-]\d{4}$/, '').replace(/Z$/, '').replace(/\//g, '-');

                            // If no timezone, force +0800
                            if (!cleanDateStr.includes('+') && !cleanDateStr.includes('Z')) {
                                combinedDate = new Date(cleanDateStr + ' +0800');
                            } else {
                                combinedDate = new Date(cleanDateStr);
                            }
                        }

                        if (combinedDate && !isNaN(combinedDate.getTime())) {
                            dateStr = combinedDate.toISOString();
                        }
                    }

                    return {
                        date: dateStr,
                        amount,
                        txId,
                        status,
                        raw: cleanRow,
                        ruleUsed: rule
                    };
                }).filter((r: any) => {
                    if (r.date === '' || isNaN(r.amount)) return false;
                    const rule = RECON_RULES[reconPaymentMethod] || RECON_RULES['一般信用卡'];
                    if (r.status && !rule.successStatuses.some((s: string) => r.status.includes(s))) return false;
                    if (r.amount === 0) return false;
                    return true;
                });

                if (parsed.length === 0) {
                    alert('讀取失敗：找不到有效的日期資料或已付款記錄，請檢查表格內容與標題。');
                } else {
                    setPlatformData(parsed);
                }
            } catch (err) {
                console.error('Platform upload error:', err);
                alert('上傳失敗：檔案格式錯誤或系統無法辨識此 CSV/Excel 內容');
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const reconciliationMatches = useMemo(() => {
        if (!platformData.length) return [];

        // 1. Filter system records for Selected Payment Method AND date range
        const systemRecords = parsedData.filter(t => {
            if (t.paymentMethod !== reconPaymentMethod || t.type !== '交易成功') return false;

            // Format date to YYYY-MM-DD for comparison
            const dateStr = `${t.year}-${String(t.month).padStart(2, '0')}-${String(t.day).padStart(2, '0')}`;
            if (reconStartDate && dateStr < reconStartDate) return false;
            if (reconEndDate && dateStr > reconEndDate) return false;
            return true;
        });

        // 2. Filter platform data by date range
        const filteredPlatformData = platformData.filter(plat => {
            const dateStr = plat.date.split('T')[0];
            if (reconStartDate && dateStr < reconStartDate) return false;
            if (reconEndDate && dateStr > reconEndDate) return false;
            return true;
        });

        const matchedPlatformIndices = new Set<number>();
        const matches: { system?: any, platform?: any, status: 'matched' | 'mismatch' | 'missing_system' | 'missing_platform' }[] = [];

        // 3. Try to match each system record
        systemRecords.forEach(sys => {
            // Check for sales return
            const isSalesReturn = sys.invoiceNumber && refundSet.has(sys.invoiceNumber);
            const sysWithMeta = { ...sys, isSalesReturn };

            // Note: We no longer return early here for sales returns.
            // We allow them to go through the matching logic below.

            const sysTime = new Date(sys.date).getTime();
            let bestMatchIdx = -1;
            let minDiff = 60 * 1000; // 60 seconds tolerance

            filteredPlatformData.forEach((plat, pIdx) => {
                if (matchedPlatformIndices.has(pIdx)) return;
                if (Math.abs(plat.amount - sys.amount) > 0.1) return; // Amount mismatch

                const platTime = new Date(plat.date).getTime();
                const diff = Math.abs(platTime - sysTime);
                if (diff < minDiff) {
                    minDiff = diff;
                    bestMatchIdx = pIdx;
                }
            });

            if (bestMatchIdx !== -1) {
                matchedPlatformIndices.add(bestMatchIdx);
                matches.push({
                    system: sysWithMeta,
                    platform: filteredPlatformData[bestMatchIdx],
                    status: 'matched'
                });
            } else {
                matches.push({
                    system: sysWithMeta,
                    status: 'missing_platform'
                });
            }
        });

        // 4. Add unmatched platform records
        filteredPlatformData.forEach((plat, pIdx) => {
            if (!matchedPlatformIndices.has(pIdx)) {
                matches.push({
                    platform: plat,
                    status: 'missing_system'
                });
            }
        });

        // Sort by date (either system or platform)
        return matches.sort((a, b) => {
            const timeA = new Date(a.system?.date || a.platform?.date).getTime();
            const timeB = new Date(b.system?.date || b.platform?.date).getTime();
            return timeB - timeA; // Descending
        });
    }, [parsedData, platformData, reconStartDate, reconEndDate]);

    useEffect(() => {
        const year = 2026;
        const daysInMonth = new Date(year, ops2026Month, 0).getDate();
        setRemarks(prev => {
            const next = { ...prev };
            let changed = false;
            for (let d = 1; d <= daysInMonth; d++) {
                const dateStr = `${year}-${String(ops2026Month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                if (next[dateStr] === undefined) {
                    const def = getDailyRemark(dateStr);
                    if (def) {
                        next[dateStr] = def;
                        changed = true;
                    }
                }
            }
            return changed ? next : prev;
        });
    }, [ops2026Month]);

    // Fetch Weather Data
    // Fetch Visitor Data
    const [visitorData, setVisitorData] = useState<Record<number, Record<number, number>>>({});
    useEffect(() => {
        getVisitorStats().then(setVisitorData);
    }, []);

    useEffect(() => {
        if (activeTab !== 'ops2026') return;

        const fetchWeather = async () => {
            const year = 2026;
            const month = ops2026Month;
            const today = new Date();

            // Can only fetch past data or forecast for near past
            // Define range: Start of month to ... min(End of month, Yesterday)
            const startStr = `${year}-${String(month).padStart(2, '0')}-01`;
            const endDate = new Date(year, month, 0);

            // If the whole month is in future, skip
            if (today < new Date(year, month - 1, 1)) return;

            // Determine end date for fetch
            let endFetchDate = endDate;
            if (today < endDate) {
                // If current month, fetch up to yesterday (or today if API supports)
                // Open-Meteo Archive/Forecast mix. Archive usually has 5 day lag.
                // Let's rely on standard archive logic, might miss recent days.
                // Actually, let's just try to fetch the whole month relative to "today"
                // For simplicity, we just fetch what we can. 
                // The API handles future dates by just returning nulls or forecasting if we use forecast endpoint.
                // But user wants "past weather".
                // Let's use the 'forecast' endpoint with 'past_days' if we want recent data, 
                // but 'archive' is better for stability of history.
                // Let's try archive endpoint first for simplicity.
                endFetchDate = new Date(today);
                endFetchDate.setDate(endFetchDate.getDate() - 1); // Yesterday
            }

            if (endFetchDate < new Date(year, month - 1, 1)) return; // No past days in this month

            const endStr = `${endFetchDate.getFullYear()}-${String(endFetchDate.getMonth() + 1).padStart(2, '0')}-${String(endFetchDate.getDate()).padStart(2, '0')}`;

            // Check if we already have data for this month's first day (simple cache check)
            if (weatherData[startStr]) return;

            try {
                // Use archive-api which is free and good for past data
                const url = `https://archive-api.open-meteo.com/v1/archive?latitude=25.0969&longitude=121.5146&start_date=${startStr}&end_date=${endStr}&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=Asia%2FTaipei`;
                const res = await fetch(url);
                const data = await res.json();

                if (data.daily) {
                    const newWeather: Record<string, any> = {};
                    data.daily.time.forEach((t: string, i: number) => {
                        newWeather[t] = {
                            min: data.daily.temperature_2m_min[i],
                            max: data.daily.temperature_2m_max[i],
                            code: data.daily.weather_code[i]
                        };
                    });
                    setWeatherData(prev => ({ ...prev, ...newWeather }));
                }
            } catch (e) {
                console.error("Failed to fetch weather", e);
            }
        };

        fetchWeather();
        getDailyVisitorStats(2026, ops2026Month).then(setDailyVisitorStats);
    }, [activeTab, ops2026Month]);

    const ops2026Data = useMemo(() => {
        const year = 2026;
        const month = ops2026Month;

        // Days in month
        const daysInMonth = new Date(year, month, 0).getDate();

        // Filter data for 2026 and selected month
        const monthlyRecords = parsedData.filter(t => t.year === year && t.month === month && t.type === '交易成功');

        // Aggregate daily revenue
        const dailyRevenue: Record<number, number> = {};
        monthlyRecords.forEach(t => {
            const day = t.day;
            dailyRevenue[day] = (dailyRevenue[day] || 0) + t.amount;
        });

        // Generate full list
        const report = [];
        const weekDayMap = ['日', '一', '二', '三', '四', '五', '六'];

        for (let d = 1; d <= daysInMonth; d++) {
            const date = new Date(year, month - 1, d);
            const weekDay = weekDayMap[date.getDay()];
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

            report.push({
                day: d,
                weekDay,
                revenue: dailyRevenue[d] || 0,
                isWeekend: date.getDay() === 0 || date.getDay() === 6,
                dateStr,
                weather: weatherData[dateStr],
                remark: remarks[dateStr] || '',
                visitorCount: dailyVisitorStats[dateStr] || 0
            });
        }

        return report;
    }, [parsedData, ops2026Month, weatherData, remarks, dailyVisitorStats]);

    const ops2026KPI = useMemo(() => {
        // 1. Target
        let total2025 = 0;
        for (let m = 1; m <= 12; m++) total2025 += (pivotData.map[m][2025] || 0);

        const r2025 = pivotData.map[ops2026Month][2025] || 0;

        let monthlyTarget = 0;
        if (total2025 > 0) {
            monthlyTarget = (r2025 / total2025) * target2026;
        }

        // 2. Working Days (Exclude Mondays)
        let workingDays = 0;
        const year = 2026;
        const daysInMonth = new Date(year, ops2026Month, 0).getDate();
        for (let d = 1; d <= daysInMonth; d++) {
            const date = new Date(year, ops2026Month - 1, d);
            if (date.getDay() !== 1) { // 1 is Monday
                workingDays++;
            }
        }

        // 3. Daily Benchmark
        const dailyBenchmark = workingDays > 0 ? monthlyTarget / workingDays : 0;

        // 4. Actual Revenue
        const actualRevenue = ops2026Data.reduce((sum, d) => sum + d.revenue, 0);

        // 5. Achievement Rate
        const achievementRate = monthlyTarget > 0 ? (actualRevenue / monthlyTarget) * 100 : 0;

        // 6. Visitor Stats
        const totalVisitors = ops2026Data.reduce((sum, d) => sum + (d.visitorCount || 0), 0);
        const arpu = totalVisitors > 0 ? actualRevenue / totalVisitors : 0;

        return {
            target: monthlyTarget,
            benchmark: dailyBenchmark,
            actual: actualRevenue,
            rate: achievementRate,
            workingDays,
            totalVisitors,
            arpu
        };
    }, [pivotData, target2026, ops2026Month, ops2026Data]);

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <header className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-600 p-2 rounded-lg">
                        <BarChart2 className="w-6 h-6 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800">光XR - 財務分析儀表板</h1>
                </div>

                <div className="flex gap-3">
                    <select
                        className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg shadow-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                    >
                        {years.map(y => <option key={y} value={y}>{y} 年</option>)}
                    </select>
                    <select
                        className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg shadow-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                    >
                        <option value="All">全年度</option>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                            <option key={m} value={m}>{m} 月</option>
                        ))}
                    </select>

                    <UploadButton />
                </div>
            </header>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card title="期間總營收"
                    value={`$${stats.totalRevenue.toLocaleString()}`}
                    sub={`共 ${stats.totalTx.toLocaleString()} 筆交易`}
                    icon={<DollarSign className="w-8 h-8 text-green-500 opacity-80" />} trend="up" />

                <Card title="累計應收 (預計)"
                    value={`$${receivableTarget.toLocaleString()}`}
                    sub={`${selectedYear === '2026' ? '2026 年度/月度進度目標' : '僅 2026 提供進度追蹤'}`}
                    icon={<FileText className="w-8 h-8 text-orange-500 opacity-80" />} />

                <Card title="累計實收"
                    value={`$${stats.totalActualCumulative.toLocaleString()}`}
                    sub={`達成率: ${receivableTarget > 0 ? ((stats.totalActualCumulative / receivableTarget) * 100).toFixed(1) : 0}%`}
                    icon={<CheckCircle className="w-8 h-8 text-blue-500 opacity-80" />} />

                <Card title="平均客單價 (ATV)"
                    value={`$${Math.round(stats.avgTicket).toLocaleString()}`}
                    sub="每筆訂單平均"
                    icon={<CreditCard className="w-8 h-8 text-purple-500 opacity-80" />} trend="neutral" />
            </div>


            <div className="flex space-x-1 mb-6 border-b border-slate-200 overflow-x-auto">
                {[
                    { id: 'overview', label: '營運總覽', icon: <TrendingUp className="w-4 h-4 mr-2" /> },
                    { id: 'growth', label: '成長趨勢 (MoM/YoY)', icon: <TrendingUp className="w-4 h-4 mr-2" /> },
                    { id: 'invoice', label: '發票稽核', icon: <AlertTriangle className="w-4 h-4 mr-2" /> },
                    { id: 'reconciliation', label: '對帳中心', icon: <CheckCircle className="w-4 h-4 mr-2" /> },
                    { id: 'ops2026', label: '2026年運營', icon: <Calendar className="w-4 h-4 mr-2" /> },
                    { id: 'visitor_stats', label: '遊客統計', icon: <Users className="w-4 h-4 mr-2" /> }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`py-3 px-6 font-medium text-sm flex items-center transition-colors whitespace-nowrap ${activeTab === tab.id
                            ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50/50'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                            }`}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && (
                <div className="space-y-6 animate-in fade-in duration-500">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-bold text-slate-800">營收走勢分析</h3>
                                <div className="flex bg-slate-100 p-1 rounded-lg">
                                    {(['day', 'week', 'month'] as const).map((g) => (
                                        <button
                                            key={g}
                                            onClick={() => setGranularity(g)}
                                            className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${granularity === g
                                                ? 'bg-white text-blue-600 shadow-sm'
                                                : 'text-slate-500 hover:text-slate-700'
                                                }`}
                                        >
                                            {g === 'day' ? '每日' : g === 'week' ? '每週' : '每月'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="h-80">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart key={`${selectedYear}-${selectedMonth}-${granularity}`} data={stats.trendData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                                        <XAxis
                                            dataKey="date"
                                            minTickGap={30}
                                            tickFormatter={val => granularity === 'day' ? val.slice(5) : val}
                                        />
                                        <YAxis
                                            yAxisId="left"
                                            tickFormatter={(val) => `$${(val / 1000).toLocaleString()}k`}
                                            label={{ value: '營收', angle: -90, position: 'insideLeft' }}
                                        />
                                        <YAxis
                                            yAxisId="right"
                                            orientation="right"
                                            tickFormatter={(val) => `$${val.toLocaleString()}`}
                                            label={{ value: '平均客單價 (ATV)', angle: 90, position: 'insideRight' }}
                                        />
                                        <Tooltip
                                            formatter={(val: number | string | Array<number | string> | undefined, name: string | undefined) => {
                                                if (name === 'count') return [`${val} 筆`, '交易筆數'];
                                                if (name === 'revenue') return [`$${(val as number).toLocaleString()}`, '營收'];
                                                if (name === 'atv') return [`$${(val as number).toLocaleString()}`, '平均客單價'];
                                                return val;
                                            }}
                                            labelFormatter={(label) => `時間: ${label}`}
                                        />
                                        <Legend />
                                        <Bar yAxisId="left" dataKey="revenue" name="營收" radius={[4, 4, 0, 0]} barSize={20}>
                                            {stats.trendData.map((entry: any, index: number) => (
                                                <Cell key={`cell-${index}`} fill={entry.isHighlight ? '#ef4444' : '#3b82f6'} />
                                            ))}
                                        </Bar>
                                        <Line yAxisId="right" type="monotone" dataKey="atv" stroke="#ff7300" name="平均客單價" strokeWidth={2} dot={{ r: 3 }} />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                            <h3 className="text-lg font-bold text-slate-800 mb-4">支付方式佔比</h3>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={Object.entries(stats.paymentMethods).map(([k, v]) => ({ name: k, value: v }))}
                                            cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {Object.entries(stats.paymentMethods).map((_, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(val: number | undefined) => val !== undefined ? val.toLocaleString() : ''} />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Hourly Chart */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                        <h3 className="text-lg font-bold text-slate-800 mb-4">時段熱度分析</h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.hourlyData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="hour" />
                                    <YAxis tickFormatter={(val) => `$${(val / 1000).toLocaleString()}k`} />
                                    <Tooltip formatter={(val: number | undefined) => val ? `$${val.toLocaleString()}` : '$0'} />
                                    <Bar dataKey="revenue" fill="#8884d8" radius={[4, 4, 0, 0]} name="營收" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            {/* Reconciliation Tab */}
            {activeTab === 'reconciliation' && (
                <div className="space-y-6 animate-in fade-in duration-500 print:m-0 print:p-0">
                    {/* Print CSS */}
                    <style dangerouslySetInnerHTML={{
                        __html: `
                        @media print {
                            body * { visibility: hidden; }
                            .print-section, .print-section * { visibility: visible; }
                            .print-section { 
                                position: absolute; 
                                left: 0; 
                                top: 0; 
                                width: 100%; 
                                padding: 0 !important;
                                margin: 0 !important;
                                border: none !important;
                                box-shadow: none !important;
                            }
                            .no-print { display: none !important; }
                            table { font-size: 10px !important; }
                            th, td { padding: 4px !important; border: 1px solid #e2e8f0 !important; }
                            .bg-red-50\\/30 { background-color: #fef2f2 !important; -webkit-print-color-adjust: exact; }
                            .text-red-500 { color: #ef4444 !important; }
                        }
                    `}} />

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 print-section">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 no-print">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">對帳中心</h3>
                                <p className="text-sm text-slate-500">比對系統發票與平台交易數據 (依金額及時間自動匹配)</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-3">
                                <button
                                    onClick={() => {
                                        const now = new Date();
                                        const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                                        const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
                                        const formatDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                                        setReconStartDate(formatDate(firstDayLastMonth));
                                        setReconEndDate(formatDate(lastDayLastMonth));
                                    }}
                                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold transition-colors"
                                >
                                    上個月
                                </button>
                                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
                                    <span className="text-xs text-slate-500">從</span>
                                    <input
                                        type="date"
                                        value={reconStartDate}
                                        onChange={(e) => setReconStartDate(e.target.value)}
                                        className="bg-transparent text-sm text-slate-700 outline-none"
                                    />
                                    <span className="text-xs text-slate-500">至</span>
                                    <input
                                        type="date"
                                        value={reconEndDate}
                                        onChange={(e) => setReconEndDate(e.target.value)}
                                        className="bg-transparent text-sm text-slate-700 outline-none"
                                    />
                                </div>
                                <select
                                    value={reconPaymentMethod}
                                    onChange={(e) => setReconPaymentMethod(e.target.value)}
                                    className="bg-slate-50 border border-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="一般信用卡">一般信用卡</option>
                                    <option value="掃碼-全支付">掃碼-全支付</option>
                                    <option value="掃碼-街口支付">掃碼-街口支付</option>
                                    <option value="掃碼-LINE Pay">掃碼-LINE Pay</option>
                                </select>
                                <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg shadow-sm font-medium cursor-pointer hover:bg-blue-700 transition-colors">
                                    <input type="file" accept=".xlsx,.csv" className="hidden" onChange={handlePlatformUpload} />
                                    <CloudRain className="w-4 h-4" />
                                    <span>上傳平台數據</span>
                                </label>
                            </div>
                        </div>

                        {/* Print Header (Visible only when printing) */}
                        <div className="hidden print:block mb-6 border-b-2 border-slate-800 pb-4">
                            <h2 className="text-2xl font-black text-slate-900">對帳明細報表</h2>
                            <div className="flex justify-between items-end mt-2">
                                <p className="text-slate-600 text-sm">
                                    對帳區間：<span className="font-bold">{reconStartDate}</span> 至 <span className="font-bold">{reconEndDate}</span>
                                </p>
                                <p className="text-slate-400 text-xs">列印日期：{new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}</p>
                            </div>
                        </div>

                        {!platformData.length ? (
                            <div className="py-20 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                                <div className="p-4 bg-white rounded-full shadow-sm mb-4">
                                    <CreditCard className="w-10 h-10 text-slate-300" />
                                </div>
                                <h4 className="text-slate-600 font-medium mb-1">尚未上傳平台數據</h4>
                                <p className="text-slate-400 text-sm mb-6">請上傳藍新金流或其他平台的交易報表進行自動比對</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto border border-slate-200 rounded-xl">
                                <table className="w-full text-sm text-left border-collapse">
                                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-xs">
                                        <tr>
                                            <th className="px-4 py-3 border-r border-slate-200 bg-slate-100/50" colSpan={4}>系統發票紀錄 (左)</th>
                                            <th className="px-4 py-3 text-center border-r border-slate-200 w-24">對帳狀態</th>
                                            <th className="px-4 py-3 bg-slate-100/50" colSpan={3}>平台交易數據 (右)</th>
                                        </tr>
                                        <tr className="bg-slate-50/80 border-b border-slate-200">
                                            <th className="px-4 py-2 font-medium">交易時間</th>
                                            <th className="px-4 py-2 font-medium">發票號碼</th>
                                            <th className="px-4 py-2 font-medium text-right">金額</th>
                                            <th className="px-4 py-2 font-medium border-r border-slate-200">備註</th>
                                            <th className="px-4 py-2 text-center border-r border-slate-200">-</th>
                                            <th className="px-4 py-2 font-medium">交易時間</th>
                                            <th className="px-4 py-2 font-medium">平台序號</th>
                                            <th className="px-4 py-2 font-medium text-right">金額</th>
                                            <th className="px-4 py-2 text-center w-10">-</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {reconciliationMatches.map((match, idx) => {
                                            const isMatched = match.status === 'matched';
                                            const sys = match.system;
                                            const plat = match.platform;

                                            return (
                                                <tr key={idx} className={`hover:bg-slate-50/80 transition-colors ${!isMatched ? 'bg-red-50/30' : ''}`}>
                                                    {/* System Info */}
                                                    <td className={`px-4 py-3 text-xs ${(!sys || sys.isSalesReturn) ? 'text-red-500 font-bold' : 'text-slate-500'}`}>
                                                        {sys ? formatDateInTaipei(sys.date) : '缺失記錄'}
                                                    </td>
                                                    <td className={`px-4 py-3 font-mono ${(!sys || sys.isSalesReturn) ? 'text-red-500 font-bold' : 'text-slate-700'}`}>
                                                        {sys?.invoiceNumber || '無發票'}
                                                    </td>
                                                    <td className={`px-4 py-3 text-right font-mono font-medium ${(!sys || sys.isSalesReturn) ? 'text-red-500 font-bold' : 'text-slate-700'}`}>
                                                        {sys ? `$${sys.amount.toLocaleString()}` : '-'}
                                                    </td>
                                                    <td className={`px-4 py-3 border-r border-slate-200 text-xs ${sys?.isSalesReturn ? 'text-red-500 font-bold' : 'text-slate-400'}`}>
                                                        {sys?.isSalesReturn ? '銷退' : ''}
                                                    </td>

                                                    {/* Status Icon */}
                                                    <td className="px-4 py-3 text-center border-r border-slate-200">
                                                        {isMatched ? (
                                                            <div className="flex flex-col items-center">
                                                                <CheckCircle className="w-5 h-5 text-green-500" />
                                                                <span className="text-[10px] text-green-600 font-bold mt-1">已對齊</span>
                                                            </div>
                                                        ) : (
                                                            <div className="flex flex-col items-center">
                                                                <AlertTriangle className="w-5 h-5 text-red-500" />
                                                                <span className="text-[10px] text-red-600 font-bold mt-1">未匹配</span>
                                                            </div>
                                                        )}
                                                    </td>

                                                    {/* Platform Info */}
                                                    <td className={`px-4 py-3 text-xs ${!plat ? 'text-red-500 font-bold' : 'text-slate-500'}`}>
                                                        {plat ? formatDateInTaipei(plat.date) : '缺失記錄'}
                                                    </td>
                                                    <td className={`px-4 py-3 font-mono truncate max-w-[120px] ${!plat ? 'text-red-500 font-bold' : 'text-slate-600'}`} title={plat?.txId}>
                                                        {plat?.txId || '-'}
                                                    </td>
                                                    <td className={`px-4 py-3 text-right font-mono font-medium ${!plat ? 'text-red-500 font-bold' : 'text-slate-700'}`}>
                                                        {plat ? `$${plat.amount.toLocaleString()}` : '-'}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        {plat && (
                                                            <button
                                                                onClick={() => setInspectedRow(plat.raw)}
                                                                className="p-1 hover:bg-slate-200 rounded-md transition-colors text-slate-400 hover:text-blue-600"
                                                                title="查看原始數據"
                                                            >
                                                                <Info className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {platformData.length > 0 && (
                            <div className="mt-6 flex items-center justify-between no-print">
                                <button
                                    onClick={() => window.print()}
                                    className="flex items-center gap-2 px-6 py-2 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-700 transition-all shadow-lg active:scale-95"
                                >
                                    <Printer className="w-4 h-4" />
                                    <span>列印對帳狀態</span>
                                </button>

                                <button
                                    onClick={() => {
                                        setPlatformData([]);
                                        setIsMatching(false);
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-red-500 font-medium transition-colors text-sm"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    <span>清除目前比對資料</span>
                                </button>
                            </div>
                        )}

                        {/* Raw Data Inspector Modal */}
                        {inspectedRow && (
                            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
                                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                            <Info className="w-5 h-5 text-blue-500" />
                                            原始數據檢查器 (Platform Row Data)
                                        </h3>
                                        <button
                                            onClick={() => setInspectedRow(null)}
                                            className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                                        >
                                            <X className="w-5 h-5 text-slate-500" />
                                        </button>
                                    </div>
                                    <div className="p-6 overflow-y-auto">
                                        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                                            {Object.entries(inspectedRow).map(([key, val]) => (
                                                <div key={key} className="border-b border-slate-50 pb-2">
                                                    <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">{key}</span>
                                                    <span className="text-sm text-slate-700 font-mono break-all">{String(val)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                                        <button
                                            onClick={() => setInspectedRow(null)}
                                            className="px-6 py-2 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-700 transition-colors shadow-lg"
                                        >
                                            關閉
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Growth Tab */}
            {
                activeTab === 'growth' && (
                    <div className="space-y-6 animate-in fade-in duration-500">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800">營收成長分析 (MoM / YoY)</h3>
                                    <p className="text-sm text-slate-500">比較當前月份與上月、去年同期的營收變化</p>
                                </div>
                                <div className="flex items-center gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                                    <span className="text-sm font-semibold text-slate-700">2026 年度目標營業額:</span>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                                        <input
                                            type="number"
                                            value={target2026}
                                            onChange={(e) => setTarget2026(Math.max(0, parseInt(e.target.value) || 0))}
                                            className="pl-6 pr-3 py-1.5 w-32 md:w-40 border border-slate-300 rounded-lg text-right font-mono text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                    </div>
                                    <span className="text-xs text-slate-500 hidden md:inline">(依 2025 比例自動分配)</span>
                                </div>
                            </div>

                            {/* Pivot Table Style Growth Report */}
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                                        <tr>
                                            <th className="px-4 py-3">月份</th>
                                            <th className="px-4 py-3 text-right">2024年</th>
                                            <th className="px-4 py-3 text-right">2025年</th>
                                            <th className="px-4 py-3 text-right bg-blue-50/50 text-blue-800 border-l border-blue-100">2026 目標</th>
                                            <th className="px-4 py-3 text-right">2026年</th>
                                            <th className="px-4 py-3 text-right">YoY (26 vs 25)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {yearPivotData.map((row) => (
                                            <tr key={row.month} className="hover:bg-slate-50/50">
                                                <td className="px-4 py-3 font-medium text-slate-700">{row.month}月</td>
                                                <td className="px-4 py-3 text-right text-slate-600">
                                                    {row['2024'] ? `$${new Intl.NumberFormat('en-US').format(row['2024'])}` : '-'}
                                                </td>
                                                <td className="px-4 py-3 text-right text-slate-600">
                                                    {row['2025'] ? `$${new Intl.NumberFormat('en-US').format(row['2025'])}` : '-'}
                                                </td>
                                                <td className="px-4 py-3 text-right font-mono text-blue-600 bg-blue-50/30 border-l border-blue-100">
                                                    ${new Intl.NumberFormat('en-US').format(Math.round(row.target2026))}
                                                </td>
                                                <td className="px-4 py-3 text-right font-bold text-slate-800">
                                                    {row['2026'] ? `$${new Intl.NumberFormat('en-US').format(row['2026'])}` : '-'}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    {row.yoy === null ? '-' : (
                                                        <span className={`px-2 py-1 rounded text-xs font-bold ${row.yoy > 0 ? 'bg-green-100 text-green-700' :
                                                            row.yoy < 0 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'
                                                            }`}>
                                                            {row.yoy > 0 ? '+' : ''}{row.yoy.toFixed(1)}%
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-200">
                                        <tr>
                                            <td className="px-4 py-3 text-slate-800">年度總計</td>
                                            <td className="px-4 py-3 text-right text-slate-800">
                                                ${new Intl.NumberFormat('en-US').format(yearPivotData.reduce((sum, r) => sum + (r['2024'] || 0), 0))}
                                            </td>
                                            <td className="px-4 py-3 text-right text-slate-800">
                                                ${new Intl.NumberFormat('en-US').format(yearPivotData.reduce((sum, r) => sum + (r['2025'] || 0), 0))}
                                            </td>
                                            <td className="px-4 py-3 text-right text-blue-800 bg-blue-50/50 border-l border-blue-100">
                                                ${new Intl.NumberFormat('en-US').format(yearPivotData.reduce((sum, r) => sum + (r.target2026 || 0), 0))}
                                            </td>
                                            <td className="px-4 py-3 text-right text-slate-900 border-l border-r border-slate-200 bg-slate-200/50">
                                                ${new Intl.NumberFormat('en-US').format(yearPivotData.reduce((sum, r) => sum + (r['2026'] || 0), 0))}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                {(() => {
                                                    const total2025 = yearPivotData.reduce((sum, r) => sum + (r['2025'] || 0), 0);
                                                    const total2026 = yearPivotData.reduce((sum, r) => sum + (r['2026'] || 0), 0);
                                                    if (total2025 === 0) return '-';
                                                    const yoy = ((total2026 - total2025) / total2025) * 100;
                                                    return (
                                                        <span className={`px-2 py-1 rounded text-xs font-bold ${yoy > 0 ? 'bg-green-100 text-green-800' :
                                                            yoy < 0 ? 'bg-red-100 text-red-800' : 'bg-slate-200 text-slate-700'
                                                            }`}>
                                                            {yoy > 0 ? '+' : ''}{yoy.toFixed(1)}%
                                                        </span>
                                                    );
                                                })()}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Invoice Tab */}
            {
                activeTab === 'invoice' && (
                    <div className="space-y-6 animate-in fade-in duration-500">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                            {/* Header & Sub-tabs */}
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800">
                                        {invoiceSubTab === 'list' ? '發票交易明細' : '異常偵測 (斷號分析)'}
                                    </h3>
                                    <p className="text-sm text-slate-500">
                                        {invoiceSubTab === 'list'
                                            ? '可透過日期區間與支付方式篩選特定交易'
                                            : '自動檢測發票號碼連續性 (忽略支付方式篩選)'}
                                    </p>
                                </div>

                                <div className="flex bg-slate-100 p-1 rounded-lg self-start md:self-auto">
                                    <button
                                        onClick={() => setInvoiceSubTab('list')}
                                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${invoiceSubTab === 'list'
                                            ? 'bg-white text-blue-600 shadow-sm'
                                            : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        明細列表
                                    </button>
                                    <button
                                        onClick={() => setInvoiceSubTab('anomaly')}
                                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${invoiceSubTab === 'anomaly'
                                            ? 'bg-white text-red-600 shadow-sm'
                                            : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        異常偵測
                                    </button>
                                </div>
                            </div>

                            {/* Filters Toolbar */}
                            <div className="flex flex-wrap items-center gap-3 mb-6 p-4 bg-slate-50 rounded-lg">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold text-slate-500 uppercase">日期範圍</span>
                                    <input
                                        type="date"
                                        value={invoiceStartDate}
                                        onChange={(e) => setInvoiceStartDate(e.target.value)}
                                        className="px-2 py-1 border border-slate-200 rounded text-sm outline-none focus:border-blue-500"
                                    />
                                    <span className="text-slate-400">~</span>
                                    <input
                                        type="date"
                                        value={invoiceEndDate}
                                        onChange={(e) => setInvoiceEndDate(e.target.value)}
                                        className="px-2 py-1 border border-slate-200 rounded text-sm outline-none focus:border-blue-500"
                                    />
                                </div>

                                {invoiceSubTab === 'list' && (
                                    <div className="flex items-center gap-2 ml-auto md:ml-0">
                                        <span className="text-xs font-semibold text-slate-500 uppercase">支付方式</span>
                                        <select
                                            value={invoicePaymentFilter}
                                            onChange={(e) => setInvoicePaymentFilter(e.target.value)}
                                            className="px-2 py-1 border border-slate-200 rounded text-sm outline-none focus:border-blue-500 min-w-[120px]"
                                        >
                                            <option value="All">全部</option>
                                            {paymentMethodOptions.map(p => (
                                                <option key={p} value={p}>{p}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {(invoiceStartDate || invoiceEndDate || invoicePaymentFilter !== 'All') && (
                                    <button
                                        onClick={() => {
                                            setInvoiceStartDate('');
                                            setInvoiceEndDate('');
                                            setInvoicePaymentFilter('All');
                                        }}
                                        className="ml-auto text-xs text-blue-600 hover:text-blue-800 underline px-2"
                                    >
                                        清除篩選
                                    </button>
                                )}
                            </div>

                            {/* Content Area */}
                            {invoiceSubTab === 'list' ? (
                                <div className="space-y-4">
                                    <div className="text-right text-xs text-slate-500">
                                        共 {invoiceTabData.length} 筆資料
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                                                <tr>
                                                    <th className="px-4 py-3">訂單編號</th>
                                                    <th className="px-4 py-3">發票號碼</th>
                                                    <th className="px-4 py-3">交易時間</th>
                                                    <th className="px-4 py-3 text-right">發票金額</th>
                                                    <th className="px-4 py-3">支付方式</th>
                                                    <th className="px-4 py-3">備註</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {invoiceTabData.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={6} className="p-8 text-center text-slate-500">沒有符合條件的發票資料</td>
                                                    </tr>
                                                ) : (
                                                    <InvoiceTablePagination data={invoiceTabData} refundSet={refundSet} />
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ) : (
                                // Anomaly Tab Content
                                <div className="space-y-4">
                                    {invoiceAnomalyData.length === 0 ? (
                                        <div className="p-12 text-center text-slate-500 flex flex-col items-center">
                                            <CheckCircle className="w-12 h-12 text-green-500 mb-4" />
                                            <p className="text-lg">目前日期範圍內未發現異常斷號</p>
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm text-left">
                                                <thead className="bg-red-50 text-red-800 border-b border-red-100">
                                                    <tr>
                                                        <th className="p-4">年份-月份</th>
                                                        <th className="p-4">異常類型</th>
                                                        <th className="p-4">異常描述</th>
                                                        <th className="p-4">涉及號碼區間</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {invoiceAnomalyData.map((issue, idx) => (
                                                        <tr key={idx} className="hover:bg-red-50/30">
                                                            <td className="p-4 font-medium">{issue.ym}</td>
                                                            <td className="p-4">
                                                                <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold">{issue.type}</span>
                                                            </td>
                                                            <td className="p-4 text-slate-700">{issue.desc}</td>
                                                            <td className="p-4 font-mono text-xs text-slate-500">{issue.invoices.join(', ')}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )
            }

            {/* 2026 Ops Tab */}
            {
                activeTab === 'ops2026' && (
                    <div className="space-y-6 animate-in fade-in duration-500">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-bold text-slate-800">2026年 每日營收報表</h3>
                                <div className="flex items-center gap-2">
                                    <select
                                        className="bg-white border border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg shadow-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={ops2026Month}
                                        onChange={(e) => setOps2026Month(parseInt(e.target.value))}
                                    >
                                        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                            <option key={m} value={m}>{m} 月</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* KPI Metrics Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4 mb-8">
                                {/* Card 1: Monthly Target */}
                                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="text-sm font-semibold text-blue-700">業務目標 ({ops2026Month}月)</h4>
                                        <TrendingUp className="w-4 h-4 text-blue-500" />
                                    </div>
                                    <div className="text-2xl font-bold text-blue-900">
                                        ${new Intl.NumberFormat('en-US').format(Math.round(ops2026KPI.target))}
                                    </div>
                                    <div className="text-xs text-blue-600 mt-1">
                                        依年度目標佔比分配
                                    </div>
                                </div>

                                {/* Card 2: Daily Benchmark */}
                                <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="text-sm font-semibold text-purple-700">每日基準業績</h4>
                                        <Calendar className="w-4 h-4 text-purple-500" />
                                    </div>
                                    <div className="text-2xl font-bold text-purple-900">
                                        ${new Intl.NumberFormat('en-US').format(Math.round(ops2026KPI.benchmark))}
                                    </div>
                                    <div className="text-xs text-purple-600 mt-1">
                                        {ops2026KPI.workingDays} 個工作天 (排除週一)
                                    </div>
                                </div>

                                {/* Card 3: Actual Revenue */}
                                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="text-sm font-semibold text-emerald-700">本月實際業績</h4>
                                        <DollarSign className="w-4 h-4 text-emerald-500" />
                                    </div>
                                    <div className="text-2xl font-bold text-emerald-900">
                                        ${new Intl.NumberFormat('en-US').format(Math.round(ops2026KPI.actual))}
                                    </div>
                                    <div className="text-xs text-emerald-600 mt-1">
                                        {ops2026Month}月 營收累計
                                    </div>
                                </div>

                                {/* Card 4: Achievement Rate */}
                                <div className={`p-4 rounded-xl border ${ops2026KPI.rate >= 100 ? 'bg-orange-50 border-orange-100' : 'bg-slate-50 border-slate-200'
                                    }`}>
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className={`text-sm font-semibold ${ops2026KPI.rate >= 100 ? 'text-orange-700' : 'text-slate-600'
                                            }`}>達成率</h4>
                                        <CheckCircle className={`w-4 h-4 ${ops2026KPI.rate >= 100 ? 'text-orange-500' : 'text-slate-400'
                                            }`} />
                                    </div>
                                    <div className={`text-2xl font-bold ${ops2026KPI.rate >= 100 ? 'text-orange-800' : 'text-slate-800'
                                        }`}>
                                        {ops2026KPI.rate.toFixed(1)}%
                                    </div>
                                    <div className={`text-xs mt-1 ${ops2026KPI.rate >= 100 ? 'text-orange-600' : 'text-slate-500'
                                        }`}>
                                        {ops2026KPI.rate >= 100 ? '已達標' : `還差 ${(100 - ops2026KPI.rate).toFixed(1)}%`}
                                    </div>
                                </div>

                                {/* Card 5: Monthly Visitors */}
                                <div className="bg-pink-50 p-4 rounded-xl border border-pink-100">
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="text-sm font-semibold text-pink-700">當月體驗人次</h4>
                                        <Users className="w-4 h-4 text-pink-500" />
                                    </div>
                                    <div className="text-2xl font-bold text-pink-900">
                                        {new Intl.NumberFormat('en-US').format(ops2026KPI.totalVisitors)}
                                    </div>
                                    <div className="text-xs text-pink-600 mt-1">
                                        人
                                    </div>
                                </div>

                                {/* Card 6: ARPU */}
                                <div className="bg-cyan-50 p-4 rounded-xl border border-cyan-100">
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="text-sm font-semibold text-cyan-700">人均消費 (ARPU)</h4>
                                        <TrendingUp className="w-4 h-4 text-cyan-500" />
                                    </div>
                                    <div className="text-2xl font-bold text-cyan-900">
                                        ${new Intl.NumberFormat('en-US').format(Math.round(ops2026KPI.arpu))}
                                    </div>
                                    <div className="text-xs text-cyan-600 mt-1">
                                        平均每人貢獻
                                    </div>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                                        <tr>
                                            <th className="px-4 py-3">當月日期</th>
                                            <th className="px-4 py-3">星期</th>
                                            <th className="px-4 py-3">天氣 / 氣溫</th>
                                            <th className="px-4 py-3 text-right">當日收入</th>
                                            <th className="px-4 py-3 text-right">體驗人次</th>
                                            <th className="px-4 py-3">備註</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {ops2026Data.map((row) => (
                                            <tr key={row.day} className={`hover:bg-slate-50/50 ${row.isWeekend ? 'bg-orange-50/30' : ''}`}>
                                                <td className="px-4 py-3 font-medium text-slate-700">{row.day} 日</td>
                                                <td className={`px-4 py-3 ${row.isWeekend ? 'text-red-500 font-bold' : 'text-slate-500'}`}>
                                                    {row.weekDay === '日' ? '星期日' :
                                                        row.weekDay === '六' ? '星期六' :
                                                            `星期${row.weekDay}`}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {row.weather ? (
                                                        <div className="flex items-center gap-2 text-slate-600 text-sm">
                                                            {/* Simple Weather Icon Logic based on WMO code */}
                                                            {row.weather.code === 0 || row.weather.code === 1 ? <Sun className="w-4 h-4 text-orange-500" /> :
                                                                row.weather.code === 2 || row.weather.code === 3 ? <Cloud className="w-4 h-4 text-slate-400" /> :
                                                                    row.weather.code >= 51 && row.weather.code <= 67 ? <CloudRain className="w-4 h-4 text-blue-400" /> :
                                                                        row.weather.code >= 71 && row.weather.code <= 77 ? <CloudSnow className="w-4 h-4 text-indigo-300" /> :
                                                                            row.weather.code >= 95 ? <CloudLightning className="w-4 h-4 text-purple-500" /> :
                                                                                <Cloud className="w-4 h-4 text-slate-400" />
                                                            }
                                                            <span className="font-mono text-xs">
                                                                {row.weather.min}°C - {row.weather.max}°C
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-slate-300">-</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right text-slate-800 font-mono">
                                                    ${new Intl.NumberFormat('en-US').format(row.revenue)}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <input
                                                        type="number"
                                                        value={row.visitorCount || ''}
                                                        onChange={(e) => {
                                                            const val = parseInt(e.target.value) || 0;
                                                            setDailyVisitorStats(prev => ({ ...prev, [row.dateStr]: val }));
                                                        }}
                                                        onBlur={(e) => {
                                                            const val = parseInt(e.target.value) || 0;
                                                            updateDailyVisitorCount(row.dateStr, val);
                                                        }}
                                                        placeholder="0"
                                                        className="w-20 text-right bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none text-sm text-slate-700 transition-colors placeholder:text-slate-200"
                                                    />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <input
                                                        type="text"
                                                        value={row.remark}
                                                        onChange={(e) => setRemarks(prev => ({ ...prev, [row.dateStr]: e.target.value }))}
                                                        placeholder="..."
                                                        className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none text-sm text-slate-700 transition-colors placeholder:text-slate-200"
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Visitor Statistics Tab */}
            {
                activeTab === 'visitor_stats' && (
                    <div className="space-y-6 animate-in fade-in duration-500">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                                <Users className="w-5 h-5 text-blue-600" />
                                兒童新樂園入園人次統計
                            </h3>

                            <div className="overflow-x-auto border rounded-lg">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                                        <tr>
                                            <th className="px-6 py-3 text-center w-24">月份</th>
                                            <th className="px-6 py-3 text-right">2024年 入園人次</th>
                                            <th className="px-6 py-3 text-right">2025年 入園人次</th>
                                            <th className="px-6 py-3 text-right">2026年 入園人次</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => {
                                            const v2024 = visitorData[2024]?.[m] || 0;
                                            const v2025 = visitorData[2025]?.[m] || 0;
                                            const v2026 = visitorData[2026]?.[m] || 0;

                                            return (
                                                <tr key={m} className="hover:bg-slate-50">
                                                    <td className="px-6 py-4 text-center font-medium text-slate-700">{m}月</td>
                                                    <td className="px-6 py-4 text-right font-mono text-slate-600">
                                                        {v2024 > 0 ? new Intl.NumberFormat('en-US').format(v2024) : '-'}
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-mono text-blue-600 font-medium">
                                                        {v2025 > 0 ? new Intl.NumberFormat('en-US').format(v2025) : '-'}
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-mono text-slate-400">
                                                        {v2026 > 0 ? new Intl.NumberFormat('en-US').format(v2026) : '-'}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {/* Total Row */}
                                        <tr className="bg-slate-50 font-bold border-t-2 border-slate-200">
                                            <td className="px-6 py-4 text-center text-slate-800">總計</td>
                                            <td className="px-6 py-4 text-right font-mono text-slate-800">
                                                {new Intl.NumberFormat('en-US').format(
                                                    Object.values(visitorData[2024] || {}).reduce((a, b) => a + b, 0)
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right font-mono text-blue-700">
                                                {new Intl.NumberFormat('en-US').format(
                                                    Object.values(visitorData[2025] || {}).reduce((a, b) => a + b, 0)
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right font-mono text-slate-500">
                                                {new Intl.NumberFormat('en-US').format(
                                                    Object.values(visitorData[2026] || {}).reduce((a, b) => a + b, 0)
                                                )}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            <div className="mt-4 text-xs text-slate-400 text-right">
                                資料來源：兒童新樂園入園人次統計表 (PDF)
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    )
}

function InvoiceTablePagination({ data, refundSet }: { data: any[], refundSet: Set<string> }) {
    const [page, setPage] = useState(1);
    const pageSize = 50;
    const totalPages = Math.ceil(data.length / pageSize);

    // Reset page when data changes
    useEffect(() => {
        setPage(1);
    }, [data.length]);

    const currentData = useMemo(() => {
        // Sort by Invoice Number if available, else Date
        const sorted = [...data].sort((a, b) => {
            // Put missing invoices at the top? Or just standard sort?
            // User requested standard sort usually, but let's stick to Date DESC as per main logic,
            // OR Invoice Number desc.
            // The main logic sorts by Date DESC. 
            // The local currentData here sorts by Invoice Number.
            // Let's keep Invoice Number sort for consistency with "list" view grouping
            const numA = a.invoiceNumber || '';
            const numB = b.invoiceNumber || '';
            if (numA === numB) return new Date(b.date).getTime() - new Date(a.date).getTime();
            return numA.localeCompare(numB);
        });
        const start = (page - 1) * pageSize;
        return sorted.slice(start, start + pageSize);
    }, [data, page]);

    return (
        <>
            {/* Need to update header in parent or here? The parent defines the <thead>. 
                We should technically update the parent component's <thead> to match columns.
                But `InvoiceTablePagination` only renders <tr>. 
                Wait, I need to update the <thead> in `DashboardView` as well!
                It was at lines 924-929.
            */}
            {currentData.map((t, idx) => {
                const hasInvoice = t.invoiceNumber && t.invoiceNumber.trim() !== '' && t.invoiceNumber !== '-';
                const isRefund = hasInvoice && refundSet.has(t.invoiceNumber);
                const invoiceStyle = hasInvoice
                    ? 'font-mono text-slate-700 font-medium group-hover:text-blue-600'
                    : 'text-red-500 font-bold'; // Red for missing invoice

                let remark = '';
                if (!hasInvoice) remark = '無發票記錄';
                else if (isRefund) remark = '銷退';

                return (
                    <tr key={`${t.orderId}-${idx}`} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-4 py-3 font-mono text-slate-500 text-xs">
                            {t.id}
                        </td>
                        <td className={`px-4 py-3 ${invoiceStyle} transition-colors`}>
                            {hasInvoice ? t.invoiceNumber : '無發票記錄'}
                        </td>
                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                            {formatDateInTaipei(t.date)}
                        </td>
                        <td className={`px-4 py-3 text-right font-mono font-medium ${t.amount < 0 ? 'text-red-600' : 'text-slate-700'}`}>
                            ${t.amount.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                            <span className="bg-slate-100 px-2 py-1 rounded text-xs">{t.paymentMethod || '其他'}</span>
                        </td>
                        <td className={`px-4 py-3 text-xs font-bold ${remark === '無發票記錄' ? 'text-red-500' : 'text-slate-500'}`}>
                            {remark}
                        </td>
                    </tr>
                );
            })}
            {totalPages > 1 && (
                <tr>
                    <td colSpan={6} className="p-4 border-t border-slate-100 bg-slate-50">
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-slate-500">
                                顯示 {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, data.length)} 筆，共 {data.length} 筆
                            </span>
                            <div className="flex space-x-2">
                                <button
                                    onClick={() => setPage(Math.max(1, page - 1))}
                                    disabled={page === 1}
                                    className="px-3 py-1 bg-white border border-slate-300 rounded text-xs disabled:opacity-50 hover:bg-slate-50"
                                >
                                    上一頁
                                </button>
                                <span className="text-xs text-slate-600 self-center">
                                    {page} / {totalPages}
                                </span>
                                <button
                                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                                    disabled={page === totalPages}
                                    className="px-3 py-1 bg-white border border-slate-300 rounded text-xs disabled:opacity-50 hover:bg-slate-50"
                                >
                                    下一頁
                                </button>
                            </div>
                        </div>
                    </td>
                </tr>
            )}
        </>
    );
}

function UploadButton() {
    const [uploading, setUploading] = useState(false);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.[0]) return;

        const file = e.target.files[0];
        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (data.success) {
                alert(data.message);
                window.location.reload(); // Reload to fetch new data
            } else {
                alert('上傳失敗: ' + data.error);
            }
        } catch (err) {
            console.error(err);
            alert('上傳發生錯誤');
        } finally {
            setUploading(false);
            // Clear input
            e.target.value = '';
        }
    };

    return (
        <label className={`
            flex items-center gap-2 px-4 py-2 rounded-lg shadow-sm font-medium cursor-pointer transition-colors
            ${uploading ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}
        `}>
            <input
                type="file"
                accept=".xlsx"
                className="hidden"
                onChange={handleUpload}
                disabled={uploading}
            />
            {uploading ? (
                <span>處理中...</span>
            ) : (
                <>
                    <CloudRain className="w-4 h-4" />
                    <span>上傳報表</span>
                </>
            )}
        </label>
    );
}

function BarChart2(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <line x1="18" x2="18" y1="20" y2="10" />
            <line x1="12" x2="12" y1="20" y2="4" />
            <line x1="6" x2="6" y1="20" y2="14" />
        </svg>
    )
}

function Card({ title, value, sub, icon, trend }: any) {
    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between h-full relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">{title}</h4>
                    <h2 className="text-2xl font-bold text-slate-800 mt-1">{value}</h2>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg group-hover:scale-110 transition-transform">
                    {icon}
                </div>
            </div>
            {sub && (
                <div className="text-xs text-slate-400 mt-auto pt-2 border-t border-slate-50">
                    {sub}
                </div>
            )}
        </div>
    );
}
