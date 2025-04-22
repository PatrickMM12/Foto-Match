import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend,
  ReferenceLine
} from 'recharts';
import { 
  format, 
  parseISO, 
  getMonth, 
  getYear, 
  eachMonthOfInterval, 
  startOfYear, 
  endOfYear 
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TrendingUp } from 'lucide-react';
import { convertCentsToDecimal } from '@/lib/formatters';
import { Transaction } from '@/types/transactions';

interface Session {
  id: number;
  title: string;
  date: string;
  amountPaid: number;
  totalPrice: number;
  paymentStatus: string;
  status: string;
}

interface FinancialProjectionProps {
  transactions: Transaction[];
  sessions: Session[];
}

interface MonthlyFinancial {
  month: string;
  shortMonth: string;
  actualIncome: number;
  actualExpense: number;
  actualProfit: number;
  projectedIncome: number;
  projectedExpense: number;
  projectedProfit: number;
}

interface Goal {
  monthlyIncome: number;
  monthlyProfit: number;
  yearlyIncome: number;
  yearlyProfit: number;
}

const FinancialProjection: React.FC<FinancialProjectionProps> = ({ 
  transactions, 
  sessions 
}) => {
  // Estado para metas financeiras
  const [financialGoals, setFinancialGoals] = useState<Goal>({
    monthlyIncome: 5000,
    monthlyProfit: 3000,
    yearlyIncome: 60000,
    yearlyProfit: 36000
  });
  
  // Formatação de valores monetários
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };
  
  // Projeções financeiras
  const projectionData = useMemo(() => {
    const now = new Date();
    const currentYear = getYear(now);
    const currentMonth = getMonth(now);
    
    // Criar array com todos os meses do ano
    const monthsOfYear = eachMonthOfInterval({
      start: startOfYear(now),
      end: endOfYear(now)
    });
    
    // Inicializar dados mensais
    const monthlyData: MonthlyFinancial[] = monthsOfYear.map(date => {
      const monthIndex = getMonth(date);
      
      return {
        month: format(date, 'MMMM', { locale: ptBR }),
        shortMonth: format(date, 'MMM', { locale: ptBR }),
        actualIncome: 0,
        actualExpense: 0,
        actualProfit: 0,
        projectedIncome: 0,
        projectedExpense: 0,
        projectedProfit: 0
      };
    });
    
    // Processar transações reais
    transactions.forEach(transaction => {
      const txDate = parseISO(transaction.date);
      
      // Ignorar transações de anos diferentes
      if (getYear(txDate) !== currentYear) return;
      
      const monthIndex = getMonth(txDate);
      
      if (transaction.type === 'income') {
        monthlyData[monthIndex].actualIncome += convertCentsToDecimal(transaction.amount);
      } else {
        monthlyData[monthIndex].actualExpense += convertCentsToDecimal(Math.abs(transaction.amount));
      }
      
      // Atualizar lucro real
      monthlyData[monthIndex].actualProfit = 
        monthlyData[monthIndex].actualIncome - monthlyData[monthIndex].actualExpense;
    });
    
    // Processar sessões para receitas (apenas as que não têm transações associadas)
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
        
        // Ignorar sessões de anos diferentes
        if (getYear(sessionDate) !== currentYear) return;
        
        const monthIndex = getMonth(sessionDate);
        
        // Adicionar receita da sessão
        monthlyData[monthIndex].actualIncome += convertCentsToDecimal(session.amountPaid);
        
        // Atualizar lucro real
        monthlyData[monthIndex].actualProfit = 
          monthlyData[monthIndex].actualIncome - monthlyData[monthIndex].actualExpense;
      });
    }
    
    // Calcular médias para projeções
    let totalIncome = 0;
    let totalExpense = 0;
    let monthsWithData = 0;
    
    // Contabilizar apenas meses até o atual
    for (let i = 0; i <= currentMonth; i++) {
      if (monthlyData[i].actualIncome > 0 || monthlyData[i].actualExpense > 0) {
        totalIncome += monthlyData[i].actualIncome;
        totalExpense += monthlyData[i].actualExpense;
        monthsWithData++;
      }
    }
    
    // Calcular médias mensais
    const avgMonthlyIncome = monthsWithData > 0 ? totalIncome / monthsWithData : 0;
    const avgMonthlyExpense = monthsWithData > 0 ? totalExpense / monthsWithData : 0;
    
    // Criar projeções para os meses restantes do ano
    for (let i = 0; i <= 11; i++) {
      // Para meses passados e atual, usamos valores reais
      if (i <= currentMonth) {
        monthlyData[i].projectedIncome = monthlyData[i].actualIncome;
        monthlyData[i].projectedExpense = monthlyData[i].actualExpense;
        monthlyData[i].projectedProfit = monthlyData[i].actualProfit;
      } 
      // Para meses futuros, usamos projeções baseadas na média
      else {
        monthlyData[i].projectedIncome = avgMonthlyIncome;
        monthlyData[i].projectedExpense = avgMonthlyExpense;
        monthlyData[i].projectedProfit = avgMonthlyIncome - avgMonthlyExpense;
      }
    }
    
    return monthlyData;
  }, [transactions, sessions]);
  
  // Calcular totais anuais
  const yearTotals = useMemo(() => {
    const actualIncome = projectionData.reduce((sum, month) => sum + month.actualIncome, 0);
    const actualExpense = projectionData.reduce((sum, month) => sum + month.actualExpense, 0);
    const actualProfit = actualIncome - actualExpense;
    
    const projectedIncome = projectionData.reduce((sum, month) => sum + month.projectedIncome, 0);
    const projectedExpense = projectionData.reduce((sum, month) => sum + month.projectedExpense, 0);
    const projectedProfit = projectedIncome - projectedExpense;
    
    // Percentual de meta alcançada
    const incomeGoalPercent = financialGoals.yearlyIncome > 0 
      ? (projectedIncome / financialGoals.yearlyIncome) * 100 
      : 0;
    
    const profitGoalPercent = financialGoals.yearlyProfit > 0 
      ? (projectedProfit / financialGoals.yearlyProfit) * 100 
      : 0;
    
    return {
      actualIncome,
      actualExpense,
      actualProfit,
      projectedIncome,
      projectedExpense,
      projectedProfit,
      incomeGoalPercent,
      profitGoalPercent
    };
  }, [projectionData, financialGoals]);
  
  // Meses até o final do ano
  const remainingMonths = 12 - (getMonth(new Date()) + 1);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center">
          <TrendingUp className="h-5 w-5 mr-2" />
          Projeções Financeiras
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="income">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="income">Receitas</TabsTrigger>
            <TabsTrigger value="expenses">Despesas</TabsTrigger>
            <TabsTrigger value="profit">Lucro</TabsTrigger>
          </TabsList>
          
          <TabsContent value="income" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Receita Atual</h4>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(yearTotals.actualIncome)}</p>
                  <p className="text-xs text-muted-foreground mt-1">Acumulado até o momento</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Projeção Anual</h4>
                  <p className="text-2xl font-bold text-blue-600">{formatCurrency(yearTotals.projectedIncome)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    +{formatCurrency(yearTotals.projectedIncome - yearTotals.actualIncome)} nos próximos {remainingMonths} meses
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Meta Anual</h4>
                  <div className="flex items-end gap-2">
                    <Input
                      type="number"
                      value={financialGoals.yearlyIncome}
                      onChange={(e) => setFinancialGoals({
                        ...financialGoals,
                        yearlyIncome: Number(e.target.value),
                        monthlyIncome: Number(e.target.value) / 12
                      })}
                      className="h-8 w-36"
                    />
                    <span className="text-sm text-muted-foreground mb-2">
                      ({formatCurrency(financialGoals.monthlyIncome)}/mês)
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {yearTotals.incomeGoalPercent.toFixed(1)}% da meta anual
                  </p>
                </CardContent>
              </Card>
            </div>
            
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={projectionData} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="shortMonth" />
                  <YAxis tickFormatter={(value) => formatCurrency(value)} />
                  <Tooltip 
                    formatter={(value, name) => {
                      return [formatCurrency(value as number), name === 'actualIncome' ? 'Realizado' : 'Projeção'];
                    }}
                    labelFormatter={(label) => `Mês: ${label}`}
                  />
                  <Legend payload={[
                    { value: 'Realizado', type: 'square', color: '#10b981' },
                    { value: 'Projeção', type: 'square', color: '#93c5fd' },
                    { value: 'Meta Mensal', type: 'line', color: '#6366f1' }
                  ]} />
                  <Bar dataKey="actualIncome" name="Realizado" fill="#10b981" />
                  <Bar dataKey="projectedIncome" name="Projeção" fill="#93c5fd" />
                  <ReferenceLine 
                    y={financialGoals.monthlyIncome} 
                    stroke="#6366f1" 
                    strokeDasharray="3 3"
                    label={{ 
                      value: 'Meta Mensal', 
                      position: 'top', 
                      fill: '#6366f1', 
                      fontSize: 12 
                    }} 
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
          
          <TabsContent value="expenses" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Despesas Atuais</h4>
                  <p className="text-2xl font-bold text-red-600">{formatCurrency(yearTotals.actualExpense)}</p>
                  <p className="text-xs text-muted-foreground mt-1">Acumulado até o momento</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Projeção Anual</h4>
                  <p className="text-2xl font-bold text-orange-600">{formatCurrency(yearTotals.projectedExpense)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    +{formatCurrency(yearTotals.projectedExpense - yearTotals.actualExpense)} nos próximos {remainingMonths} meses
                  </p>
                </CardContent>
              </Card>
            </div>
            
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={projectionData} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="shortMonth" />
                  <YAxis tickFormatter={(value) => formatCurrency(value)} />
                  <Tooltip 
                    formatter={(value, name) => {
                      return [formatCurrency(value as number), name === 'actualExpense' ? 'Realizado' : 'Projeção'];
                    }}
                    labelFormatter={(label) => `Mês: ${label}`}
                  />
                  <Legend payload={[
                    { value: 'Realizado', type: 'square', color: '#ef4444' },
                    { value: 'Projeção', type: 'square', color: '#fdba74' }
                  ]} />
                  <Bar dataKey="actualExpense" name="Realizado" fill="#ef4444" />
                  <Bar dataKey="projectedExpense" name="Projeção" fill="#fdba74" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
          
          <TabsContent value="profit" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Lucro Atual</h4>
                  <p className="text-2xl font-bold text-blue-600">{formatCurrency(yearTotals.actualProfit)}</p>
                  <p className="text-xs text-muted-foreground mt-1">Acumulado até o momento</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Projeção Anual</h4>
                  <p className="text-2xl font-bold text-indigo-600">{formatCurrency(yearTotals.projectedProfit)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    +{formatCurrency(yearTotals.projectedProfit - yearTotals.actualProfit)} nos próximos {remainingMonths} meses
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Meta Anual</h4>
                  <div className="flex items-end gap-2">
                    <Input
                      type="number"
                      value={financialGoals.yearlyProfit}
                      onChange={(e) => setFinancialGoals({
                        ...financialGoals,
                        yearlyProfit: Number(e.target.value),
                        monthlyProfit: Number(e.target.value) / 12
                      })}
                      className="h-8 w-36"
                    />
                    <span className="text-sm text-muted-foreground mb-2">
                      ({formatCurrency(financialGoals.monthlyProfit)}/mês)
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {yearTotals.profitGoalPercent.toFixed(1)}% da meta anual
                  </p>
                </CardContent>
              </Card>
            </div>
            
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={projectionData} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="shortMonth" />
                  <YAxis tickFormatter={(value) => formatCurrency(value)} />
                  <Tooltip 
                    formatter={(value, name) => {
                      return [formatCurrency(value as number), name === 'actualProfit' ? 'Realizado' : 'Projeção'];
                    }}
                    labelFormatter={(label) => `Mês: ${label}`}
                  />
                  <Legend payload={[
                    { value: 'Realizado', type: 'square', color: '#3b82f6' },
                    { value: 'Projeção', type: 'square', color: '#a5b4fc' },
                    { value: 'Meta Mensal', type: 'line', color: '#6366f1' }
                  ]} />
                  <Bar dataKey="actualProfit" name="Realizado" fill="#3b82f6" />
                  <Bar dataKey="projectedProfit" name="Projeção" fill="#a5b4fc" />
                  <ReferenceLine 
                    y={financialGoals.monthlyProfit} 
                    stroke="#6366f1" 
                    strokeDasharray="3 3"
                    label={{ 
                      value: 'Meta Mensal', 
                      position: 'top', 
                      fill: '#6366f1', 
                      fontSize: 12 
                    }} 
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default FinancialProjection; 