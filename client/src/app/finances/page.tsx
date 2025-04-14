'use client';

import { useState } from 'react';
import { Plus, ArrowUpCircle, ArrowDownCircle, Wallet, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import TransactionsTable from '@/components/finances/transactions-table';
import TransactionForm from '@/components/finances/transaction-form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Dados de exemplo para desenvolvimento - substitua pela API real
const mockTransactions = [
  {
    id: '1',
    description: 'Sessão fotográfica casamento',
    amount: 150000, // 1500.00 em centavos
    date: new Date(2023, 5, 15),
    category: 'session',
    type: 'income',
    notes: 'Casamento da Ana e João',
  },
  {
    id: '2',
    description: 'Compra de lente 50mm',
    amount: -40000, // -400.00 em centavos
    date: new Date(2023, 5, 10),
    category: 'equipment',
    type: 'expense',
    notes: 'Lente para retratos',
  },
  {
    id: '3',
    description: 'Ensaio de família',
    amount: 35000, // 350.00 em centavos
    date: new Date(2023, 5, 20),
    category: 'session',
    type: 'income',
    notes: 'Família Silva',
  },
  {
    id: '4',
    description: 'Assinatura Lightroom',
    amount: -9900, // -99.00 em centavos
    date: new Date(2023, 5, 5),
    category: 'subscription',
    type: 'expense',
    notes: 'Pagamento mensal',
  },
  {
    id: '5',
    description: 'Sessão corporativa',
    amount: 200000, // 2000.00 em centavos
    date: new Date(2023, 5, 25),
    category: 'session',
    type: 'income',
    notes: 'Empresa ABC',
  },
];

export default function FinancesPage() {
  const [transactions, setTransactions] = useState(mockTransactions);
  const [isAddingTransaction, setIsAddingTransaction] = useState(false);

  // Calcular valores resumidos
  const totalIncome = transactions
    .filter(t => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0) / 100;
  
  const totalExpense = Math.abs(transactions
    .filter(t => t.amount < 0)
    .reduce((sum, t) => sum + t.amount, 0)) / 100;
  
  const balance = totalIncome - totalExpense;

  // Lidar com nova transação
  const handleAddTransaction = (data: any) => {
    // Converter para centavos e ajustar sinal para despesas
    const amountInCents = Math.round(parseFloat(data.amount) * 100);
    const finalAmount = data.type === 'expense' ? -Math.abs(amountInCents) : Math.abs(amountInCents);
    
    const newTransaction = {
      id: Date.now().toString(),
      description: data.description,
      amount: finalAmount,
      date: data.date,
      category: data.category,
      type: data.type,
      notes: data.notes || '',
    };
    
    setTransactions([newTransaction, ...transactions]);
    setIsAddingTransaction(false);
    
    // Aqui você faria a chamada API para salvar no banco de dados
    console.log('Nova transação adicionada:', newTransaction);
  };

  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Controle Financeiro</h1>
        <Button 
          onClick={() => setIsAddingTransaction(true)}
          className="flex items-center"
        >
          <Plus className="mr-2 h-4 w-4" />
          Nova Transação
        </Button>
      </div>

      {/* Dashboard de resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receitas</CardTitle>
            <ArrowUpCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              R$ {totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              Total de entradas
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Despesas</CardTitle>
            <ArrowDownCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              R$ {totalExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              Total de saídas
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo</CardTitle>
            <Wallet className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${balance >= 0 ? 'text-blue-500' : 'text-red-500'}`}>
              R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              Receitas - Despesas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs para diferentes visualizações */}
      <Tabs defaultValue="transactions" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="transactions">Transações</TabsTrigger>
          <TabsTrigger value="analytics">Análises</TabsTrigger>
        </TabsList>
        <TabsContent value="transactions">
          <TransactionsTable transactions={transactions} />
        </TabsContent>
        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>Análise Financeira</CardTitle>
              <CardDescription>
                Visualização de tendências e análises de suas finanças
              </CardDescription>
            </CardHeader>
            <CardContent className="h-96 flex items-center justify-center">
              <div className="text-center">
                <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-medium">Análises em breve</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Estamos trabalhando em visualizações e análises para ajudar você a entender melhor suas finanças.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Formulário de adicionar transação */}
      <TransactionForm
        onSubmit={handleAddTransaction}
        isOpen={isAddingTransaction}
        onOpenChange={setIsAddingTransaction}
      />
    </div>
  );
} 