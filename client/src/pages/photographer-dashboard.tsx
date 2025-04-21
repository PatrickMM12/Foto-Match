import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import PhotographerSidebar from '@/components/layout/photographer-sidebar';
import StatsOverview from '@/components/dashboard/stats-overview';
import FinancialChart from '@/components/dashboard/financial-chart';
import UpcomingSessions from '@/components/dashboard/upcoming-sessions';
import LoadingSpinner from '@/components/shared/loading-spinner';
import PageTitle from '@/components/shared/page-title';
import { getMyReviews } from '@/lib/api';

interface Transaction {
  id: number;
  amount: number;
  date: string;
  description: string;
  type: 'income' | 'expense';
  category: string;
  sessionId?: number;
  userId: number;
}

interface Session {
  id: number;
  date: string;
  clientId: number;
  clientName?: string;
  status: 'pending' | 'confirmed' | 'canceled' | 'completed';
  packageId?: number;
  packageName?: string;
  amountPaid: number;
  totalPrice: number;
  title: string;
  location: string;
  duration: number;
  paymentStatus: string;
}

interface Review {
  id: number;
  sessionId: number;
  reviewerId: number;
  photographerId: number;
  rating: number;
  qualityRating: number;
  professionalismRating: number;
  comment?: string;
  createdAt: string;
}

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

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

  // Fetch reviews data
  const { data: reviewsData, isLoading: isLoadingReviews } = useQuery({
    queryKey: ['/api/reviews/photographer/me'],
    queryFn: async () => {
      try {
        const data = await getMyReviews();
        console.log('Avaliações recebidas via getMyReviews:', data);
        return data;
      } catch (error) {
        console.error('Erro ao buscar avaliações:', error);
        return [];
      }
    },
  });

  useEffect(() => {
    // Log de reviews para depuração
    if (reviewsData) {
      console.log('Dados de avaliações recebidos:', reviewsData);
    }
  }, [reviewsData]);

  const isLoading = isLoadingUser || isLoadingSessions || isLoadingTransactions || isLoadingReviews;

  if (isLoading) {
    return <LoadingSpinner />;
  }

  const user = userData as User;
  const sessions = sessionsData as Session[] || [];
  const transactions = transactionsData as Transaction[] || [];
  const reviews = Array.isArray(reviewsData) ? reviewsData : [];
  
  console.log('Reviews após processamento:', reviews);

  // Calculate stats from data
  const calculateStats = () => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    const previousMonth = (currentMonth - 1 + 12) % 12;
    const previousMonthYear = previousMonth > currentMonth ? currentYear - 1 : currentYear;
    
    // Filter transactions for current month
    const currentMonthTransactions = transactions.filter((transaction) => {
      const transactionDate = new Date(transaction.date);
      return transactionDate.getMonth() === currentMonth && transactionDate.getFullYear() === currentYear;
    });
    
    // Filter transactions for previous month
    const previousMonthTransactions = transactions.filter((transaction) => {
      const transactionDate = new Date(transaction.date);
      return transactionDate.getMonth() === previousMonth && transactionDate.getFullYear() === previousMonthYear;
    });
    
    // Filter sessions for current month
    const currentMonthSessions = sessions.filter((session) => {
      const sessionDate = new Date(session.date);
      return sessionDate.getMonth() === currentMonth && sessionDate.getFullYear() === currentYear;
    });
    
    // Filter sessions for previous month
    const previousMonthSessions = sessions.filter((session) => {
      const sessionDate = new Date(session.date);
      return sessionDate.getMonth() === previousMonth && sessionDate.getFullYear() === previousMonthYear;
    });
    
    // Calculate income from transactions for current month
    const currentMonthTransactionIncome = currentMonthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    
    // Calculate income from sessions with no associated transactions for current month
    const sessionIdsWithTransactions = transactions
      .filter(t => t.type === 'income' && t.sessionId)
      .map(t => t.sessionId);
      
    const currentMonthSessionIncome = currentMonthSessions
      .filter(s => s.amountPaid > 0 && !sessionIdsWithTransactions.includes(s.id))
      .reduce((sum, s) => sum + s.amountPaid, 0);
    
    // Total current month income
    const currentMonthIncome = currentMonthTransactionIncome + currentMonthSessionIncome;
    
    // Calculate income from transactions for previous month
    const previousMonthTransactionIncome = previousMonthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
      
    // Calculate income from sessions with no associated transactions for previous month
    const previousMonthSessionIncome = previousMonthSessions
      .filter(s => s.amountPaid > 0 && !sessionIdsWithTransactions.includes(s.id))
      .reduce((sum, s) => sum + s.amountPaid, 0);
    
    // Total previous month income
    const previousMonthIncome = previousMonthTransactionIncome + previousMonthSessionIncome;
    
    // Calculate upcoming sessions
    const upcomingSessions = sessions.filter((session) => {
      const sessionDate = new Date(session.date);
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      return sessionDate > currentDate && sessionDate <= thirtyDaysFromNow;
    });
    
    // Calculate average ratings from reviews
    let averageRating = 0;
    let averageQualityRating = 0;
    let averageProfessionalismRating = 0;

    if (reviews && reviews.length > 0) {
      // Validar os valores das avaliações para evitar NaN
      const validRatings = reviews.map(r => typeof r.rating === 'number' ? r.rating : 0);
      const validQualityRatings = reviews.map(r => typeof r.qualityRating === 'number' ? r.qualityRating : 0);
      const validProfessionalismRatings = reviews.map(r => typeof r.professionalismRating === 'number' ? r.professionalismRating : 0);
      
      const totalRating = validRatings.reduce((sum, rating) => sum + rating, 0);
      const totalQualityRating = validQualityRatings.reduce((sum, rating) => sum + rating, 0);
      const totalProfessionalismRating = validProfessionalismRatings.reduce((sum, rating) => sum + rating, 0);
      
      averageRating = validRatings.length > 0 ? totalRating / validRatings.length : 0;
      averageQualityRating = validQualityRatings.length > 0 ? totalQualityRating / validQualityRatings.length : 0;
      averageProfessionalismRating = validProfessionalismRatings.length > 0 ? totalProfessionalismRating / validProfessionalismRatings.length : 0;
    }
    
    // Calculate conversion rate (confirmed sessions / total requested sessions)
    const totalRequests = sessions.filter(s => s.status !== 'pending').length;
    const confirmedSessions = sessions.filter(s => s.status === 'confirmed' || s.status === 'completed').length;
    const conversionRate = totalRequests > 0 ? (confirmedSessions / totalRequests) * 100 : 0;
    
    return {
      currentMonthIncome,
      previousMonthIncome,
      upcomingSessionsCount: upcomingSessions.length,
      averageRating: averageRating || 0,
      averageQualityRating: averageQualityRating || 0,
      averageProfessionalismRating: averageProfessionalismRating || 0,
      reviewCount: reviews.length,
      conversionRate,
      totalRequests
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
          averageQualityRating={stats.averageQualityRating}
          averageProfessionalismRating={stats.averageProfessionalismRating}
          reviewCount={stats.reviewCount}
          conversionRate={stats.conversionRate}
          totalRequests={stats.totalRequests}
          reviews={reviews}
        />
        
        <div className="grid lg:grid-cols-3 gap-6 mt-8">
          <div className="lg:col-span-2">
            <FinancialChart 
              transactions={transactions} 
              sessions={sessions}
            />
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
