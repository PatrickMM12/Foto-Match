import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useMemo, useEffect } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { 
  format, 
  parseISO, 
  startOfMonth, 
  endOfMonth, 
  isFuture, 
  isWithinInterval, 
  startOfYear, 
  endOfYear, 
  subDays, 
  subYears, 
  getMonth, 
  getYear,
  isToday,
  isSameMonth,
  isSameDay
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatPriceBRL, convertCentsToDecimal } from '@/lib/formatters';
import { Transaction } from '@/types/transactions';
import { Session } from '@/types/sessions';

import PhotographerSidebar from '@/components/layout/photographer-sidebar';
import PageTitle from '@/components/shared/page-title';
import LoadingSpinner from '@/components/shared/loading-spinner';
import TransactionForm from '@/components/finances/transaction-form';
import TransactionList from '@/components/finances/transaction-list';
import FinancialChart from '@/components/dashboard/financial-chart';
import {
  ExpenseCategoryChart,
  TrendAnalysisChart, 
  PerformanceComparison,
  FinancialProjection
} from '@/components/finances';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  PlusCircle, 
  AlertCircle, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Clock, 
  BarChart2, 
  List, 
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';

// Interfaces para tipagem
interface FinancialSummary {
  income: number;
  expenses: number;
  balance: number;
  pending: number;
  upcoming: number;
}

interface FinancialPeriod {
  label: string;
  value: string;
}

const FINANCIAL_PERIODS: FinancialPeriod[] = [
  { label: "Este mês", value: "this_month" },
  { label: "Últimos 30 dias", value: "last_30_days" },
  { label: "Últimos 90 dias", value: "last_90_days" },
  { label: "Este ano", value: "this_year" },
  { label: "Ano passado", value: "last_year" },
];

