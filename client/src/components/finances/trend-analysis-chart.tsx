import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, TooltipProps } from 'recharts';
import { 
  format, 
  parseISO, 
  startOfMonth, 
  subMonths, 
  eachMonthOfInterval, 
  isAfter, 
  isBefore, 
  isSameMonth 
} from 'date-fns';
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
}

interface TrendAnalysisChartProps {
  transactions: Transaction[];
  sessions?: Session[];
  months?: number; // Número de meses para análise (default: 12)
}

interface MonthlyData {
  month: string;
  date: Date;
  income: number;
  expense: number;
  profit: number;
  dateStr: string;
}

const TrendAnalysisChart: React.FC<TrendAnalysisChartProps> = ({ 
  transactions, 
  sessions, 
  months = 12 
}) => {
  const trendData = useMemo(() => {
    // Criar array de meses para análise
    const today = new Date();
    const startDate = subMonths(startOfMonth(today), months - 1);
    
    const monthRange = eachMonthOfInterval({
      start: startDate,
      end: today
    });
    
    // Inicializar dados mensais
    const monthlyData: MonthlyData[] = monthRange.map(date => ({
      month: format(date, 'MMM/yy', { locale: ptBR }),
      date,
      income: 0,
      expense: 0,
      profit: 0,
      dateStr: format(date, 'yyyy-MM', { locale: ptBR })
    }));
    
    // Processar transações
    transactions.forEach(transaction => {
      const txDate = parseISO(transaction.date);
      
      // Encontrar o mês correspondente
      const monthData = monthlyData.find(m => 
        isSameMonth(m.date, txDate) && 
        txDate.getFullYear() === m.date.getFullYear()
      );
      
      if (monthData) {
        if (transaction.type === 'income') {
          monthData.income += transaction.amount;
        } else {
          monthData.expense += Math.abs(transaction.amount);
        }
        
        // Atualizar lucro
        monthData.profit = monthData.income - monthData.expense;
      }
    });
    
    // Processar sessões (apenas as que não têm transações associadas)
    if (sessions && sessions.length > 0) {
      // Obter IDs de sessões que já têm transações
      const sessionIdsWithTransactions = transactions
        .filter(t => t.type === 'income' && t.sessionId)
        .map(t => t.sessionId);
      
      sessions.forEach(session => {
        // Ignorar sessões sem pagamento ou que já têm transações
        if (session.amountPaid <= 0 || sessionIdsWithTransactions.includes(session.id)) {
          return;
        }
        
        const sessionDate = parseISO(session.date);
        
        // Encontrar o mês correspondente
        const monthData = monthlyData.find(m => 
          isSameMonth(m.date, sessionDate) && 
          sessionDate.getFullYear() === m.date.getFullYear()
        );
        
        if (monthData) {
          monthData.income += session.amountPaid;
          
          // Atualizar lucro
          monthData.profit = monthData.income - monthData.expense;
        }
      });
    }
    
    return monthlyData;
  }, [transactions, sessions, months]);
  
  // Formatação de valores monetários
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };
  
  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-md shadow-md">
          <p className="font-medium text-gray-900">{label}</p>
          <p className="text-green-600">Receita: {formatCurrency(payload[0].value || 0)}</p>
          <p className="text-red-600">Despesa: {formatCurrency(payload[1].value || 0)}</p>
          <p className="text-blue-600 font-medium">Lucro: {formatCurrency(payload[2].value || 0)}</p>
        </div>
      );
    }
    return null;
  };
  
  // Se não houver dados, mostrar mensagem
  if (trendData.length === 0) {
    return (
      <div className="flex justify-center items-center h-[300px]">
        <p className="text-muted-foreground">Sem dados para análise de tendências</p>
      </div>
    );
  }
  
  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={trendData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="month" 
            tick={{ fontSize: 12 }}
          />
          <YAxis 
            tickFormatter={(value) => formatCurrency(value)}
            tick={{ fontSize: 12 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="income" 
            name="Receita" 
            stroke="#10b981" 
            strokeWidth={2}
            activeDot={{ r: 8 }} 
          />
          <Line 
            type="monotone" 
            dataKey="expense" 
            name="Despesa" 
            stroke="#ef4444" 
            strokeWidth={2}
          />
          <Line 
            type="monotone" 
            dataKey="profit" 
            name="Lucro" 
            stroke="#3b82f6" 
            strokeWidth={2.5}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TrendAnalysisChart; 