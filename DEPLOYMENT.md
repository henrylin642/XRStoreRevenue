# 部署指南 (Deployment Guide) - Vercel & Supabase

本文件說明如何將此專案部署至 Vercel，並設定 Supabase 資料庫。

## 1. Supabase 設定 (資料庫)

### 步驟 1.1: 建立專案
1. 前往 [Supabase](https://supabase.com/) 並登入。
2. 點擊 **"New Project"**。
3. 選擇您的組織 (Organization)。
4. 填寫 **Name** (例如: `leimen-revenue`), **Database Password** (請妥善保存), 與 **Region** (建議選擇靠近使用者的位置，例如 `Tokyo` 或 `Singapore`)。
5. 等待專案建立完成 (約需 1-2 分鐘)。

### 步驟 1.2: 取得 API Key 與 URL
1. 進入專案後，前往 **Project Settings** (左下角齒輪圖示) -> **API**。
2. 複製 **Project URL** (`URL`)。
3. 複製 **Project API keys** 中的 `anon` `public` key。
   - ⚠️ 注意：不要洩漏 `service_role` key，除非在伺服器端管理腳本中使用。

### 步驟 1.3: 建立資料表 (使用 SQL)
1. 在 Supabase 左側選單點擊 **SQL Editor**。
2. 貼上以下 SQL 語法 (這些是本專案需要的結構)：

```sql
-- 1. 建立交易記錄表
create table if not exists transactions (
  id text primary key,
  invoice_number text,
  date timestamp with time zone,
  amount numeric,
  payment_method text,
  payment_status text default '付款成功',
  transaction_type text default '交易成功',
  created_at timestamp with time zone default now()
);

-- 2. 建立遊客數據表
create table if not exists visitor_stats (
  year int not null,
  month int not null,
  count int not null,
  primary key (year, month)
);

-- 3. 開啟 Row Level Security (RLS) 安全性設定
alter table transactions enable row level security;
alter table visitor_stats enable row level security;

-- 4. 設定存取權限 (這裡設定為公開讀取，方便 Demo。生產環境建議限制)
create policy "Public Read Transactions" on transactions for select using (true);
create policy "Public Read Visitor Stats" on visitor_stats for select using (true);

-- 允許 Service Role (後端/遷移腳本) 寫入數據 (預設 Service Role 擁有所有權限，但明確設定 policy 也可以)
-- 若要在前端寫入，需額外設定 Policy，但本專案主要透過後台或腳本匯入。
```

3. 點擊右下角的 **Run** 按鈕。
4. (選用) 前往 **Table Editor** 確認 `transactions` 和 `visitor_stats` 表格已出現。

---

## 2. 資料遷移 (將本地 CSV 上傳至 Supabase)

若您希望保留原本 CSV 中的資料，請在**本地**執行遷移。

1. 在專案根目錄建立 `.env.local` 檔案，填入剛剛取得的 Supabase 資訊：
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=您的SupabaseURL
   NEXT_PUBLIC_SUPABASE_ANON_KEY=您的AnonKey
   ```
2. 我們需要一個腳本來執行遷移。請在專案中執行以下步驟：
   *(如果您需要，我可以幫您生成一個 `scripts/migrate.ts`，您只需執行 `npx tsx scripts/migrate.ts` 即可)*

---

## 3. Vercel 設定 (部署與託管)

### 步驟 3.1: 連結 GitHub
1. 確保您的程式碼已 Push 到 GitHub Repo (`henrylin642/XRStoreRevenue`)。

### 步驟 3.2: 在 Vercel 匯入專案
1. 前往 [Vercel Dashboard](https://vercel.com/dashboard)。
2. 點擊 **"Add New..."** -> **"Project"**。
3. 在 "Import Git Repository" 列表中找到您的 `XRStoreRevenue` 專案，點擊 **Import**。
4. **Framework Preset**: Vercel 通常會自動偵測為 **Next.js**。如果沒有，請手動選擇 `Next.js`。


### 步驟 3.3: 設定環境變數 (Environment Variables)
1. 在 "Configure Project" 頁面，展開 **Environment Variables** 區塊。
2. 新增以下變數 (與 Supabase 相同)：
   - Key: `NEXT_PUBLIC_SUPABASE_URL`
     - Value: (貼上您的 Project URL)
   - Key: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - Value: (貼上您的 Anon Key)
   - Key: `JWT_SECRET` (供登入系統使用)
     - Value: (設定一個隨機的長字串，例如 `complex_password_123`)

### 步驟 3.4: 部署
1. 點擊 **Deploy**。
2. 等待 Vercel 建置完成 (約 1-2 分鐘)。
3. 完成後，您將獲得一個專屬的網址 (例如 `xr-store-revenue.vercel.app`)。

## 4. 完成後的檢查
- 打開 Vercel 提供的網址。
- 嘗試登入 (預設 `admin` / `admin123`)。
- 檢查 Dashboard 是否有數據 (若尚未遷移數據，可能是空的)。
- 檢查「遊客統計」Tab 是否有顯示 2024/2025 的數據 (若尚未遷移，也可能是空的)。
