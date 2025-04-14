import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, TooltipProps } from 'recharts';
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval, parseISO, startOfYear, endOfYear, eachMonthOfInterval, subYears } from 'date-fns';
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

interface Session {
  id: number;
  title: string;
  date: string;
  amountPaid: number;
  totalPrice: number;
  paymentStatus: string;
  status: string;
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
  sessions?: Session[];
  selectedPeriod?: string;
}

const FinancialChart: React.FC<FinancialChartProps> = ({ 
  transactions,
  sessions,
  selectedPeriod 
}) => {
  const [period, setPeriod] = useState('30days');
  const [chartData, setChartData] = useState<ChartData[]>([]);

  // Mapear os períodos do seletor principal para o formato usado no gráfico
  const mapSelectedPeriodToChartPeriod = (selectedPeriod?: string): string => {
    if (!selectedPeriod) return period;
    
    switch (selectedPeriod) {
      case 'this_month':
        return 'month';
      case 'last_30_days':
        return '30days';
      case 'last_90_days':
        // Não tem correspondente exato, mantém o padrão
        return period;
      case 'this_year':
        // Não tem correspondente exato, mantém o padrão
        return period;
      case 'last_year':
        // Não tem correspondente exato, mantém o padrão
        return period;
      default:
        return period;
    }
  };

  // Usar o período selecionado quando ele mudar
  useEffect(() => {
    if (selectedPeriod) {
      const mappedPeriod = mapSelectedPeriodToChartPeriod(selectedPeriod);
      setPeriod(mappedPeriod);
    }
  }, [selectedPeriod]);

  useEffect(() => {
    if (!transactions || transactions.length === 0) {
      setChartData([]);
      return;
    }

    let startDate, endDate;
    const today = new Date();

    // Definir intervalo com base no período selecionado
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
      case 'year':
        startDate = startOfYear(today);
        endDate = endOfYear(today);
        break;
      case 'last_year':
        startDate = startOfYear(subYears(today, 1));
        endDate = endOfYear(subYears(today, 1));
        break;
      case '90days':
        startDate = subDays(today, 90);
        endDate = today;
        break;
      default:
        startDate = subDays(today, 30);
        endDate = today;
    }

    // Criar intervalo de datas apropriado
    let dateRange;
    let dateFormat: string;
    
    // Para períodos longos, agrupar por mês em vez de dia
    if (period === 'year' || period === 'last_year') {
      dateRange = eachMonthOfInterval({ start: startDate, end: endDate });
      dateFormat = 'MMM';
    } else {
      dateRange = eachDayOfInterval({ start: startDate, end: endDate });
      dateFormat = 'dd/MM';
    }
    
    // Inicializar dados com valores zero para todas as datas
    const initialData = dateRange.map(date => {
      const dateString = format(date, 'yyyy-MM-dd');
      return {
        date: format(date, dateFormat, { locale: ptBR }),
        dateString,
        income: 0,
        expense: 0,
        balance: 0
      };
    });

    // Filtrar e agregar dados de transações por data
    transactions.forEach(transaction => {
      const txDate = parseISO(transaction.date);
      
      // Pular transações fora do intervalo de datas
      if (txDate < startDate || txDate > endDate) return;
      
      let targetDateString;
      
      // Para agrupamento por mês
      if (period === 'year' || period === 'last_year') {
        targetDateString = format(txDate, 'yyyy-MM-01');
      } else {
        targetDateString = format(txDate, 'yyyy-MM-dd');
      }
      
      const dataPoint = initialData.find(item => {
        if (period === 'year' || period === 'last_year') {
          // Comparar apenas mês e ano para agrupamento mensal
          return item.dateString.substring(0, 7) === targetDateString.substring(0, 7);
        }
        return item.dateString === targetDateString;
      });
      
      if (dataPoint) {
        if (transaction.type === 'income') {
          dataPoint.income += transaction.amount;
        } else {
          dataPoint.expense += Math.abs(transaction.amount);
        }
        dataPoint.balance = dataPoint.income - dataPoint.expense;
      }
    });
    
    // Adicionar receitas de sessões ao gráfico (se houver)
    if (sessions && sessions.length > 0) {
      // Mapear sessionIds de transações existentes para evitar duplicidade
      const sessionIdsWithTransactions = transactions
        .filter(t => t.type === 'income' && t.sessionId)
        .map(t => t.sessionId);

      sessions.forEach(session => {
        // Apenas considerar sessões com pagamentos e que não possuem transações associadas
        if (session.amountPaid <= 0 || sessionIdsWithTransactions.includes(session.id)) {
          return;
        }

        const sessionDate = parseISO(session.date);
        
        // Pular sessões fora do intervalo de datas
        if (sessionDate < startDate || sessionDate > endDate) return;
        
        let targetDateString;
        
        // Para agrupamento por mês
        if (period === 'year' || period === 'last_year') {
          targetDateString = format(sessionDate, 'yyyy-MM-01');
        } else {
          targetDateString = format(sessionDate, 'yyyy-MM-dd');
        }
        
        const dataPoint = initialData.find(item => {
          if (period === 'year' || period === 'last_year') {
            // Comparar apenas mês e ano para agrupamento mensal
            return item.dateString.substring(0, 7) === targetDateString.substring(0, 7);
          }
          return item.dateString === targetDateString;
        });
        
        if (dataPoint) {
          // Adicionar o valor pago como receita
          dataPoint.income += session.amountPaid;
          dataPoint.balance = dataPoint.income - dataPoint.expense;
        }
      });
    }

    setChartData(initialData);
  }, [transactions, sessions, period]);

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
            <SelectItem value="90days">Últimos 90 dias</SelectItem>
            <SelectItem value="month">Este mês</SelectItem>
            <SelectItem value="year">Este ano</SelectItem>
            <SelectItem value="last_year">Ano passado</SelectItem>
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
