import { Card, CardContent } from '@/components/ui/card';
import { ArrowUpIcon, ArrowDownIcon, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import ReviewsModal from './reviews-modal';
import { convertCentsToDecimal } from '@/lib/formatters';

// Definir a interface Review para usar no componente
interface Review {
  id: number;
  sessionId: number;
  reviewerId: number;
  photographerId: number;
  rating: number;
  qualityRating: number;
  professionalismRating: number;
  comment?: string | null;
  createdAt: string;
}

interface StatsOverviewProps {
  monthlyIncome: number;
  previousMonthIncome: number;
  upcomingSessions: number;
  averageRating: number;
  averageQualityRating: number;
  averageProfessionalismRating: number;
  reviewCount: number;
  conversionRate: number;
  totalRequests: number;
  reviews?: Review[];
}

const StatsOverview: React.FC<StatsOverviewProps> = ({
  monthlyIncome,
  previousMonthIncome,
  upcomingSessions,
  averageRating,
  averageQualityRating,
  averageProfessionalismRating,
  reviewCount,
  conversionRate,
  totalRequests,
  reviews = [],
}) => {
  const [showReviewsModal, setShowReviewsModal] = useState(false);
  
  // Debug: Log valores importantes para verificar
  useEffect(() => {
    console.log('StatsOverview - reviewCount:', reviewCount);
    console.log('StatsOverview - reviews.length:', reviews.length);
    console.log('StatsOverview - averageRating:', averageRating);
  }, [reviewCount, reviews, averageRating]);
  
  const incomeChange = monthlyIncome - previousMonthIncome;
  const percentChange = previousMonthIncome > 0 
    ? Math.round((incomeChange / previousMonthIncome) * 100) 
    : 0;
  
  const formatCurrency = (amountInCents: number) => {
    // Converter centavos para reais ANTES de formatar
    const amountInReais = convertCentsToDecimal(amountInCents);
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amountInReais);
  };

  // Function to render stars based on rating
  const renderStars = (rating: number) => {
    // Se não houver avaliações, não mostrar estrelas
    if (rating === 0) {
      return Array(5).fill(0).map((_, i) => (
        <Star key={`empty-${i}`} className="h-4 w-4 text-gray-300" />
      ));
    }
    
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    
    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Star key={`full-${i}`} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
      );
    }
    
    if (hasHalfStar) {
      stars.push(
        <div key="half" className="relative">
          <Star className="h-4 w-4 text-gray-300" />
          <div className="absolute inset-0 overflow-hidden w-1/2">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
          </div>
        </div>
      );
    }
    
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <Star key={`empty-${i}`} className="h-4 w-4 text-gray-300" />
      );
    }
    
    return stars;
  };

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Monthly Revenue Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-3">
              <p className="text-muted-foreground font-medium">Receita Mensal</p>
              {percentChange !== 0 && (
                <span 
                  className={`text-xs font-medium px-2 py-1 rounded flex items-center ${
                    percentChange >= 0 
                      ? 'text-green-700 bg-green-100' 
                      : 'text-red-700 bg-red-100'
                  }`}
                >
                  {percentChange >= 0 ? (
                    <ArrowUpIcon className="h-3 w-3 mr-1" />
                  ) : (
                    <ArrowDownIcon className="h-3 w-3 mr-1" />
                  )}
                  {Math.abs(percentChange)}%
                </span>
              )}
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(monthlyIncome)}</p>
            <p className="text-sm text-muted-foreground mt-1">
              vs {formatCurrency(previousMonthIncome)} mês anterior
            </p>
          </CardContent>
        </Card>

        {/* Upcoming Sessions Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-3">
              <p className="text-muted-foreground font-medium">Sessões Agendadas</p>
              {upcomingSessions > 0 && (
                <span className="text-green-700 bg-green-100 text-xs font-medium px-2 py-1 rounded">
                  +{upcomingSessions}
                </span>
              )}
            </div>
            <p className="text-2xl font-bold text-gray-900">{upcomingSessions}</p>
            <p className="text-sm text-muted-foreground mt-1">próximos 30 dias</p>
          </CardContent>
        </Card>

        {/* Average Rating Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-3">
              <p className="text-muted-foreground font-medium">Avaliação Geral</p>
              {reviewCount > 0 && (
                <span className="text-yellow-700 bg-yellow-100 text-xs font-medium px-2 py-1 rounded">
                  {reviewCount} {reviewCount === 1 ? 'avaliação' : 'avaliações'}
                </span>
              )}
            </div>
            <div className="flex items-center">
              <p className="text-2xl font-bold text-gray-900 mr-2">{averageRating.toFixed(1)}</p>
              <div className="flex">
                {renderStars(averageRating)}
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {reviewCount > 0 
                ? `média de ${reviewCount} ${reviewCount === 1 ? 'avaliação' : 'avaliações'}`
                : 'sem avaliações'}
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-3 w-full"
              onClick={() => setShowReviewsModal(true)}
            >
              Ver detalhes
            </Button>
          </CardContent>
        </Card>

        {/* Acceptance Rate Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-3">
              <p className="text-muted-foreground font-medium">Taxa de Aceitação</p>
              {/* Pode adicionar um ícone ou indicador aqui se desejar */}
            </div>
            <p className="text-2xl font-bold text-gray-900">{conversionRate.toFixed(1)}%</p>
            <p className="text-sm text-muted-foreground mt-1">
              de {totalRequests} {totalRequests === 1 ? 'solicitação' : 'solicitações'}
            </p>
            {/* Pode adicionar um botão ou link aqui se desejar */}
          </CardContent>
        </Card>
      </div>

      {/* Reviews Modal */}
      <ReviewsModal 
        open={showReviewsModal} 
        onOpenChange={setShowReviewsModal}
        averageRating={averageRating}
        averageQualityRating={averageQualityRating}
        averageProfessionalismRating={averageProfessionalismRating}
        reviewCount={reviewCount}
        reviews={reviews}
      />
    </>
  );
};

export default StatsOverview;
