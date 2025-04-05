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
import { PlusCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const PhotographerFinances = () => {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Fetch transactions data
  const { data: transactions, isLoading } = useQuery({
    queryKey: ['/api/transactions'],
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
    if (!transactions) return { income: 0, expenses: 0, balance: 0 };
    
    const income = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const expenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
    return {
      income,
      expenses,
      balance: income - expenses
    };
  };
  
  const summary = calculateFinancialSummary();
  
  const handleSubmitTransaction = (data: any) => {
    createTransactionMutation.mutate(data);
  };
  
  if (isLoading) {
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
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Receitas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                R$ {(summary.income / 100).toFixed(2).replace('.', ',')}
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
                R$ {(summary.expenses / 100).toFixed(2).replace('.', ',')}
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
                R$ {(summary.balance / 100).toFixed(2).replace('.', ',')}
              </div>
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
                <FinancialChart transactions={transactions} />
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
              </TabsList>
            </div>
            
            <TabsContent value="all" className="mt-4">
              <TransactionList transactions={transactions} />
            </TabsContent>
            
            <TabsContent value="income" className="mt-4">
              <TransactionList 
                transactions={transactions?.filter(t => t.type === 'income')} 
              />
            </TabsContent>
            
            <TabsContent value="expense" className="mt-4">
              <TransactionList 
                transactions={transactions?.filter(t => t.type === 'expense')} 
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default PhotographerFinances;
