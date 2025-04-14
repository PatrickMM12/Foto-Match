import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, eachMonthOfInterval, eachWeekOfInterval, startOfWeek, endOfWeek, startOfYear, endOfYear, subMonths, subYears, getMonth, getYear, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Transaction {
  id: number;
  amount: number;
  description: string;
  category: string;
  date: string;
  type: 'income' | 'expense';
}

interface FinancialChartProps {
  transactions: Transaction[];
  title?: string;
  description?: string;
}

type ChartPeriod = 'week' | 'month' | 'year';
type ChartType = 'bar' | 'line' | 'area';

const FinancialChart: React.FC<FinancialChartProps> = ({
  transactions,
  title = "Análise Financeira",
  description = "Acompanhe suas receitas e despesas ao longo do tempo."
}) => {
  const [period, setPeriod] = useState<ChartPeriod>('month');
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [showComparison, setShowComparison] = useState(false);
  
  // Formatar valor monetário
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  // Preparar os dados para o gráfico
  const chartData = useMemo(() => {
    if (!transactions.length) return [];
    
    const now = new Date();
    let dateInterval;
    let prevDateInterval;
    let dateFormat: string;
    
    // Definir intervalo de datas com base no período selecionado
    if (period === 'week') {
      dateInterval = eachDayOfInterval({
        start: startOfWeek(now, { locale: ptBR }),
        end: endOfWeek(now, { locale: ptBR })
      });
      
      prevDateInterval = eachDayOfInterval({
        start: startOfWeek(subMonths(now, 1), { locale: ptBR }),
        end: endOfWeek(subMonths(now, 1), { locale: ptBR })
      });
      
      dateFormat = 'EEE';
    } else if (period === 'month') {
      dateInterval = eachDayOfInterval({
        start: startOfMonth(now),
        end: endOfMonth(now)
      });
      
      prevDateInterval = eachDayOfInterval({
        start: startOfMonth(subMonths(now, 1)),
        end: endOfMonth(subMonths(now, 1))
      });
      
      dateFormat = 'dd';
    } else { // year
      dateInterval = eachMonthOfInterval({
        start: startOfYear(now),
        end: endOfYear(now)
      });
      
      prevDateInterval = eachMonthOfInterval({
        start: startOfYear(subYears(now, 1)),
        end: endOfYear(subYears(now, 1))
      });
      
      dateFormat = 'MMM';
    }
    
    // Criar dados para cada data no intervalo
    const data = dateInterval.map(date => {
      // Filtrar transações para a data atual
      const dayTransactions = transactions.filter(transaction => {
        const transactionDate = parseISO(transaction.date);
        
        if (period === 'year') {
          return getMonth(transactionDate) === getMonth(date) && 
                 getYear(transactionDate) === getYear(date);
        }
        
        return transactionDate.toDateString() === date.toDateString();
      });
      
      // Calcular total de receitas e despesas
      const income = dayTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
      
      const expense = dayTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
      
      // Filtrar transações do período anterior para comparação
      let prevIncome = 0;
      let prevExpense = 0;
      
      if (showComparison) {
        // Encontrar a data correspondente no período anterior
        const prevDate = prevDateInterval[dateInterval.indexOf(date)];
        
        if (prevDate) {
          const prevDayTransactions = transactions.filter(transaction => {
            const transactionDate = parseISO(transaction.date);
            
            if (period === 'year') {
              return getMonth(transactionDate) === getMonth(prevDate) && 
                     getYear(transactionDate) === getYear(prevDate);
            }
            
            return transactionDate.toDateString() === prevDate.toDateString();
          });
          
          prevIncome = prevDayTransactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);
          
          prevExpense = prevDayTransactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);
        }
      }
      
      return {
        date: format(date, dateFormat, { locale: ptBR }),
        fullDate: date,
        income,
        expense,
        balance: income - expense,
        prevIncome,
        prevExpense,
        prevBalance: prevIncome - prevExpense
      };
    });
    
    return data;
  }, [transactions, period, showComparison]);
  
  // Personalizar tooltip do gráfico
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-md shadow-md">
          <p className="text-sm font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p 
              key={`tooltip-${index}`} 
              className="text-sm" 
              style={{ color: entry.color }}
            >
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };
  
  // Renderizar o gráfico com base no tipo selecionado
  const renderChart = () => {
    let chart;
    
    switch (chartType) {
      case 'bar':
        chart = (
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis 
              tickFormatter={(value) => 
                new Intl.NumberFormat('pt-BR', { 
                  notation: 'compact',
                  compactDisplay: 'short' 
                }).format(value)
              } 
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar dataKey="income" name="Receitas" fill="#10b981" />
            <Bar dataKey="expense" name="Despesas" fill="#ef4444" />
            {showComparison && (
              <>
                <Bar dataKey="prevIncome" name="Receitas (período anterior)" fill="#10b981" fillOpacity={0.3} />
                <Bar dataKey="prevExpense" name="Despesas (período anterior)" fill="#ef4444" fillOpacity={0.3} />
              </>
            )}
          </BarChart>
        );
        break;
        
      case 'line':
        chart = (
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis 
              tickFormatter={(value) => 
                new Intl.NumberFormat('pt-BR', { 
                  notation: 'compact',
                  compactDisplay: 'short' 
                }).format(value)
              } 
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="income" 
              name="Receitas" 
              stroke="#10b981" 
              activeDot={{ r: 8 }} 
            />
            <Line 
              type="monotone" 
              dataKey="expense" 
              name="Despesas" 
              stroke="#ef4444" 
              activeDot={{ r: 8 }} 
            />
            <Line 
              type="monotone" 
              dataKey="balance" 
              name="Saldo" 
              stroke="#3b82f6" 
              activeDot={{ r: 8 }} 
            />
            {showComparison && (
              <>
                <Line 
                  type="monotone" 
                  dataKey="prevIncome" 
                  name="Receitas (período anterior)" 
                  stroke="#10b981" 
                  strokeDasharray="5 5" 
                  strokeOpacity={0.5} 
                />
                <Line 
                  type="monotone" 
                  dataKey="prevExpense" 
                  name="Despesas (período anterior)" 
                  stroke="#ef4444" 
                  strokeDasharray="5 5" 
                  strokeOpacity={0.5} 
                />
                <Line 
                  type="monotone" 
                  dataKey="prevBalance" 
                  name="Saldo (período anterior)" 
                  stroke="#3b82f6" 
                  strokeDasharray="5 5" 
                  strokeOpacity={0.5} 
                />
              </>
            )}
          </LineChart>
        );
        break;
        
      case 'area':
        chart = (
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis 
              tickFormatter={(value) => 
                new Intl.NumberFormat('pt-BR', { 
                  notation: 'compact',
                  compactDisplay: 'short' 
                }).format(value)
              } 
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Area 
              type="monotone" 
              dataKey="income" 
              name="Receitas" 
              stroke="#10b981" 
              fill="#10b981" 
              fillOpacity={0.3} 
            />
            <Area 
              type="monotone" 
              dataKey="expense" 
              name="Despesas" 
              stroke="#ef4444" 
              fill="#ef4444" 
              fillOpacity={0.3} 
            />
            <Area 
              type="monotone" 
              dataKey="balance" 
              name="Saldo" 
              stroke="#3b82f6" 
              fill="#3b82f6" 
              fillOpacity={0.3} 
            />
            {showComparison && (
              <>
                <Area 
                  type="monotone" 
                  dataKey="prevIncome" 
                  name="Receitas (período anterior)" 
                  stroke="#10b981" 
                  fill="#10b981" 
                  fillOpacity={0.1} 
                  strokeDasharray="5 5" 
                />
                <Area 
                  type="monotone" 
                  dataKey="prevExpense" 
                  name="Despesas (período anterior)" 
                  stroke="#ef4444" 
                  fill="#ef4444" 
                  fillOpacity={0.1} 
                  strokeDasharray="5 5" 
                />
                <Area 
                  type="monotone" 
                  dataKey="prevBalance" 
                  name="Saldo (período anterior)" 
                  stroke="#3b82f6" 
                  fill="#3b82f6" 
                  fillOpacity={0.1} 
                  strokeDasharray="5 5" 
                />
              </>
            )}
          </AreaChart>
        );
        break;
    }
    
    return chart;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
        <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center mt-4 gap-2">
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={period === 'week' ? 'default' : 'outline'}
              onClick={() => setPeriod('week')}
            >
              Semana
            </Button>
            <Button
              size="sm"
              variant={period === 'month' ? 'default' : 'outline'}
              onClick={() => setPeriod('month')}
            >
              Mês
            </Button>
            <Button
              size="sm"
              variant={period === 'year' ? 'default' : 'outline'}
              onClick={() => setPeriod('year')}
            >
              Ano
            </Button>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={chartType === 'bar' ? 'default' : 'outline'}
              onClick={() => setChartType('bar')}
            >
              Barras
            </Button>
            <Button
              size="sm"
              variant={chartType === 'line' ? 'default' : 'outline'}
              onClick={() => setChartType('line')}
            >
              Linhas
            </Button>
            <Button
              size="sm"
              variant={chartType === 'area' ? 'default' : 'outline'}
              onClick={() => setChartType('area')}
            >
              Área
            </Button>
          </div>
          
          <Button
            size="sm"
            variant={showComparison ? 'default' : 'outline'}
            onClick={() => setShowComparison(!showComparison)}
          >
            {showComparison ? 'Ocultar Comparação' : 'Mostrar Comparação'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground mb-2">Sem dados para exibir</p>
            <p className="text-sm text-muted-foreground">
              Adicione transações para visualizar seus gráficos financeiros.
            </p>
          </div>
        ) : (
          <div className="h-[350px] mt-4">
            <ResponsiveContainer width="100%" height="100%">
              {renderChart()}
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FinancialChart; 