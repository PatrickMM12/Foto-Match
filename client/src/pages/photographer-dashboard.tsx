import { useQuery } from '@tanstack/react-query';
import PhotographerSidebar from '@/components/layout/photographer-sidebar';
import StatsOverview from '@/components/dashboard/stats-overview';
import FinancialChart from '@/components/dashboard/financial-chart';
import UpcomingSessions from '@/components/dashboard/upcoming-sessions';
import LoadingSpinner from '@/components/shared/loading-spinner';
import PageTitle from '@/components/shared/page-title';

const PhotographerDashboard = () => {
  // Fetch user data
  const { data: userData, isLoading: isLoadingUser } = useQuery({
    queryKey: ['/api/users/me'],
  });

  // Fetch sessions data
  const { data: sessionsData, isLoading: isLoadingSessions } = useQuery({
    queryKey: ['/api/sessions'],
  });

  // Fetch transactions data
  const { data: transactionsData, isLoading: isLoadingTransactions } = useQuery({
    queryKey: ['/api/transactions'],
  });

  const isLoading = isLoadingUser || isLoadingSessions || isLoadingTransactions;

  if (isLoading) {
    return <LoadingSpinner />;
  }

  const user = userData;
  const sessions = sessionsData || [];
  const transactions = transactionsData || [];

  // Calculate stats from data
  const calculateStats = () => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const previousMonth = (currentMonth - 1 + 12) % 12;
    
    // Filter transactions for current month
    const currentMonthTransactions = transactions.filter((transaction) => {
      const transactionDate = new Date(transaction.date);
      return transactionDate.getMonth() === currentMonth;
    });
    
    // Filter transactions for previous month
    const previousMonthTransactions = transactions.filter((transaction) => {
      const transactionDate = new Date(transaction.date);
      return transactionDate.getMonth() === previousMonth;
    });
    
    // Calculate income/expenses for current month
    const currentMonthIncome = currentMonthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const previousMonthIncome = previousMonthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    
    // Calculate upcoming sessions
    const upcomingSessions = sessions.filter((session) => {
      const sessionDate = new Date(session.date);
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      return sessionDate > currentDate && sessionDate <= thirtyDaysFromNow;
    });
    
    return {
      currentMonthIncome,
      previousMonthIncome,
      upcomingSessionsCount: upcomingSessions.length,
      averageRating: 4.8, // In a real app, would be calculated from reviews
    };
  };

  const stats = calculateStats();

  return (
    <div className="flex min-h-screen bg-gray-50">
      <PhotographerSidebar />
      <div className="flex-1 p-8">
        <PageTitle title={`Bom dia, ${user?.name || 'Fotógrafo'}!`} />
        
        <StatsOverview
          monthlyIncome={stats.currentMonthIncome}
          previousMonthIncome={stats.previousMonthIncome}
          upcomingSessions={stats.upcomingSessionsCount}
          averageRating={stats.averageRating}
        />
        
        <div className="grid lg:grid-cols-3 gap-6 mt-8">
          <div className="lg:col-span-2">
            <FinancialChart transactions={transactions} />
          </div>
          <div className="lg:col-span-1">
            <UpcomingSessions sessions={sessions} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PhotographerDashboard;
