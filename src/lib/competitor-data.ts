export type PricingType = 'fixed' | 'tiered' | 'time_based' | 'complex';

export interface FacilityBenchmark {
    id: string;
    name: string;
    location: string;
    operator: string;
    category: 'park_basic' | 'outsourced_ride' | 'carnival_game' | 'indoor_package' | 'other';
    price: {
        base: number;
        mode: PricingType;
        details: string;
        currency: 'TWD';
    };
    duration_min?: number;
    restrictions?: string;
    note?: string;
}

export const COMPETITOR_DATA: FacilityBenchmark[] = [
    // --- Level 1: Park Basic (園區自營 1-13, K1, K2) ---
    {
        id: 'park_01',
        name: '海洋總動員',
        location: '1樓露天區',
        operator: '園區自營',
        category: 'park_basic',
        price: { base: 20, mode: 'fixed', details: '票價20元', currency: 'TWD' },
        duration_min: 2.5,
        note: '適用團購遊樂券及一日樂Fun券'
    },
    {
        id: 'park_02',
        name: '摩天輪',
        location: '3樓露天區',
        operator: '園區自營',
        category: 'park_basic',
        price: { base: 30, mode: 'fixed', details: '票價30元', currency: 'TWD' },
        duration_min: 9,
        note: '冷氣車廂, 適用團購遊樂券及一日樂Fun券'
    },
    {
        id: 'park_03',
        name: '銀河號',
        location: '3樓露天區',
        operator: '園區自營',
        category: 'park_basic',
        price: { base: 20, mode: 'fixed', details: '票價20元', currency: 'TWD' },
        duration_min: 3.5,
        note: '冷氣車廂, 適用團購遊樂券及一日樂Fun券'
    },
    {
        id: 'park_04',
        name: '飛天神奇號',
        location: '1樓露天區',
        operator: '園區自營',
        category: 'park_basic',
        price: { base: 20, mode: 'fixed', details: '票價20元', currency: 'TWD' },
        duration_min: 2.5,
        note: '適用團購遊樂券及一日樂Fun券'
    },
    {
        id: 'park_05',
        name: '宇宙迴旋',
        location: '3樓露天區',
        operator: '園區自營',
        category: 'park_basic',
        price: { base: 20, mode: 'fixed', details: '票價20元', currency: 'TWD' },
        duration_min: 2.5,
        note: '適用團購遊樂券及一日樂Fun券'
    },
    {
        id: 'park_06',
        name: '星空小飛碟',
        location: '3樓露天區',
        operator: '園區自營',
        category: 'park_basic',
        price: { base: 20, mode: 'fixed', details: '票價20元', currency: 'TWD' },
        duration_min: 2,
        note: '適用團購遊樂券及一日樂Fun券'
    },
    {
        id: 'park_07',
        name: '轉轉咖啡杯',
        location: '3樓頂棚區',
        operator: '園區自營',
        category: 'park_basic',
        price: { base: 20, mode: 'fixed', details: '票價20元', currency: 'TWD' },
        duration_min: 2.5,
        note: '適用團購遊樂券及一日樂Fun券'
    },
    {
        id: 'park_08',
        name: '巡弋飛椅',
        location: '3樓頂棚區',
        operator: '園區自營',
        category: 'park_basic',
        price: { base: 20, mode: 'fixed', details: '票價20元', currency: 'TWD' },
        duration_min: 2.5,
        note: '適用團購遊樂券及一日樂Fun券'
    },
    {
        id: 'park_09',
        name: '尋寶船',
        location: '1樓夢想海',
        operator: '園區自營',
        category: 'park_basic',
        price: { base: 30, mode: 'fixed', details: '票價30元', currency: 'TWD' },
        duration_min: 3.5,
        note: '適用團購遊樂券及一日樂Fun券'
    },
    {
        id: 'park_10',
        name: '魔法星際飛車',
        location: '3樓露天區',
        operator: '園區自營',
        category: 'park_basic',
        price: { base: 30, mode: 'fixed', details: '票價30元', currency: 'TWD' },
        duration_min: 2,
        note: '適用團購遊樂券及一日樂Fun券'
    },
    {
        id: 'park_11',
        name: '小飛龍',
        location: '3樓頂棚區',
        operator: '園區自營',
        category: 'park_basic',
        price: { base: 20, mode: 'fixed', details: '票價20元', currency: 'TWD' },
        duration_min: 2.5,
        note: '適用團購遊樂券及一日樂Fun券'
    },
    {
        id: 'park_12',
        name: '幸福碰碰車',
        location: '3樓頂棚區',
        operator: '園區自營',
        category: 'park_basic',
        price: { base: 30, mode: 'fixed', details: '票價30元', currency: 'TWD' },
        duration_min: 2.5,
        note: '適用團購遊樂券及一日樂Fun券'
    },
    {
        id: 'park_13',
        name: '叢林吼吼樹屋',
        location: '1樓露天區',
        operator: '園區自營',
        category: 'park_basic',
        price: { base: 30, mode: 'fixed', details: '票價30元', currency: 'TWD' },
        duration_min: 2,
        note: '適用團購遊樂券及一日樂Fun券'
    },
    {
        id: 'park_k1',
        name: '冰雪奇航',
        location: '1樓尋寶船旁',
        operator: '委外廠商',
        category: 'park_basic',
        price: { base: 30, mode: 'fixed', details: '票價30元', currency: 'TWD' },
        duration_min: 3.5,
    },
    {
        id: 'park_k2',
        name: '鋼鐵碰碰車',
        location: '3樓幸福碰碰車旁',
        operator: '委外廠商',
        category: 'park_basic',
        price: { base: 30, mode: 'fixed', details: '票價30元', currency: 'TWD' },
        duration_min: 3.5,
    },

    // --- Level 2: Outsourced Rides (委外遊樂機 - 鈊洲娛樂等) ---
    {
        id: 'outsourced_train',
        name: '滿天星小火車',
        location: '1樓園區大門進入右前方',
        operator: '其餘廠商',
        category: 'outsourced_ride',
        price: { base: 80, mode: 'tiered', details: '單人80元, 親子150元, 愛心40元', currency: 'TWD' },
        duration_min: 8,
        note: '約10-15分鐘一班'
    },
    {
        id: 'outsourced_a3',
        name: 'A3 小航海王',
        location: '1樓夢想海',
        operator: '鈊洲娛樂',
        category: 'outsourced_ride',
        price: { base: 50, mode: 'fixed', details: '票價50元', currency: 'TWD' },
        duration_min: 2,
    },
    {
        id: 'outsourced_a9',
        name: 'A9 歡樂碰碰船',
        location: '1樓夢想海',
        operator: '鈊洲娛樂',
        category: 'outsourced_ride',
        price: { base: 80, mode: 'fixed', details: '票價80元', currency: 'TWD' },
        duration_min: 3,
    },
    {
        id: 'outsourced_a1',
        name: 'A1 汽車教練場',
        location: '4樓觀景平台',
        operator: '鈊洲娛樂',
        category: 'outsourced_ride',
        price: { base: 80, mode: 'fixed', details: '票價80元', currency: 'TWD' },
        duration_min: 9,
        restrictions: '限80-130公分'
    },
    {
        id: 'outsourced_a2',
        name: 'A2 戰火金剛',
        location: '3樓小飛龍旁',
        operator: '鈊洲娛樂',
        category: 'outsourced_ride',
        price: { base: 80, mode: 'fixed', details: '票價80元', currency: 'TWD' },
        duration_min: 3,
        restrictions: '未滿110公分需成人陪同'
    },
    {
        id: 'outsourced_a8',
        name: 'A8 坦克大戰',
        location: '3樓摩天輪旁',
        operator: '鈊洲娛樂',
        category: 'outsourced_ride',
        price: { base: 80, mode: 'fixed', details: '票價80元', currency: 'TWD' },
        duration_min: 6,
    },
    {
        id: 'outsourced_a10',
        name: 'A10 迷你卡丁',
        location: '3樓巡弋飛椅旁',
        operator: '鈊洲娛樂',
        category: 'outsourced_ride',
        price: { base: 80, mode: 'fixed', details: '票價80元', currency: 'TWD' },
        duration_min: 3,
    },

    // --- Level 3: Carnival Games (嘉年華 - 雷克士) ---
    {
        id: 'carnival_basketball',
        name: '籃球 BASKETBALL',
        location: '3樓轉轉咖啡杯旁',
        operator: '雷克士嘉年華',
        category: 'carnival_game',
        price: { base: 100, mode: 'tiered', details: '1球100, 3球200, 6球300', currency: 'TWD' },
        note: '投進1球即贏得獎品'
    },
    {
        id: 'carnival_balloon',
        name: '射氣球 BALLOON POP',
        location: '3樓轉轉咖啡杯旁',
        operator: '雷克士嘉年華',
        category: 'carnival_game',
        price: { base: 200, mode: 'fixed', details: '5枚飛鏢200元', currency: 'TWD' }
    },
    {
        id: 'carnival_ring',
        name: '套圈圈 RING TOSS',
        location: '3樓轉轉咖啡杯旁',
        operator: '雷克士嘉年華',
        category: 'carnival_game',
        price: { base: 100, mode: 'tiered', details: '8個100, 24個200, 2桶300', currency: 'TWD' }
    },
    {
        id: 'carnival_lobster',
        name: '龍蝦桶 LOBSTER POT',
        location: '3樓巡弋飛椅旁',
        operator: '雷克士嘉年華',
        category: 'carnival_game',
        price: { base: 100, mode: 'tiered', details: '1局100, 3局200, 6局300', currency: 'TWD' }
    },
    {
        id: 'carnival_hook',
        name: '撈鴨子 HOOK A DUCK',
        location: '3樓轉轉咖啡杯旁',
        operator: '雷克士嘉年華',
        category: 'carnival_game',
        price: { base: 200, mode: 'fixed', details: '撈5隻鴨200元', currency: 'TWD' }
    },
    {
        id: 'carnival_pyramid',
        name: '金字塔 PYRAMID SMASH',
        location: '3樓巡弋飛椅旁',
        operator: '雷克士嘉年華',
        category: 'carnival_game',
        price: { base: 100, mode: 'tiered', details: '1局100, 3局200, 6局300', currency: 'TWD' }
    },
    {
        id: 'carnival_pinball',
        name: '卡哇依柑仔店(彈珠台)',
        location: '3樓雷克士/金字塔旁',
        operator: '鈊洲娛樂',
        category: 'carnival_game',
        price: { base: 100, mode: 'tiered', details: '100-300元', currency: 'TWD' },
        note: '不適用一日樂Fun券'
    },
    {
        id: 'carnival_coins',
        name: '卡哇依歡樂世界(投幣機)',
        location: '1樓/2樓/3樓',
        operator: '鈊洲娛樂',
        category: 'carnival_game',
        price: { base: 15, mode: 'tiered', details: '15-40元為主', currency: 'TWD' }
    },

    // --- Level 4: Indoor/Package (室內/套票) ---
    {
        id: 'indoor_jungle',
        name: '寶貝叢林歷險館',
        location: '2樓史努比後方',
        operator: '園區自營',
        category: 'indoor_package',
        price: { base: 50, mode: 'tiered', details: '兒童50元, 成人30元', currency: 'TWD' },
        duration_min: 50,
    },
    {
        id: 'indoor_snoopy',
        name: '史努比樂園',
        location: '2樓',
        operator: '委外廠商',
        category: 'indoor_package',
        price: { base: 299, mode: 'complex', details: '兒童299起, 大人類推', currency: 'TWD' },
        note: '包含超級省/輕鬆省/一般方案等'
    },

    // --- Other ---
    {
        id: 'other_sand',
        name: '沙坑遊戲場',
        location: '入園右側',
        operator: '鈊洲娛樂',
        category: 'other',
        price: { base: 0, mode: 'fixed', details: '免費', currency: 'TWD' }
    }
];
