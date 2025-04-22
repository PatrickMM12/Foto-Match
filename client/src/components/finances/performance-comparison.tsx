import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Camera,
  Clock,
  Calendar,
  Scale
} from 'lucide-react';
import { format, parseISO, isWithinInterval, subMonths, startOfMonth, endOfMonth, getYear, getMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { convertCentsToDecimal } from '@/lib/formatters';
import { Transaction } from '@/types/transactions';
import { Session } from '@/types/sessions';

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
    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const currentMonthEnd = endOfMonth(now);
    const previousMonthStart = startOfMonth(subMonths(now, 1));
    const previousMonthEnd = endOfMonth(subMonths(now, 1));
    
    // LOG: Verificar dados brutos recebidos
    console.log('[PerformanceComparison] Raw Transactions:', transactions);
    console.log('[PerformanceComparison] Raw Sessions:', sessions);

    // LOG: Verificar datas do mês anterior
    console.log('[PerformanceComparison] Previous Month Start:', previousMonthStart);
    console.log('[PerformanceComparison] Previous Month End:', previousMonthEnd);

    // Função auxiliar para filtrar itens por intervalo de datas (comparando ano/mês em UTC)
    const filterByDateRange = <T extends {date: string}>(items: T[], start: Date, end: Date): T[] => {
      console.log(`[PerformanceComparison] Filtering ${items.length} items between UTC`, start.toISOString(), 'and', end.toISOString());
      const startYearUTC = start.getUTCFullYear();
      const startMonthUTC = start.getUTCMonth(); 
      // endYearUTC e endMonthUTC não são mais necessários para esta lógica
      
      return items.filter(item => {
        if (!item || !item.date) return false; 
        try {
          const date = parseISO(item.date);
          const itemYearUTC = date.getUTCFullYear();
          const itemMonthUTC = date.getUTCMonth(); 
          
          // Lógica de verificação simplificada: compara se o ano/mês UTC do item é igual ao do início do intervalo
          const isInInterval = itemYearUTC === startYearUTC && itemMonthUTC === startMonthUTC;

          // Logs para depuração (ajustados)
          if (startMonthUTC === 2) { // Se o filtro for para Março
             if (itemMonthUTC === 2) { // Item é de Março
               console.log(`[PerformanceComparison UTC Strict] Checking March item ${item.date} => Result: ${isInInterval}`);
             } else if (itemMonthUTC === 3) { // Item é de Abril
               console.log(`[PerformanceComparison UTC Strict] Checking April item ${item.date} => Result: ${isInInterval}`);
             }
          }

          return isInInterval;
        } catch (error) {
          console.error("[PerformanceComparison UTC Strict] Erro ao parsear/comparar data do item:", item, error);
          return false;
        }
      });
    };

    // Filtrar transações por período
    const currentTransactions = filterByDateRange(transactions, currentMonthStart, currentMonthEnd);
    const previousTransactions = filterByDateRange(transactions, previousMonthStart, previousMonthEnd);
    
    // LOG: Verificar transações filtradas do mês anterior
    console.log('[PerformanceComparison] Previous Transactions:', previousTransactions);

    // Filtrar sessões por período 
    const currentSessions = filterByDateRange(sessions, currentMonthStart, currentMonthEnd);
    const previousSessions = filterByDateRange(sessions, previousMonthStart, previousMonthEnd);
    
    // LOG: Verificar sessões filtradas do mês anterior
    console.log('[PerformanceComparison] Previous Sessions:', previousSessions);

    // Função para calcular receita total (transações + sessões)
    const calculateTotalIncome = (periodTransactions: Transaction[], periodSessions: Session[]) => {
      // Receita de transações manuais
      let income = periodTransactions
        .filter(tx => tx.type === 'income')
        .reduce((sum, tx) => sum + convertCentsToDecimal(tx.amount), 0);
      
      // IDs das transações de receita já contabilizadas
      const incomeTransactionSessionIds = new Set(
        periodTransactions.filter(tx => tx.type === 'income' && tx.sessionId).map(tx => tx.sessionId)
      );
      
      // Adicionar receita de sessões (amountPaid) que não têm transação correspondente
      periodSessions.forEach(session => {
        if (session.amountPaid > 0 && !incomeTransactionSessionIds.has(session.id)) {
          income += convertCentsToDecimal(session.amountPaid);
        }
      });
      
      return income;
    };

    // Calcular receitas
    const currentIncome = calculateTotalIncome(currentTransactions, currentSessions);
    const previousIncome = calculateTotalIncome(previousTransactions, previousSessions);
    
    // LOG: Verificar receita calculada do mês anterior
    console.log('[PerformanceComparison] Previous Income:', previousIncome);

    // Calcular despesas (apenas transações)
    const currentExpenses = currentTransactions
      .filter(tx => tx.type === 'expense')
      .reduce((sum, tx) => sum + convertCentsToDecimal(Math.abs(tx.amount)), 0);
    
    const previousExpenses = previousTransactions
      .filter(tx => tx.type === 'expense')
      .reduce((sum, tx) => sum + convertCentsToDecimal(Math.abs(tx.amount)), 0);
      
    // LOG: Verificar despesas calculadas do mês anterior
    console.log('[PerformanceComparison] Previous Expenses:', previousExpenses);
    
    // Calcular lucro
    const currentProfit = currentIncome - currentExpenses;
    const previousProfit = previousIncome - previousExpenses;
    
    // Calcular número de sessões
    const currentSessionCount = currentSessions.length;
    const previousSessionCount = previousSessions.length;
    
    // Calcular número de clientes únicos
    const currentClientIds = Array.from(new Set(currentSessions.map(s => s.clientId)));
    const previousClientIds = Array.from(new Set(previousSessions.map(s => s.clientId)));
    const currentClientCount = currentClientIds.length;
    const previousClientCount = previousClientIds.length;
    
    // Calcular valor médio por sessão
    const currentAvgSessionValue = currentSessionCount > 0 
      ? currentSessions.reduce((sum, s) => sum + convertCentsToDecimal(s.totalPrice), 0) / currentSessionCount 
      : 0;
    
    const previousAvgSessionValue = previousSessionCount > 0 
      ? previousSessions.reduce((sum, s) => sum + convertCentsToDecimal(s.totalPrice), 0) / previousSessionCount 
      : 0;
    
    // Calcular horas trabalhadas (baseado na duração das sessões em minutos)
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
    
    // LOG: Verificar os valores calculados FINAIS para o mês anterior
    console.log('[PerformanceComparison] Final Previous Values:', {
      previousIncome,
      previousExpenses,
      previousProfit,
      previousSessionCount,
      previousClientCount,
      previousAvgSessionValue,
      previousHoursWorked
    });

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
        {metrics.map((metric, index) => {
          // LOG: Verificar o objeto metric sendo renderizado
          console.log(`[PerformanceComparison Rendering] Metric ${index} (${metric.label}):`, metric);
          
          return (
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
          );
        })}
      </div>
    </div>
  );
};

export default PerformanceComparison; 