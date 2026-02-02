"use client";

import React, { useMemo } from 'react';
import { COMPETITOR_DATA, FacilityBenchmark } from '@/lib/competitor-data';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    ScatterChart, Scatter, ZAxis, ReferenceLine, Cell
} from 'recharts';
import { DollarSign, Clock, Target, TrendingUp, Info } from 'lucide-react';

const CATEGORY_LABELS: Record<string, string> = {
    'park_basic': '園區自營 (Level 1)',
    'outsourced_ride': '委外遊樂機 (Level 2)',
    'carnival_game': '嘉年華遊戲 (Level 3)',
    'indoor_package': '室內套票 (Level 4)',
    'other': '其他'
};

const CATEGORY_COLORS: Record<string, string> = {
    'park_basic': '#3b82f6', // blue-500
    'outsourced_ride': '#f59e0b', // amber-500
    'carnival_game': '#ef4444', // red-500
    'indoor_package': '#8b5cf6', // violet-500
    'other': '#94a3b8' // slate-400
};

export function PricingStrategyView() {

    // 1. Calculate Statistics
    const stats = useMemo(() => {
        const data = COMPETITOR_DATA.filter(d => d.category !== 'other'); // Exclude free stuff for stats
        const total = data.length;
        const avgPrice = data.reduce((acc, curr) => acc + curr.price.base, 0) / total;

        // Target Benchmark: Outsourced Rides (Level 2)
        const outsourced = data.filter(d => d.category === 'outsourced_ride');
        const avgOutsourcedPrice = outsourced.reduce((acc, curr) => acc + curr.price.base, 0) / outsourced.length;

        // Carnival Ceiling
        const carnival = data.filter(d => d.category === 'carnival_game');
        const maxCarnivalPrice = Math.max(...carnival.map(d => d.price.base));

        return {
            avgPrice,
            avgOutsourcedPrice,
            maxCarnivalPrice,
            totalFacilities: total
        };
    }, []);

    // 2. Prepare Data for Scatter Plot (Price vs Duration)
    const scatterData = useMemo(() => {
        return COMPETITOR_DATA
            .filter(d => d.duration_min !== undefined)
            .map(d => ({
                name: d.name,
                price: d.price.base,
                duration: d.duration_min || 0,
                category: d.category,
                categoryLabel: CATEGORY_LABELS[d.category]
            }));
    }, []);

    // 3. Prepare Data for Category Comparison (Bar Chart)
    const categoryData = useMemo(() => {
        const cats = ['park_basic', 'outsourced_ride', 'carnival_game', 'indoor_package'];
        return cats.map(cat => {
            const facilities = COMPETITOR_DATA.filter(d => d.category === cat);
            const prices = facilities.map(d => d.price.base);
            const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
            const min = Math.min(...prices);
            const max = Math.max(...prices);

            return {
                name: CATEGORY_LABELS[cat].split(' ')[0], // Short name
                fullName: CATEGORY_LABELS[cat],
                avgPrice: Math.round(avg),
                minPrice: min,
                maxPrice: max,
                count: facilities.length,
                color: CATEGORY_COLORS[cat]
            };
        });

    }, []);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">

            {/* Header Section */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <Target className="w-64 h-64 text-white" />
                </div>
                <div className="relative z-10 max-w-2xl">
                    <h2 className="text-3xl font-bold mb-4 flex items-center gap-3">
                        <DollarSign className="w-8 h-8 text-emerald-400" />
                        定價策略分析中心
                    </h2>
                    <p className="text-slate-300 text-lg leading-relaxed">
                        基於兒童新樂園全區設施的價格錨定分析。透過此儀表板，我們可以定位 LEIMEN VR 體驗在園區生態中的價值區間，並制定最具競爭力的定價策略。
                    </p>
                </div>
            </div>

            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="園區平均單價"
                    value={`$${Math.round(stats.avgPrice)}`}
                    sub="所有付費設施平均"
                    icon={<DollarSign className="w-5 h-5 text-blue-500" />}
                    trend="市場基準"
                />
                <StatCard
                    title="競品錨點 (Level 2)"
                    value={`$${Math.round(stats.avgOutsourcedPrice)}`}
                    sub="委外遊樂機平均價格"
                    icon={<Target className="w-5 h-5 text-amber-500" />}
                    trend="直接競爭"
                    highlight
                />
                <StatCard
                    title="價格天花板 (Level 3)"
                    value={`$${stats.maxCarnivalPrice}`}
                    sub="嘉年華遊戲最高單價"
                    icon={<TrendingUp className="w-5 h-5 text-red-500" />}
                    trend="高消費潛力"
                />
                <StatCard
                    title="設施總數"
                    value={`${stats.totalFacilities}`}
                    sub="納入分析的競品數量"
                    icon={<Info className="w-5 h-5 text-slate-500" />}
                    trend="覆蓋率 100%"
                />
            </div>

            {/* Main Analysis Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* Chart 1: Price Distribution by Category */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">各類別價格區間分佈</h3>
                            <p className="text-sm text-slate-500">分析不同層級設施的定價策略範圍</p>
                        </div>
                    </div>
                    <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={categoryData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={true} stroke="#f1f5f9" />
                                <XAxis type="number" unit="元" />
                                <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
                                <Tooltip
                                    cursor={{ fill: 'transparent' }}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Legend />
                                <Bar dataKey="minPrice" stackId="a" fill="transparent" name="最低價" />
                                <Bar dataKey="avgPrice" stackId="a" fill="#8884d8" name="平均價">
                                    {
                                        categoryData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))
                                    }
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="mt-4 p-4 bg-slate-50 rounded-lg text-sm text-slate-600">
                        <p className="font-semibold mb-2">💡 分析洞察：</p>
                        <ul className="list-disc pl-4 space-y-1">
                            <li><strong>Level 1 (園區)</strong> 鎖定了 $20-$30 的心理地板價，是流量入口。</li>
                            <li><strong>Level 2 (委外)</strong> 均價落在 <strong>$80</strong>，這是 LEIMEN 最重要的定價參考線。若定價高於 $80，需強調「沉浸感」與「科技體驗」。</li>
                            <li><strong>Level 3 (嘉年華)</strong> 證明遊客願意為「獎勵與刺激」支付 <strong>$100-$300</strong> 的高溢價。</li>
                        </ul>
                    </div>
                </div>

                {/* Chart 2: Price vs Duration (Scatter) */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">CP值分析：價格 vs 體驗時長</h3>
                            <p className="text-sm text-slate-500">尋找市場中的「價值真空帶」</p>
                        </div>
                    </div>
                    <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" dataKey="duration" name="時長" unit="分" domain={[0, 15]} label={{ value: '體驗時長 (分鐘)', position: 'bottom', offset: 0 }} />
                                <YAxis type="number" dataKey="price" name="價格" unit="元" domain={[0, 350]} label={{ value: '價格 (TWD)', angle: -90, position: 'insideLeft' }} />
                                <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip />} />
                                <Legend />
                                <ReferenceLine y={100} stroke="#ef4444" strokeDasharray="3 3" label="高價門檻 $100" />
                                <ReferenceLine x={5} stroke="#3b82f6" strokeDasharray="3 3" label="5分鐘界線" />

                                {Object.keys(CATEGORY_COLORS).map(catKey => (
                                    <Scatter
                                        key={catKey}
                                        name={CATEGORY_LABELS[catKey].split(' ')[0]}
                                        data={scatterData.filter(d => d.category === catKey)}
                                        fill={CATEGORY_COLORS[catKey]}
                                        shape="circle"
                                    />
                                ))}
                            </ScatterChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="mt-4 p-4 bg-slate-50 rounded-lg text-sm text-slate-600">
                        <p className="font-semibold mb-2">💡 機會點分析：</p>
                        <p>
                            圖表中 <strong>左上角區塊 (短時長、高單價)</strong> 目前主要由嘉年華遊戲佔據。若 LEIMEN 能提供 <strong>5-10分鐘</strong> 的高品質體驗，且定價在 <strong>$100-$150</strong>，將填補「中高時長、中高價位」的市場空缺 (圖表中右上方真空區)。
                        </p>
                    </div>
                </div>

            </div>

            {/* Detailed Data Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800">全區設施價格明細表</h3>
                    <span className="text-xs text-slate-500 bg-white px-2 py-1 rounded border border-slate-200">共 {COMPETITOR_DATA.length} 筆資料</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-3">分類</th>
                                <th className="px-6 py-3">設施名稱</th>
                                <th className="px-6 py-3">營運商</th>
                                <th className="px-6 py-3">位置</th>
                                <th className="px-6 py-3 text-right">基礎價格</th>
                                <th className="px-6 py-3">計費詳情</th>
                                <th className="px-6 py-3">備註</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {COMPETITOR_DATA.map((item, idx) => (
                                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-3">
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                                            style={{
                                                backgroundColor: `${CATEGORY_COLORS[item.category]}20`,
                                                color: CATEGORY_COLORS[item.category]
                                            }}>
                                            {CATEGORY_LABELS[item.category].split(' ')[0]}
                                        </span>
                                    </td>
                                    <td className="px-6 py-3 font-medium text-slate-800">{item.name}</td>
                                    <td className="px-6 py-3 text-slate-600">{item.operator}</td>
                                    <td className="px-6 py-3 text-slate-500">{item.location}</td>
                                    <td className="px-6 py-3 text-right font-bold text-slate-700 font-mono">
                                        ${item.price.base}
                                    </td>
                                    <td className="px-6 py-3 text-slate-600">{item.price.details}</td>
                                    <td className="px-6 py-3 text-slate-400 text-xs max-w-xs truncate" title={item.note}>
                                        {item.note || '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, sub, icon, trend, highlight }: any) {
    return (
        <div className={`p-6 rounded-xl border shadow-sm flex flex-col justify-between h-full relative overflow-hidden group hover:shadow-md transition-shadow ${highlight ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-100'}`}>
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className={`text-sm font-medium ${highlight ? 'text-amber-800' : 'text-slate-500'}`}>{title}</h3>
                    <div className={`text-2xl font-bold mt-1 ${highlight ? 'text-amber-900' : 'text-slate-800'}`}>{value}</div>
                </div>
                <div className={`p-2 rounded-lg ${highlight ? 'bg-amber-100' : 'bg-slate-50'}`}>
                    {icon}
                </div>
            </div>
            <div className="flex items-center gap-2 mt-auto">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${highlight ? 'bg-amber-200 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>
                    {trend}
                </span>
                <span className={`text-xs ${highlight ? 'text-amber-700' : 'text-slate-400'}`}>{sub}</span>
            </div>
        </div>
    );
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-white p-3 border border-slate-200 shadow-lg rounded-lg text-sm">
                <p className="font-bold text-slate-800 mb-1">{data.name}</p>
                <div className="space-y-1">
                    <p className="text-slate-600">
                        <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ backgroundColor: CATEGORY_COLORS[data.category] }}></span>
                        {data.categoryLabel}
                    </p>
                    <p className="text-slate-600">價格: <span className="font-bold font-mono">${data.price}</span></p>
                    <p className="text-slate-600">時長: <span className="font-bold font-mono">{data.duration} 分鐘</span></p>
                    <p className="text-slate-500 text-xs mt-1">CP值: ${(data.price / (data.duration || 1)).toFixed(1)} / 分</p>
                </div>
            </div>
        );
    }
    return null;
};
