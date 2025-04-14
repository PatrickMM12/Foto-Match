'use client';

import { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, Edit, Trash } from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';

export interface Transaction {
  id: string;
  description: string;
  amount: number; // armazenado em centavos
  date: Date;
  category: string;
  type: string;
  notes?: string;
}

interface TransactionsTableProps {
  transactions: Transaction[];
  onEdit?: (transaction: Transaction) => void;
  onDelete?: (id: string) => void;
}

// Categorias de transação
const transactionCategories = {
  session: 'Sessão Fotográfica',
  equipment: 'Equipamento',
  subscription: 'Assinatura',
  service: 'Serviço',
  utility: 'Utilidade',
  tax: 'Imposto',
  office: 'Material de Escritório',
  transport: 'Transporte',
  marketing: 'Marketing',
  other: 'Outro',
};

export default function TransactionsTable({ 
  transactions, 
  onEdit, 
  onDelete 
}: TransactionsTableProps) {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Transaction;
    direction: 'asc' | 'desc';
  }>({ key: 'date', direction: 'desc' });

  // Função para formatação de data
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date instanceof Date ? date : new Date(date));
  };

  // Função para formatação de valor monetário
  const formatCurrency = (amount: number) => {
    const absAmount = Math.abs(amount / 100); // converter centavos para reais
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(absAmount);
  };

  // Ordenação de transações
  const requestSort = (key: keyof Transaction) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Filtrar e ordenar transações
  const filteredAndSortedTransactions = useMemo(() => {
    let filtered = [...transactions];

    // Filtrar por termo de busca
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        transaction =>
          transaction.description.toLowerCase().includes(searchLower) ||
          transaction.notes?.toLowerCase().includes(searchLower)
      );
    }

    // Filtrar por tipo (receita/despesa/todos)
    if (filterType !== 'all') {
      filtered = filtered.filter(transaction => transaction.type === filterType);
    }

    // Filtrar por categoria
    if (filterCategory !== 'all') {
      filtered = filtered.filter(transaction => transaction.category === filterCategory);
    }

    // Ordenar
    return filtered.sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [transactions, search, filterType, filterCategory, sortConfig]);

  // Verificar se não há transações para exibir
  const noTransactions = filteredAndSortedTransactions.length === 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transações Financeiras</CardTitle>
        <CardDescription>
          Histórico completo de receitas e despesas
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Filtros e busca */}
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              placeholder="Buscar transações..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />
            <div className="flex gap-2">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Todos os tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="income">Receitas</SelectItem>
                  <SelectItem value="expense">Despesas</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Todas as categorias" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as categorias</SelectItem>
                  {Object.entries(transactionCategories).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tabela de transações */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="cursor-pointer"
                    onClick={() => requestSort('date')}
                  >
                    <div className="flex items-center">
                      Data 
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer"
                    onClick={() => requestSort('description')}
                  >
                    <div className="flex items-center">
                      Descrição
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead 
                    className="text-right cursor-pointer"
                    onClick={() => requestSort('amount')}
                  >
                    <div className="flex items-center justify-end">
                      Valor
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </div>
                  </TableHead>
                  {(onEdit || onDelete) && <TableHead className="w-[100px]">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {noTransactions ? (
                  <TableRow>
                    <TableCell colSpan={onEdit || onDelete ? 5 : 4} className="h-24 text-center">
                      Nenhuma transação encontrada.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAndSortedTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="whitespace-nowrap">
                        {formatDate(transaction.date)}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{transaction.description}</div>
                        {transaction.notes && (
                          <div className="text-sm text-muted-foreground">{transaction.notes}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        {transactionCategories[transaction.category as keyof typeof transactionCategories] || transaction.category}
                      </TableCell>
                      <TableCell className={`text-right font-medium ${
                        transaction.amount > 0 ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {transaction.amount > 0 ? '+' : ''}{formatCurrency(transaction.amount)}
                      </TableCell>
                      {(onEdit || onDelete) && (
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            {onEdit && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => onEdit(transaction)}
                              >
                                <Edit className="h-4 w-4" />
                                <span className="sr-only">Editar</span>
                              </Button>
                            )}
                            {onDelete && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => onDelete(transaction.id)}
                              >
                                <Trash className="h-4 w-4" />
                                <span className="sr-only">Excluir</span>
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
  // Função para ordenar transações
  const sortedTransactions = React.useMemo(() => {
    let sortableTransactions = [...transactions];
    
    if (sortConfig.key !== null) {
      sortableTransactions.sort((a, b) => {
        if (a[sortConfig.key!] < b[sortConfig.key!]) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (a[sortConfig.key!] > b[sortConfig.key!]) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableTransactions;
  }, [transactions, sortConfig]);

  // Função para solicitar ordenação
  const requestSort = (key: keyof Transaction) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  // Filtrar transações
  const filteredTransactions = React.useMemo(() => {
    return sortedTransactions.filter(transaction => {
      // Filtro por tipo
      const typeMatch = filterType === 'all' || transaction.type === filterType;
      
      // Filtro por categoria
      const categoryMatch = filterCategory === 'all' || transaction.category === filterCategory;
      
      // Filtro por termo de busca
      const searchMatch = 
        transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.category.toLowerCase().includes(searchTerm.toLowerCase());
      
      return typeMatch && categoryMatch && searchMatch;
    });
  }, [sortedTransactions, filterType, filterCategory, searchTerm]);

  // Extrair categorias únicas para o filtro
  const uniqueCategories = React.useMemo(() => {
    const categories = new Set<string>();
    transactions.forEach(t => categories.add(t.category));
    return Array.from(categories).sort();
  }, [transactions]);

  // Paginação
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const paginatedTransactions = React.useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return filteredTransactions.slice(start, end);
  }, [filteredTransactions, currentPage, itemsPerPage]);

  // Renderizar páginas
  const renderPagination = () => {
    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
      pages.push(
        <PaginationItem key={i}>
          <PaginationLink
            onClick={() => setCurrentPage(i)}
            isActive={currentPage === i}
          >
            {i}
          </PaginationLink>
        </PaginationItem>
      );
    }
    return pages;
  };

  // Cabeçalho da tabela com capacidade de ordenação
  const renderHeaderCell = (key: keyof Transaction, label: string) => {
    return (
      <TableHead 
        className="cursor-pointer hover:bg-muted/50" 
        onClick={() => requestSort(key)}
      >
        <div className="flex items-center space-x-1">
          <span>{label}</span>
          {sortConfig.key === key && (
            <span>{sortConfig.direction === 'ascending' ? '↑' : '↓'}</span>
          )}
        </div>
      </TableHead>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
        <div className="flex-1">
          <Input
            placeholder="Buscar transações..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>
        <div className="flex gap-4">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar por tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="income">Receitas</SelectItem>
              <SelectItem value="expense">Despesas</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar por categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              {uniqueCategories.map(category => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Data</TableHead>
              {renderHeaderCell('description', 'Descrição')}
              {renderHeaderCell('category', 'Categoria')}
              {renderHeaderCell('type', 'Tipo')}
              {renderHeaderCell('amount', 'Valor')}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedTransactions.length > 0 ? (
              paginatedTransactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell className="font-medium">
                    {formatDate(transaction.date)}
                  </TableCell>
                  <TableCell>{transaction.description}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{transaction.category}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={transaction.type === 'income' ? 'default' : 'destructive'}
                      className={transaction.type === 'income' ? 'bg-green-100 text-green-800 hover:bg-green-100' : 'bg-red-100 text-red-800 hover:bg-red-100'}
                    >
                      {transaction.type === 'income' ? 'Receita' : 'Despesa'}
                    </Badge>
                  </TableCell>
                  <TableCell 
                    className={`font-medium ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}
                  >
                    {transaction.type === 'income' ? '+' : '-'} {formatCurrency(Math.abs(transaction.amount))}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Nenhuma transação encontrada para os filtros selecionados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                aria-disabled={currentPage === 1}
                className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
              />
            </PaginationItem>
            
            {renderPagination()}
            
            <PaginationItem>
              <PaginationNext
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                aria-disabled={currentPage === totalPages}
                className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
      
      <div className="text-sm text-muted-foreground">
        Exibindo {paginatedTransactions.length} de {filteredTransactions.length} transações
      </div>
    </div>
  );
};

export default TransactionsTable; 