const PhotographerFinances = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTimePeriod, setSelectedTimePeriod] = useState<string>("this_month");
  const [activeTab, setActiveTab] = useState<string>("overview");
  
  // Variáveis para armazenar dados filtrados que serão usados em múltiplos lugares
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<Session[]>([]);
  const [sessionIncome, setSessionIncome] = useState<number>(0);
  const [transactionIncome, setTransactionIncome] = useState<number>(0);
  
  // Fetch transactions data
  const { data: transactions, isLoading: isLoadingTransactions } = useQuery<Transaction[]>({
    queryKey: ['/api/transactions'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/transactions', undefined);
      if (!res.ok) {
        throw new Error('Erro ao buscar transações');
      }
      return res.json();
    }
  });
  
  // Fetch sessions data
  const { data: sessions, isLoading: isLoadingSessions } = useQuery<Session[]>({
    queryKey: ['/api/sessions'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/sessions', undefined);
      if (!res.ok) {
        throw new Error('Erro ao buscar sessões');
      }
      return res.json();
    }
  });
  
  const createTransactionMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('POST', '/api/transactions', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      toast({
        title: 'Transação registrada',
        description: 'A transação foi registrada com sucesso',
      });
      setIsDialogOpen(false);
    },
    onError: () => {
      toast({
        title: 'Erro ao registrar transação',
        description: 'Não foi possível registrar a transação',
        variant: 'destructive',
      });
    }
  });
  
  // Geração da lista combinada de itens financeiros (transações + receitas de sessões)
  const combinedFinancialItems = useMemo(() => {
    const manualTransactions = transactions || [];
    const sessionList = sessions || [];
    const combinedList: Transaction[] = [...manualTransactions];

    sessionList.forEach(session => {
      if (session.amountPaid > 0) {
        const hasManualIncomeTransaction = manualTransactions.some(
          t => t.sessionId === session.id && t.type === 'income'
        );

        if (!hasManualIncomeTransaction) {
          const userIdForTransaction = session.photographerId;
          
          combinedList.push({
            id: `session-income-${session.id}`,
            amount: session.amountPaid,
            description: `Receita da Sessão: ${session.title}`,
            category: 'Sessão Fotográfica',
            date: session.date,
            type: 'income',
            sessionId: session.id,
            userId: userIdForTransaction,
            photographerId: userIdForTransaction,
          });
        }
      }
    });
    
    combinedList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return combinedList;
  }, [transactions, sessions]);
  
  // Filtrar transações e sessões por período
  const filterItemsByTimePeriod = (date: string, period: string) => {
    const itemDate = parseISO(date);
    const today = new Date();
    
    switch (period) {
      case "this_month":
        return isWithinInterval(itemDate, {
          start: startOfMonth(today),
          end: endOfMonth(today)
        });
      case "last_30_days":
        return isWithinInterval(itemDate, {
          start: subDays(today, 30),
          end: today
        });
      case "last_90_days":
        return isWithinInterval(itemDate, {
          start: subDays(today, 90),
          end: today
        });
      case "this_year":
        return isWithinInterval(itemDate, {
          start: startOfYear(today),
          end: endOfYear(today)
        });
      case "last_year":
        const lastYearStart = startOfYear(subYears(today, 1));
        const lastYearEnd = endOfYear(subYears(today, 1));
        return isWithinInterval(itemDate, {
          start: lastYearStart,
          end: lastYearEnd
        });
      default:
        return true; // Sem filtro, considera todos
    }
  };
  
  const calculateFinancialSummary = useMemo((): FinancialSummary => {
    if (!transactions || !sessions) return { income: 0, expenses: 0, balance: 0, pending: 0, upcoming: 0 };
    
    // Filtrar transações pelo período selecionado
    const currentFilteredTransactions = transactions
      .filter(t => filterItemsByTimePeriod(t.date, selectedTimePeriod));
    
    // Atualizar estado para uso em outros componentes
    setFilteredTransactions(currentFilteredTransactions);
    
    // Filtrar sessões pelo período selecionado
    const currentFilteredSessions = sessions
      .filter(s => filterItemsByTimePeriod(s.date, selectedTimePeriod));
    
    // Atualizar estado para uso em outros componentes
    setFilteredSessions(currentFilteredSessions);
    
    // Receitas das transações
    const currentTransactionIncome = currentFilteredTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    
    // Atualizar estado para uso em outros componentes
    setTransactionIncome(currentTransactionIncome);
    
    // Receitas das sessões (valores já pagos)
    // Considerando apenas sessões que não possuem transações associadas para evitar duplicidade
    const currentSessionIncome = currentFilteredSessions
      .filter(session => 
        session.amountPaid > 0 && 
        // Se não existe transação associada a esta sessão
        !currentFilteredTransactions.some(t => t.sessionId === session.id && t.type === 'income')
      )
      .reduce((sum, session) => sum + session.amountPaid, 0);
    
    // Atualizar estado para uso em outros componentes
    setSessionIncome(currentSessionIncome);
    
    // Receita total (transações + sessões sem transações associadas)
    const income = currentTransactionIncome + currentSessionIncome;
    
    const expenses = currentFilteredTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
    // Calcular valores pendentes (sessões confirmadas/concluídas com pagamento pendente)
    // Modificação: usando todas as sessões, independente do período selecionado
    const pendingAmount = sessions
      .filter(s => (s.status === 'completed' || s.status === 'confirmed') && 
                 (s.paymentStatus === 'pending' || s.paymentStatus === 'partial'))
      .reduce((sum, s) => {
        const remaining = s.totalPrice - s.amountPaid;
        return sum + (remaining > 0 ? remaining : 0);
      }, 0);
    
    // Calcular valores futuros (previsão de receita das sessões confirmadas)
    const upcomingAmount = currentFilteredSessions
      .filter(s => s.status === 'confirmed' && isFuture(parseISO(s.date)))
      .reduce((sum, s) => {
        // Calcular o valor restante a ser pago (totalPrice - amountPaid)
        const remaining = s.totalPrice - s.amountPaid;
        return sum + (remaining > 0 ? remaining : 0);
      }, 0);
    
    return {
      income,
      expenses,
      balance: income - expenses,
      pending: pendingAmount,
      upcoming: upcomingAmount
    };
  }, [transactions, sessions, selectedTimePeriod]);
  
  const handleSubmitTransaction = (data: any) => {
    // Garantir que o campo date seja um objeto Date
    const transactionData = {
      ...data,
      // Converter para Date se for string
      date: data.date instanceof Date ? data.date : new Date(data.date)
    };
    
    console.log("Enviando transação:", transactionData);
    createTransactionMutation.mutate(transactionData);
  };

  // Função para converter sessão concluída em transação
  const createSessionTransaction = (session: Session) => {
    const transactionData = {
      amount: session.amountPaid,
      description: `Pagamento da sessão: ${session.title}`,
      category: 'Sessão Fotográfica',
      date: new Date(),
      type: 'income',
      sessionId: session.id
    };
    
    createTransactionMutation.mutate(transactionData);
  };
  
  // Filtrar sessões concluídas que precisam de registro financeiro
  const completedSessionsWithoutTransactions = useMemo(() => 
    sessions
      ?.filter(session => 
        session.status === 'completed' &&      // Sessão está concluída
        session.amountPaid > 0 &&         // Houve algum pagamento
        session.paymentStatus !== 'paid' && // Pagamento ainda não está marcado como 'Pago'
        session.amountPaid < session.totalPrice && // Valor pago é menor que o total
        !transactions?.some(t => t.sessionId === session.id) // Não existe transação registrada
      ) || [], 
    [sessions, transactions]
  );
  
  // Formatar valores monetários
  const formatCurrency = (amount: number) => {
    // Converter de centavos para reais antes de formatar
    return formatPriceBRL(amount);
  };
  
  // Componente de cartão de resumo financeiro
  const SummaryCard = ({ title, value, icon, trend, color }: { 
    title: string, 
    value: string, 
    icon: React.ReactNode, 
    trend?: number,
    color: string 
  }) => (
    <Card className="overflow-hidden border-t-4" style={{ borderTopColor: color }}>
      <CardHeader className="flex flex-row items-center justify-between p-4">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={`p-2 rounded-full bg-opacity-10`} style={{ backgroundColor: `${color}20` }}>
          {icon}
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="text-2xl font-bold" style={{ color }}>
          {value}
        </div>
        {trend !== undefined && (
          <div className="flex items-center mt-1 text-xs">
            {trend >= 0 ? (
              <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
            ) : (
              <TrendingDown className="h-3 w-3 mr-1 text-red-500" />
            )}
            <span className={trend >= 0 ? "text-green-500" : "text-red-500"}>
              {Math.abs(trend).toFixed(1)}% em relação ao período anterior
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
  
  // Componente de sessão pendente
  const PendingSessionCard = ({ session }: { session: Session }) => {
    const isPaid = session.amountPaid >= session.totalPrice;
    const remaining = session.totalPrice - session.amountPaid;
    
    return (
      <Card className="mb-3">
        <CardContent className="p-4">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="font-medium text-base">{session.title}</h4>
              <p className="text-sm text-muted-foreground">
                {session.clientName || `Cliente #${session.clientId}`}
              </p>
              <div className="flex items-center mt-1">
                <Calendar className="h-3 w-3 mr-1 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {format(parseISO(session.date), 'dd MMM yyyy', { locale: ptBR })}
                </span>
              </div>
            </div>
            <div className="text-right">
              <Badge className={isPaid 
                ? "bg-green-100 text-green-800" 
                : "bg-yellow-100 text-yellow-800"}>
                {isPaid ? "Pago" : "Pendente"}
              </Badge>
              <p className="text-sm font-medium mt-1">
                {formatCurrency(session.totalPrice)}
              </p>
              {!isPaid && (
                <p className="text-xs text-yellow-600">
                  Pendente: {formatCurrency(remaining)}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };
  
  // Componente de transação recente
  const RecentTransactionItem = ({ transaction }: { transaction: Transaction & { id: number | string } }) => (
    <div className="flex items-center justify-between py-3 border-b last:border-0">
      <div className="flex items-center">
        <div className={`p-2 rounded-full mr-3 ${
          transaction.type === 'income' 
            ? 'bg-green-100 text-green-600' 
            : 'bg-red-100 text-red-600'
        }`}>
          {transaction.type === 'income' 
            ? <ArrowUpRight className="h-4 w-4" /> 
            : <ArrowDownRight className="h-4 w-4" />}
        </div>
        <div>
          <p className="font-medium text-sm">{transaction.description}</p>
          <p className="text-xs text-muted-foreground">
            {format(parseISO(transaction.date), 'dd MMM yyyy', { locale: ptBR })}
          </p>
        </div>
      </div>
      <div className={`text-right ${
        transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
      }`}>
        <p className="font-medium">
          {transaction.type === 'income' ? '+' : '-'} {formatCurrency(transaction.amount)}
        </p>
        <p className="text-xs">{transaction.category}</p>
      </div>
    </div>
  );
  
  if (isLoadingTransactions || isLoadingSessions) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <PhotographerSidebar />
        <div className="flex-1 p-4 md:p-8">
          <div className="flex justify-between items-center mb-6">
            <PageTitle title="Finanças" />
            <Skeleton className="h-10 w-36" />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map(i => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-32 mb-2" />
                  <Skeleton className="h-3 w-48" />
                </CardContent>
              </Card>
            ))}
          </div>
          
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[300px] w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex min-h-screen bg-gray-50">
      <PhotographerSidebar />
      <div className="flex-1 p-4 md:p-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <PageTitle title="Análise Financeira" />
            <p className="text-muted-foreground mt-1">
              Visualização das suas receitas e despesas ao longo do tempo
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Select
              value={selectedTimePeriod}
              onValueChange={setSelectedTimePeriod}
            >
              <SelectTrigger className="h-9 w-full sm:w-[180px]">
                <SelectValue placeholder="Selecione o período" />
              </SelectTrigger>
              <SelectContent>
                {FINANCIAL_PERIODS.map((period) => (
                  <SelectItem key={period.value} value={period.value}>
                    {period.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
                <Button className="w-full sm:w-auto">
                <PlusCircle className="mr-2 h-4 w-4" />
                Nova Transação
              </Button>
            </DialogTrigger>
              <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Registrar nova transação</DialogTitle>
              </DialogHeader>
              <TransactionForm onSubmit={handleSubmitTransaction} isLoading={createTransactionMutation.isPending} />
            </DialogContent>
          </Dialog>
          </div>
        </div>
        
        {/* Exibir alerta para sessões concluídas sem transações */}
        {completedSessionsWithoutTransactions.length > 0 && (
          <Card className="mb-6 border-yellow-300 bg-yellow-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center text-yellow-800">
                <AlertCircle className="h-4 w-4 mr-2 text-yellow-600" />
                Sessões concluídas sem registro financeiro
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {completedSessionsWithoutTransactions.map(session => (
                  <div key={session.id} className="flex justify-between items-center border-b pb-2 last:border-0">
                    <div>
                      <p className="font-medium">{session.title}</p>
                      <p className="text-sm text-muted-foreground">
                        Cliente: {session.clientName || `ID: ${session.clientId}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="font-medium">
                        {formatCurrency(session.amountPaid)}
                      </p>
                      <Button 
                        size="sm" 
                        onClick={() => createSessionTransaction(session)}
                      >
                        Registrar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full mb-6">
            <TabsTrigger value="overview" className="flex items-center">
              <BarChart2 className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Visão Geral</span>
              <span className="sm:hidden">Geral</span>
            </TabsTrigger>
            <TabsTrigger value="transactions" className="flex items-center">
              <List className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Transações</span>
              <span className="sm:hidden">Trans.</span>
            </TabsTrigger>
            <TabsTrigger value="sessions" className="flex items-center">
              <Calendar className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Sessões</span>
              <span className="sm:hidden">Sessões</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center">
              <TrendingUp className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Relatórios</span>
              <span className="sm:hidden">Relat.</span>
            </TabsTrigger>
          </TabsList>
          
          {/* Visão Geral Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <SummaryCard 
                title="Receitas" 
                value={formatCurrency(calculateFinancialSummary.income)}
                icon={<TrendingUp className="h-4 w-4 text-green-600" />}
                trend={8.2}
                color="#10b981"
              />
              
              <SummaryCard 
                title="Despesas" 
                value={formatCurrency(calculateFinancialSummary.expenses)}
                icon={<TrendingDown className="h-4 w-4 text-red-600" />}
                trend={-2.5}
                color="#ef4444"
              />
              
              <SummaryCard 
                title="Saldo" 
                value={formatCurrency(calculateFinancialSummary.balance)}
                icon={<DollarSign className="h-4 w-4 text-blue-600" />}
                color="#3b82f6"
              />
              
              <SummaryCard 
                title="Pendente" 
                value={formatCurrency(calculateFinancialSummary.pending)}
                icon={<Clock className="h-4 w-4 text-yellow-600" />}
                color="#f59e0b"
              />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Fluxo Financeiro</CardTitle>
                  <CardDescription>
                    Visualização de receitas e despesas ao longo do tempo
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <FinancialChart 
                      transactions={transactions || []}
                      sessions={sessions || []}
                      selectedPeriod={selectedTimePeriod}
                    />
                  </div>
                </CardContent>
              </Card>
          
              <div className="flex flex-col gap-6">
          <Card>
            <CardHeader className="pb-2">
                    <div className="flex justify-between">
                      <CardTitle>Transações Recentes</CardTitle>
                      <Button variant="ghost" size="sm" className="text-xs h-8" onClick={() => setActiveTab('transactions')}>
                        Ver todas
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
            </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="h-[200px] px-4">
                      {combinedFinancialItems.length === 0 ? (
                        <div className="flex justify-center items-center h-full">
                          <p className="text-muted-foreground text-sm">Nenhuma transação ainda</p>
                        </div>
                      ) : (
                        combinedFinancialItems.slice(0, 5).map(item => (
                          <RecentTransactionItem 
                            key={item.id}
                            transaction={item}
                          />
                        ))
                      )}
                    </ScrollArea>
            </CardContent>
          </Card>
        
          <Card>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between">
                      <CardTitle>Previsão de Receita</CardTitle>
                      <Badge className="bg-blue-100 text-blue-800">
                        {formatCurrency(calculateFinancialSummary.upcoming)}
                      </Badge>
                    </div>
              <CardDescription>
                      Sessões confirmadas
              </CardDescription>
            </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="h-[200px] px-4">
                      {sessions?.filter(s => s.status === 'confirmed' && isFuture(parseISO(s.date))).length === 0 ? (
                        <div className="flex justify-center items-center h-full">
                          <p className="text-muted-foreground text-sm">Nenhuma sessão confirmada</p>
              </div>
                      ) : (
                        sessions?.filter(s => s.status === 'confirmed' && isFuture(parseISO(s.date)))
                          .slice(0, 3)
                          .map(session => (
                            <PendingSessionCard key={session.id} session={session} />
                          ))
                      )}
                    </ScrollArea>
            </CardContent>
          </Card>
        </div>
            </div>
          </TabsContent>
          
          {/* Transações Tab */}
          <TabsContent value="transactions">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <CardTitle>Histórico de Transações</CardTitle>
                    <CardDescription>
                      Todas as suas receitas e despesas
                    </CardDescription>
                  </div>
                  <Tabs defaultValue="all" className="w-full sm:w-auto">
              <TabsList>
                <TabsTrigger value="all">Todas</TabsTrigger>
                <TabsTrigger value="income">Receitas</TabsTrigger>
                <TabsTrigger value="expense">Despesas</TabsTrigger>
              </TabsList>
                  </Tabs>
            </div>
              </CardHeader>
              <CardContent>
                <TransactionList 
                  transactions={combinedFinancialItems}
                />
              </CardContent>
            </Card>
            </TabsContent>
            
          {/* Sessões Tab */}
          <TabsContent value="sessions">
            <Card>
              <CardHeader>
                <CardTitle>Pagamentos de Sessões</CardTitle>
                <CardDescription>
                  Listagem de pagamentos e valores pendentes das sessões
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  {sessions?.filter(s => s.status === 'completed' || s.status === 'confirmed').length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <p className="text-muted-foreground mb-2">Nenhuma sessão encontrada.</p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {sessions?.filter(s => s.status === 'completed' || s.status === 'confirmed').map(session => {
                        const isPaid = session.amountPaid >= session.totalPrice;
                        const remaining = session.totalPrice - session.amountPaid;
                        
                        return (
                          <div key={session.id} className="p-4">
                            <div className="flex flex-col sm:flex-row justify-between">
                              <div>
                                <h4 className="font-medium">{session.title}</h4>
                                <p className="text-sm text-muted-foreground">
                                  Cliente: {session.clientName || `ID: ${session.clientId}`}
                                </p>
                                <div className="flex items-center mt-1">
                                  <Calendar className="h-3 w-3 mr-1 text-muted-foreground" />
                                  <span className="text-xs text-muted-foreground">
                                    {format(parseISO(session.date), 'dd MMM yyyy', { locale: ptBR })}
                                  </span>
                                  <Badge className="ml-2 h-5 text-xs" variant="outline">
                                    {session.status === 'completed' ? 'Concluída' : 'Confirmada'}
                                  </Badge>
                                </div>
                              </div>
                              <div className="text-right mt-2 sm:mt-0">
                                <div className="flex items-center justify-end gap-2">
                                  <p className="font-medium">
                                    Total: {formatCurrency(session.totalPrice)}
                                  </p>
                                  {isPaid ? (
                                    <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Pago</Badge>
                                  ) : (
                                    <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">Pendente</Badge>
                                  )}
                                </div>
                                <p className="text-sm">
                                  Pago: {formatCurrency(session.amountPaid)}
                                </p>
                                {!isPaid && (
                                  <p className="text-sm text-yellow-600 font-medium">
                                    Pendente: {formatCurrency(remaining)}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            </TabsContent>
            
          {/* Relatórios Tab */}
          <TabsContent value="reports">
            <Card>
              <CardHeader>
                <CardTitle>Relatórios Financeiros</CardTitle>
                <CardDescription>
                  Análises detalhadas do seu desempenho financeiro
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Comparação de Desempenho */}
                <PerformanceComparison 
                  transactions={transactions || []}
                  sessions={sessions || []}
                />
                
                {/* Análise de Tendências */}
                <div className="mt-8">
                  <h3 className="text-base font-medium mb-4">Análise de Tendências</h3>
                  <Card>
                    <CardContent className="p-6">
                      <TrendAnalysisChart 
                        transactions={transactions || []}
                        sessions={sessions || []}
                        months={12}
                      />
                    </CardContent>
                  </Card>
                </div>
                
                {/* Gráficos de Análise */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Despesas por Categoria</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ExpenseCategoryChart transactions={filteredTransactions} />
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Projeção de Receita</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex flex-col">
                          <span className="text-muted-foreground text-sm">Receita Atual</span>
                          <span className="text-2xl font-bold text-green-600">{formatCurrency(calculateFinancialSummary.income)}</span>
                        </div>
                        
                        <div className="flex flex-col">
                          <span className="text-muted-foreground text-sm">Valor Pendente</span>
                          <span className="text-2xl font-bold text-yellow-600">{formatCurrency(calculateFinancialSummary.pending)}</span>
                        </div>
                        
                        <div className="flex flex-col">
                          <span className="text-muted-foreground text-sm">Previsão de Receita</span>
                          <span className="text-2xl font-bold text-blue-600">{formatCurrency(calculateFinancialSummary.upcoming)}</span>
                        </div>
                        
                        <div className="flex flex-col pt-3 border-t">
                          <span className="text-muted-foreground text-sm">Projeção Total</span>
                          <span className="text-2xl font-bold text-indigo-600">
                            {formatCurrency(calculateFinancialSummary.income + calculateFinancialSummary.pending)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                {/* Projeção Financeira */}
                <div className="mt-8">
                  <FinancialProjection 
                    transactions={transactions || []}
                    sessions={sessions || []}
                  />
                </div>
                
                {/* Detalhamento de Receitas */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Detalhamento de Receitas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Receitas provenientes de transações registradas */}
                      <div className="flex justify-between items-center p-3 bg-green-50 rounded-md border border-green-100">
                        <div>
                          <p className="font-medium">Transações registradas</p>
                          <p className="text-sm text-muted-foreground">Receitas registradas manualmente</p>
                        </div>
                        <p className="text-xl font-bold text-green-600">
                          {formatCurrency(
                            filteredTransactions 
                              .filter(t => t.type === 'income')
                              .reduce((sum, t) => sum + t.amount, 0)
                          )}
                        </p>
                      </div>
                      
                      {/* Receitas provenientes de sessões pagas */}
                      <div className="flex justify-between items-center p-3 bg-blue-50 rounded-md border border-blue-100">
                        <div>
                          <p className="font-medium">Pagamentos de sessões</p>
                          <p className="text-sm text-muted-foreground">Sessões com pagamentos recebidos</p>
                        </div>
                        <p className="text-xl font-bold text-blue-600">
                          {formatCurrency(
                            sessionIncome
                          )}
                        </p>
                      </div>
                      
                      {/* Total de receitas */}
                      <div className="flex justify-between items-center p-3 mt-2 bg-indigo-50 rounded-md border border-indigo-100">
                        <div>
                          <p className="font-medium">Total de receitas</p>
                          <p className="text-sm text-muted-foreground">Soma de todas as receitas</p>
                        </div>
                        <p className="text-xl font-bold text-indigo-600">
                          {formatCurrency(calculateFinancialSummary.income)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
            </TabsContent>
          </Tabs>
      </div>
    </div>
  );
};

export default PhotographerFinances;
