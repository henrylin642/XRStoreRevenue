import DashboardView from '@/components/dashboard-view';
import { getTransactionsFromCSV } from "@/lib/data-manager";

export default async function Home() {
  const transactions = await getTransactionsFromCSV();

  return (
    <main className="min-h-screen bg-slate-50">
      <DashboardView transactions={transactions} />
    </main>
  );
}
