import DashboardView from '@/components/dashboard-view';
import { getTransactionsFromCSV } from "@/lib/data-manager";
import { getSession } from '@/lib/auth';

export default async function Home() {
  const transactions = await getTransactionsFromCSV();
  const session = await getSession();

  return (
    <main className="min-h-screen bg-slate-50">
      <DashboardView transactions={transactions} session={session} />
    </main>
  );
}
