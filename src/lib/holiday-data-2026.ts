
export interface HolidayEvent {
    date: string; // YYYY-MM-DD
    name: string;
    type: 'holiday' | 'exam' | 'vacation';
}

// Strictly National Holidays and Days Off
export const PUBLIC_HOLIDAYS_2026: Record<string, string> = {
    '2026-01-01': '元旦',
    '2026-02-14': '春節假期',
    '2026-02-15': '春節假期',
    '2026-02-16': '除夕前一日',
    '2026-02-17': '除夕',
    '2026-02-18': '春節',
    '2026-02-19': '春節',
    '2026-02-20': '春節',
    '2026-02-21': '春節',
    '2026-02-22': '春節假期',
    '2026-02-27': '228和平紀念日補假',
    '2026-02-28': '228和平紀念日',
    '2026-03-01': '228連假',
    '2026-04-03': '兒童節補假',
    '2026-04-04': '兒童節/清明節',
    '2026-04-05': '清明節',
    '2026-04-06': '清明節補假',
    '2026-05-01': '勞動節',
    '2026-06-19': '端午節',
    '2026-06-20': '端午連假',
    '2026-06-21': '端午連假',
    '2026-09-25': '中秋節補假',
    '2026-09-26': '中秋連假',
    '2026-09-27': '中秋節',
    '2026-09-28': '孔子誕辰紀念日',
    '2026-10-09': '國慶日補假',
    '2026-10-10': '國慶日',
    '2026-10-11': '國慶連假',
    '2026-10-24': '光復節連假',
    '2026-10-25': '台灣光復節',
    '2026-10-26': '光復節補假',
    '2026-12-25': '行憲紀念日',
    '2026-12-26': '行憲連假',
    '2026-12-27': '行憲連假',
};

// Informative School Events/Vacations (Not necessarily days off)
export const SCHOOL_EVENTS_2026: Record<string, string> = {
    '2026-01-24': '寒假開始',
    '2026-01-12': '期末考週',
    '2026-01-13': '期末考週',
    '2026-01-14': '期末考週',
    '2026-01-15': '期末考週',
    '2026-01-16': '期末考週',
    '2026-04-23': '期中考',
    '2026-04-24': '期中考',
    '2026-06-04': '畢業考',
    '2026-06-05': '畢業考',
    '2026-06-23': '期末考',
    '2026-06-24': '期末考',
    '2026-07-01': '暑假開始',
    '2026-08-31': '暑假更趨',
};

export const HOLIDAY_DATA_2026: Record<string, string> = {
    ...PUBLIC_HOLIDAYS_2026,
    ...SCHOOL_EVENTS_2026,
};

// Helper for UI tooltips/remarks
export function getDailyRemark(dateStr: string): string {
    if (HOLIDAY_DATA_2026[dateStr]) return HOLIDAY_DATA_2026[dateStr];

    const d = new Date(dateStr);
    const month = d.getMonth() + 1;
    const date = d.getDate();

    // Winter Vacation: Jan 24 - Feb 22
    const isJan = month === 1 && date >= 24;
    const isFeb = month === 2 && date <= 22;
    if (isJan || isFeb) return '寒假';

    // Summer Vacation: Jul 1 - Aug 31
    const isJul = month === 7;
    const isAug = month === 8;
    if (isJul || isAug) return '暑假';

    return '';
}

// Helper for Chart Coloring (only true for actual days off)
export function isPublicHoliday(dateStr: string): boolean {
    return !!PUBLIC_HOLIDAYS_2026[dateStr];
}
