import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Camera,
  Clock,
  Calendar
} from 'lucide-react';
import { format, parseISO, isWithinInterval, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Transaction {
  id: number;
  userId: number;
  sessionId?: number;
  amount: number;
  description: string;
  category: string;
  date: string;
  type: 'income' | 'expense';
}

interface Session {
  id: number;
  title: string;
  date: string;
  amountPaid: number;
  totalPrice: number;
  paymentStatus: string;
  status: string;
  duration: number;
  clientId: number;
}

interface Client {
  id: number;
  name: string;
}

interface PerformanceComparisonProps {
  transactions: Transaction[];
  sessions: Session[];
  clients?: Client[];
}

interface MetricData {
  label: string;
  currentValue: number;
  previousValue: number;
  percentChange: number;
  isMonetary?: boolean;
  icon: React.ReactNode;
  color: string;
  formatter?: (value: number) => string;
}

const PerformanceComparison: React.FC<PerformanceComparisonProps> = ({
  transactions,
  sessions,
  clients
}) => {
  const metrics = useMemo(() => {
    // Definir períodos para comparação
    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const currentMonthEnd = endOfMonth(now);
    const previousMonthStart = startOfMonth(subMonths(now, 1));
    const previousMonthEnd = endOfMonth(subMonths(now, 1));
    
    // Filtrar transações por período
    const currentTransactions = transactions.filter(tx => {
      const date = parseISO(tx.date);
      return isWithinInterval(date, { start: currentMonthStart, end: currentMonthEnd });
    });
    
    const previousTransactions = transactions.filter(tx => {
      const date = parseISO(tx.date);
      return isWithinInterval(date, { start: previousMonthStart, end: previousMonthEnd });
    });
    
    // Filtrar sessões por período
    const currentSessions = sessions.filter(s => {
      const date = parseISO(s.date);
      return isWithinInterval(date, { start: currentMonthStart, end: currentMonthEnd });
    });
    
    const previousSessions = sessions.filter(s => {
      const date = parseISO(s.date);
      return isWithinInterval(date, { start: previousMonthStart, end: previousMonthEnd });
    });
    
    // 1. Receita total (transações de receita + sessões pagas)
    const currentIncome = currentTransactions
      .filter(tx => tx.type === 'income')
      .reduce((sum, tx) => sum + tx.amount, 0);
    
    const previousIncome = previousTransactions
      .filter(tx => tx.type === 'income')
      .reduce((sum, tx) => sum + tx.amount, 0);
    
    // 2. Despesas totais
    const currentExpenses = currentTransactions
      .filter(tx => tx.type === 'expense')
      .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
    
    const previousExpenses = previousTransactions
      .filter(tx => tx.type === 'expense')
      .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
    
    // 3. Lucro (Receita - Despesas)
    const currentProfit = currentIncome - currentExpenses;
    const previousProfit = previousIncome - previousExpenses;
    
    // 4. Número de sessões
    const currentSessionCount = currentSessions.length;
    const previousSessionCount = previousSessions.length;
    
    // 5. Número de clientes únicos
    const currentClientIds = Array.from(new Set(currentSessions.map(s => s.clientId)));
    const previousClientIds = Array.from(new Set(previousSessions.map(s => s.clientId)));
    const currentClientCount = currentClientIds.length;
    const previousClientCount = previousClientIds.length;
    
    // 6. Valor médio por sessão
    const currentAvgSessionValue = currentSessionCount > 0 
      ? currentSessions.reduce((sum, s) => sum + s.totalPrice, 0) / currentSessionCount 
      : 0;
    
    const previousAvgSessionValue = previousSessionCount > 0 
      ? previousSessions.reduce((sum, s) => sum + s.totalPrice, 0) / previousSessionCount 
      : 0;
    
    // 7. Horas trabalhadas (baseado na duração das sessões em minutos)
    const currentHoursWorked = currentSessions.reduce((sum, s) => sum + (s.duration || 0), 0) / 60;
    const previousHoursWorked = previousSessions.reduce((sum, s) => sum + (s.duration || 0), 0) / 60;
    
    // Formatar valores monetários
    const formatCurrency = (value: number) => {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(value);
    };
    
    // Função para calcular a variação percentual
    const calculatePercentChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };
    
    // Construir array de métricas
    const metricData: MetricData[] = [
      {
        label: 'Receita',
        currentValue: currentIncome,
        previousValue: previousIncome,
        percentChange: calculatePercentChange(currentIncome, previousIncome),
        isMonetary: true,
        icon: <DollarSign className="h-5 w-5" />,
        color: '#10b981', // verde
        formatter: formatCurrency
      },
      {
        label: 'Despesas',
        currentValue: currentExpenses,
        previousValue: previousExpenses,
        percentChange: calculatePercentChange(currentExpenses, previousExpenses),
        isMonetary: true,
        icon: <DollarSign className="h-5 w-5" />,
        color: '#ef4444', // vermelho
        formatter: formatCurrency
      },
      {
        label: 'Lucro',
        currentValue: currentProfit,
        previousValue: previousProfit,
        percentChange: calculatePercentChange(currentProfit, previousProfit),
        isMonetary: true,
        icon: <DollarSign className="h-5 w-5" />,
        color: '#3b82f6', // azul
        formatter: formatCurrency
      },
      {
        label: 'Sessões',
        currentValue: currentSessionCount,
        previousValue: previousSessionCount,
        percentChange: calculatePercentChange(currentSessionCount, previousSessionCount),
        icon: <Camera className="h-5 w-5" />,
        color: '#8b5cf6', // roxo
        formatter: (value) => value.toString()
      },
      {
        label: 'Clientes',
        currentValue: currentClientCount,
        previousValue: previousClientCount,
        percentChange: calculatePercentChange(currentClientCount, previousClientCount),
        icon: <Users className="h-5 w-5" />,
        color: '#f59e0b', // âmbar
        formatter: (value) => value.toString()
      },
      {
        label: 'Média por Sessão',
        currentValue: currentAvgSessionValue,
        previousValue: previousAvgSessionValue,
        percentChange: calculatePercentChange(currentAvgSessionValue, previousAvgSessionValue),
        isMonetary: true,
        icon: <DollarSign className="h-5 w-5" />,
        color: '#10b981', // verde
        formatter: formatCurrency
      },
      {
        label: 'Horas Trabalhadas',
        currentValue: currentHoursWorked,
        previousValue: previousHoursWorked,
        percentChange: calculatePercentChange(currentHoursWorked, previousHoursWorked),
        icon: <Clock className="h-5 w-5" />,
        color: '#6366f1', // indigo
        formatter: (value) => `${value.toFixed(1)}h`
      }
    ];
    
    return metricData;
  }, [transactions, sessions, clients]);
  
  const currentMonth = format(new Date(), 'MMMM', { locale: ptBR });
  const previousMonth = format(subMonths(new Date(), 1), 'MMMM', { locale: ptBR });
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-medium">
          Comparação: <span className="font-bold capitalize">{currentMonth}</span> vs <span className="capitalize">{previousMonth}</span>
        </h3>
        <Calendar className="h-5 w-5 text-muted-foreground" />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {metrics.map((metric, index) => (
          <Card key={index} className="overflow-hidden border-l-4" style={{ borderLeftColor: metric.color }}>
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center">
                  <div className="mr-2 p-2 rounded-full" style={{ backgroundColor: `${metric.color}20` }}>
                    {React.cloneElement(metric.icon as React.ReactElement, { style: { color: metric.color } })}
                  </div>
                  <span className="font-medium text-muted-foreground">{metric.label}</span>
                </div>
                
                <div className={`flex items-center ${
                  // Para despesas, crescimento é ruim, para outros é bom
                  metric.label === 'Despesas'
                    ? (metric.percentChange < 0 ? 'text-green-600' : 'text-red-600')
                    : (metric.percentChange >= 0 ? 'text-green-600' : 'text-red-600')
                }`}>
                  {metric.percentChange >= 0 ? (
                    <TrendingUp className="h-4 w-4 mr-1" />
                  ) : (
                    <TrendingDown className="h-4 w-4 mr-1" />
                  )}
                  <span className="text-xs font-medium">
                    {Math.abs(metric.percentChange).toFixed(1)}%
                  </span>
                </div>
              </div>
              
              <div className="mt-2">
                <p className="text-xl font-bold" style={{ color: metric.color }}>
                  {metric.formatter ? metric.formatter(metric.currentValue) : metric.currentValue}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  vs {metric.formatter ? metric.formatter(metric.previousValue) : metric.previousValue} no mês anterior
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default PerformanceComparison; 