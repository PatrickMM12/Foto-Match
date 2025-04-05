import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, TooltipProps } from 'recharts';
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

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

interface ChartData {
  date: string;
  income: number;
  expense: number;
  balance: number;
  dateString: string;
}

interface FinancialChartProps {
  transactions: Transaction[];
}

const FinancialChart: React.FC<FinancialChartProps> = ({ transactions }) => {
  const [period, setPeriod] = useState('30days');
  const [chartData, setChartData] = useState<ChartData[]>([]);

  useEffect(() => {
    if (!transactions || transactions.length === 0) {
      setChartData([]);
      return;
    }

    let startDate, endDate;
    const today = new Date();

    switch (period) {
      case '7days':
        startDate = subDays(today, 7);
        endDate = today;
        break;
      case '30days':
        startDate = subDays(today, 30);
        endDate = today;
        break;
      case 'month':
        startDate = startOfMonth(today);
        endDate = endOfMonth(today);
        break;
      default:
        startDate = subDays(today, 30);
        endDate = today;
    }

    // Create array of all days in the range
    const dateRange = eachDayOfInterval({ start: startDate, end: endDate });
    
    // Initialize data with zero values for all dates
    const initialData = dateRange.map(date => {
      const dateString = format(date, 'yyyy-MM-dd');
      return {
        date: format(date, 'dd/MM', { locale: ptBR }),
        dateString,
        income: 0,
        expense: 0,
        balance: 0
      };
    });

    // Aggregate transaction data by date
    transactions.forEach(transaction => {
      // Skip transactions outside the date range
      const txDate = parseISO(transaction.date);
      if (txDate < startDate || txDate > endDate) return;
      
      const dateString = format(txDate, 'yyyy-MM-dd');
      const dataPoint = initialData.find(item => item.dateString === dateString);
      
      if (dataPoint) {
        if (transaction.type === 'income') {
          dataPoint.income += transaction.amount / 100;
        } else {
          dataPoint.expense += Math.abs(transaction.amount) / 100;
        }
        dataPoint.balance = dataPoint.income - dataPoint.expense;
      }
    });

    setChartData(initialData);
  }, [transactions, period]);

  // Custom tooltip for the chart
  const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-md shadow-md">
          <p className="font-medium text-gray-900">{label}</p>
          <p className="text-green-600">Receitas: R$ {payload[0].value?.toFixed(2)}</p>
          <p className="text-red-600">Despesas: R$ {payload[1].value?.toFixed(2)}</p>
          <p className="text-blue-600 font-medium">Saldo: R$ {(payload[0].value! - payload[1].value!).toFixed(2)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Visão Financeira</CardTitle>
          <CardDescription>Acompanhe suas receitas e despesas</CardDescription>
        </div>
        <Select
          value={period}
          onValueChange={setPeriod}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Selecione o período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7days">Últimos 7 dias</SelectItem>
            <SelectItem value="30days">Últimos 30 dias</SelectItem>
            <SelectItem value="month">Este mês</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{
                  top: 20,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#6B7280' }}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#6B7280' }}
                  tickFormatter={(value) => `R$${value}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="income" name="Receitas" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="Despesas" fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center">
              <p className="text-muted-foreground">Sem dados financeiros para exibir</p>
            </div>
          )}
        </div>
        <div className="flex items-center justify-center mt-4 space-x-8">
          <div className="flex items-center">
            <span className="w-3 h-3 bg-primary rounded-sm"></span>
            <span className="ml-2 text-sm text-muted-foreground">Receitas</span>
          </div>
          <div className="flex items-center">
            <span className="w-3 h-3 bg-destructive rounded-sm"></span>
            <span className="ml-2 text-sm text-muted-foreground">Despesas</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FinancialChart;
