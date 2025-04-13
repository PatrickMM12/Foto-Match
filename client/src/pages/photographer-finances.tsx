import { useQuery, useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

import PhotographerSidebar from '@/components/layout/photographer-sidebar';
import PageTitle from '@/components/shared/page-title';
import LoadingSpinner from '@/components/shared/loading-spinner';
import TransactionForm from '@/components/finances/transaction-form';
import TransactionList from '@/components/finances/transaction-list';
import FinancialChart from '@/components/dashboard/financial-chart';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { PlusCircle, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

// Interfaces para tipagem
interface Transaction {
  id: number;
  userId: number;
  sessionId?: number;
  amount: number;
  description: string;
  category: string;
  date: string;
  type: 'income' | 'expense';
  photographerId?: number;
  createdAt?: string;
}

interface Session {
  id: number;
  title: string;
  clientName?: string;
  date: string;
  totalPrice: number;
  amountPaid: number;
  paymentStatus: string;
  status: string;
}

const PhotographerFinances = () => {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
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
  
  const calculateFinancialSummary = () => {
    if (!transactions) return { income: 0, expenses: 0, balance: 0, pending: 0 };
    
    const income = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const expenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
    // Calcular valores pendentes das sessões
    const pendingAmount = sessions
      ?.filter(s => s.status === 'completed' || s.status === 'confirmed')
      .reduce((sum, s) => {
        // Os valores totalPrice e amountPaid já estão em reais, não é necessário dividir por 100
        const remaining = s.totalPrice - s.amountPaid;
        return sum + (remaining > 0 ? remaining : 0);
      }, 0) || 0;
    
    return {
      income,
      expenses,
      balance: income - expenses,
      pending: pendingAmount
    };
  };
  
  const summary = calculateFinancialSummary();
  
  const handleSubmitTransaction = (data: any) => {
    createTransactionMutation.mutate(data);
  };

  // Função para converter sessão concluída em transação
  const createSessionTransaction = (session: Session) => {
    const transactionData = {
      amount: session.amountPaid, // Valor já está em reais, não é necessário converter
      description: `Pagamento da sessão: ${session.title}`,
      category: 'Sessão Fotográfica',
      date: new Date(),
      type: 'income',
      sessionId: session.id
    };
    
    createTransactionMutation.mutate(transactionData);
  };
  
  // Filtrar sessões concluídas que ainda não têm transações associadas
  const completedSessionsWithoutTransactions = sessions
    ?.filter(session => 
      session.status === 'completed' && 
      session.amountPaid > 0 && 
      !transactions?.some(t => t.sessionId === session.id)
    ) || [];
  
  if (isLoadingTransactions || isLoadingSessions) {
    return <LoadingSpinner />;
  }
  
  return (
    <div className="flex min-h-screen bg-gray-50">
      <PhotographerSidebar />
      <div className="flex-1 p-8">
        <div className="flex justify-between items-center">
          <PageTitle title="Finanças" />
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Nova Transação
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Registrar nova transação</DialogTitle>
              </DialogHeader>
              <TransactionForm onSubmit={handleSubmitTransaction} isLoading={createTransactionMutation.isPending} />
            </DialogContent>
          </Dialog>
        </div>
        
        {/* Exibir alerta para sessões concluídas sem transações */}
        {completedSessionsWithoutTransactions.length > 0 && (
          <Card className="mt-6 border-yellow-300 bg-yellow-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <AlertCircle className="h-4 w-4 mr-2 text-yellow-600" />
                Sessões concluídas sem registro financeiro
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {completedSessionsWithoutTransactions.map(session => (
                  <div key={session.id} className="flex justify-between items-center border-b pb-2">
                    <div>
                      <p className="font-medium">{session.title}</p>
                      <p className="text-sm text-muted-foreground">
                        Cliente: {session.clientName || `ID: ${session.id}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="font-medium">
                        R$ {(session.amountPaid).toFixed(2).replace('.', ',')}
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
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Receitas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                R$ {summary.income.toFixed(2).replace('.', ',')}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Despesas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                R$ {summary.expenses.toFixed(2).replace('.', ',')}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Saldo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${summary.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                R$ {summary.balance.toFixed(2).replace('.', ',')}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Valores Pendentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                R$ {summary.pending.toFixed(2).replace('.', ',')}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Pagamentos pendentes de sessões
              </p>
            </CardContent>
          </Card>
        </div>
        
        <div className="grid grid-cols-1 gap-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Análise Financeira</CardTitle>
              <CardDescription>
                Visualização das suas receitas e despesas ao longo do tempo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <FinancialChart transactions={transactions || []} />
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="mt-6">
          <Tabs defaultValue="all">
            <div className="flex items-center justify-between">
              <TabsList>
                <TabsTrigger value="all">Todas</TabsTrigger>
                <TabsTrigger value="income">Receitas</TabsTrigger>
                <TabsTrigger value="expense">Despesas</TabsTrigger>
                <TabsTrigger value="sessions">Sessões</TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="all" className="mt-4">
              <TransactionList transactions={transactions || []} />
            </TabsContent>
            
            <TabsContent value="income" className="mt-4">
              <TransactionList 
                transactions={transactions?.filter(t => t.type === 'income') || []} 
              />
            </TabsContent>
            
            <TabsContent value="expense" className="mt-4">
              <TransactionList 
                transactions={transactions?.filter(t => t.type === 'expense') || []} 
              />
            </TabsContent>
            
            <TabsContent value="sessions" className="mt-4">
              <div className="rounded-md border">
                <div className="p-4">
                  <h3 className="text-lg font-semibold">Pagamentos de Sessões</h3>
                  <p className="text-sm text-muted-foreground">
                    Listagem de pagamentos e valores pendentes das sessões
                  </p>
                </div>
                <div className="divide-y">
                  {sessions?.filter(s => s.status === 'completed' || s.status === 'confirmed').map(session => {
                    const isPaid = session.amountPaid >= session.totalPrice;
                    const remaining = session.totalPrice - session.amountPaid;
                    
                    return (
                      <div key={session.id} className="flex justify-between items-center p-4">
                        <div>
                          <h4 className="font-medium">{session.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            Cliente: {session.clientName || `ID: ${session.id}`}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Status: {session.status === 'completed' ? 'Concluída' : 'Confirmada'}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">
                              Total: R$ {(session.totalPrice).toFixed(2).replace('.', ',')}
                            </p>
                            {isPaid ? (
                              <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Pago</Badge>
                            ) : (
                              <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">Pendente</Badge>
                            )}
                          </div>
                          <p className="text-sm">
                            Pago: R$ {(session.amountPaid).toFixed(2).replace('.', ',')}
                          </p>
                          {!isPaid && (
                            <p className="text-sm text-yellow-600 font-medium">
                              Pendente: R$ {(remaining).toFixed(2).replace('.', ',')}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default PhotographerFinances;
