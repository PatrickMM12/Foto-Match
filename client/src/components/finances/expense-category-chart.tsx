import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

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

interface ExpenseCategoryChartProps {
  transactions: Transaction[];
}

// Cores para as diferentes categorias
const COLORS = [
  '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
  '#FF9F40', '#2E7D32', '#C2185B', '#7B1FA2', '#1565C0'
];

const ExpenseCategoryChart: React.FC<ExpenseCategoryChartProps> = ({ transactions }) => {
  const categoryData = useMemo(() => {
    // Filtrar apenas despesas
    const expenses = transactions.filter(t => t.type === 'expense');
    
    // Agrupar por categoria e somar valores
    const categories: Record<string, number> = {};
    
    expenses.forEach(expense => {
      const category = expense.category;
      if (!categories[category]) {
        categories[category] = 0;
      }
      categories[category] += Math.abs(expense.amount);
    });
    
    // Converter para formato adequado para o gráfico
    const data = Object.entries(categories).map(([name, value]) => ({
      name,
      value
    }));
    
    // Ordenar por valor (do maior para o menor)
    return data.sort((a, b) => b.value - a.value);
  }, [transactions]);
  
  // Formatar valor monetário
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };
  
  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-md shadow-md">
          <p className="font-medium">{payload[0].name}</p>
          <p className="text-gray-900">{formatCurrency(payload[0].value)}</p>
          <p className="text-sm text-gray-500">
            {(payload[0].payload.percent * 100).toFixed(1)}% do total
          </p>
        </div>
      );
    }
    return null;
  };
  
  // Se não houver dados, mostrar mensagem
  if (categoryData.length === 0) {
    return (
      <div className="flex justify-center items-center h-[250px]">
        <p className="text-muted-foreground">Sem dados de despesas para exibir</p>
      </div>
    );
  }
  
  // Calcular total de despesas
  const totalExpenses = categoryData.reduce((sum, item) => sum + item.value, 0);
  
  // Adicionar percentual para cada categoria
  const dataWithPercent = categoryData.map(item => ({
    ...item,
    percent: item.value / totalExpenses
  }));
  
  return (
    <div className="h-[250px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={dataWithPercent}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {dataWithPercent.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            layout="vertical" 
            verticalAlign="middle" 
            align="right"
            formatter={(value, entry, index) => {
              return (
                <span className="text-sm">
                  {value}: {formatCurrency(dataWithPercent[index]?.value || 0)}
                </span>
              );
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ExpenseCategoryChart; 