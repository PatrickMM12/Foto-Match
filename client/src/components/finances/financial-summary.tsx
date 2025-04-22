import React, { useMemo } from 'react';
import { ArrowUpCircle, ArrowDownCircle, DollarSign } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { convertCentsToDecimal } from '@/lib/formatters';

interface Transaction {
  id: number;
  amount: number;
  description: string;
  category: string;
  date: string;
  type: 'income' | 'expense';
}

interface FinancialSummaryProps {
  transactions: Transaction[];
}

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  trend,
  className = '',
}) => {
  return (
    <Card className={className}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <h3 className="text-2xl font-bold mt-1">{value}</h3>
            {trend && (
              <p className={`text-xs mt-1 flex items-center ${trend.isPositive ? 'text-green-500' : 'text-red-500'}`}>
                {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value).toFixed(1)}%
                <span className="text-muted-foreground ml-1">em relação ao mês anterior</span>
              </p>
            )}
          </div>
          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const FinancialSummary: React.FC<FinancialSummaryProps> = ({ transactions }) => {
  // Formatação de valores monetários
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(convertCentsToDecimal(value));
  };

  // Processamento de dados
  const summary = useMemo(() => {
    if (!transactions.length) {
      return {
        totalIncome: 0,
        totalExpense: 0,
        balance: 0,
        incomeTrend: 0,
        expenseTrend: 0,
        balanceTrend: 0,
      };
    }

    // Ordenar transações por data
    const sortedTransactions = [...transactions].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Agrupar transações por mês
    const transactionsByMonth: Record<string, Transaction[]> = {};
    
    sortedTransactions.forEach(transaction => {
      const date = new Date(transaction.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!transactionsByMonth[monthKey]) {
        transactionsByMonth[monthKey] = [];
      }
      
      transactionsByMonth[monthKey].push(transaction);
    });

    // Obter meses ordenados
    const months = Object.keys(transactionsByMonth).sort();
    
    // Calcular totais para o mês atual
    const currentMonth = months[months.length - 1];
    const currentMonthTransactions = transactionsByMonth[currentMonth] || [];
    
    const currentIncome = currentMonthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const currentExpense = currentMonthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const currentBalance = currentIncome - currentExpense;
    
    // Calcular totais para o mês anterior (se existir)
    let incomeTrend = 0;
    let expenseTrend = 0;
    let balanceTrend = 0;
    
    if (months.length > 1) {
      const previousMonth = months[months.length - 2];
      const previousMonthTransactions = transactionsByMonth[previousMonth] || [];
      
      const previousIncome = previousMonthTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
      
      const previousExpense = previousMonthTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
      
      const previousBalance = previousIncome - previousExpense;
      
      // Calcular tendências (porcentagem de mudança)
      incomeTrend = previousIncome === 0 
        ? 100 
        : ((currentIncome - previousIncome) / previousIncome) * 100;
      
      expenseTrend = previousExpense === 0 
        ? 100 
        : ((currentExpense - previousExpense) / previousExpense) * 100;
      
      balanceTrend = previousBalance === 0 
        ? 100 
        : ((currentBalance - previousBalance) / Math.abs(previousBalance)) * 100;
    }
    
    // Calcular totais gerais
    const totalIncome = sortedTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalExpense = sortedTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const balance = totalIncome - totalExpense;

    return {
      totalIncome,
      totalExpense,
      balance,
      incomeTrend,
      expenseTrend,
      balanceTrend,
    };
  }, [transactions]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <StatCard
        title="Receitas Totais"
        value={formatCurrency(summary.totalIncome)}
        icon={<ArrowUpCircle className="h-6 w-6 text-green-500" />}
        trend={transactions.length > 0 ? { 
          value: summary.incomeTrend, 
          isPositive: summary.incomeTrend >= 0 
        } : undefined}
        className="bg-white"
      />
      
      <StatCard
        title="Despesas Totais"
        value={formatCurrency(summary.totalExpense)}
        icon={<ArrowDownCircle className="h-6 w-6 text-red-500" />}
        trend={transactions.length > 0 ? { 
          value: summary.expenseTrend, 
          isPositive: summary.expenseTrend < 0 
        } : undefined}
        className="bg-white"
      />
      
      <StatCard
        title="Saldo"
        value={formatCurrency(summary.balance)}
        icon={<DollarSign className="h-6 w-6 text-blue-500" />}
        trend={transactions.length > 0 ? { 
          value: summary.balanceTrend, 
          isPositive: summary.balanceTrend >= 0 
        } : undefined}
        className={`bg-white ${summary.balance >= 0 ? 'border-green-100' : 'border-red-100'}`}
      />
    </div>
  );
};

export default FinancialSummary; 