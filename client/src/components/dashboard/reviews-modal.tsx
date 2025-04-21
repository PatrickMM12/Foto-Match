import React from 'react';
import { Star } from 'lucide-react';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';

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

interface ReviewsModalProps {
  reviews?: Review[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  averageRating: number;
  averageQualityRating: number;
  averageProfessionalismRating: number;
  reviewCount: number;
}

const ReviewsModal: React.FC<ReviewsModalProps> = ({
  reviews = [], // Valor padrão para evitar erros
  open,
  onOpenChange,
  averageRating,
  averageQualityRating,
  averageProfessionalismRating,
  reviewCount
}) => {
  // Formata a data no padrão brasileiro
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }).format(date);
    } catch (error) {
      console.error('Erro ao formatar data:', error);
      return 'Data inválida';
    }
  };

  // Function to render stars based on rating
  const renderStars = (rating: number) => {
    // Garantir que rating seja um número válido
    const validRating = typeof rating === 'number' && !isNaN(rating) ? rating : 0;
    
    // Se não houver avaliações, não mostrar estrelas
    if (validRating === 0) {
      return Array(5).fill(0).map((_, i) => (
        <Star key={`empty-${i}`} className="h-4 w-4 text-gray-300" />
      ));
    }
    
    const stars = [];
    const fullStars = Math.floor(validRating);
    const hasHalfStar = validRating % 1 !== 0;
    
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
    
    const emptyStars = 5 - Math.ceil(validRating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <Star key={`empty-${i}`} className="h-4 w-4 text-gray-300" />
      );
    }
    
    return stars;
  };

  // Garantir que as reviews são um array válido
  const validReviews = Array.isArray(reviews) ? reviews : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Suas avaliações</DialogTitle>
          <DialogDescription>
            Veja o que seus clientes estão falando sobre seu trabalho
          </DialogDescription>
        </DialogHeader>

        {/* Estatísticas gerais */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-4">
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <h3 className="font-medium text-gray-700 mb-2">Avaliação Geral</h3>
            <div className="flex items-center">
              <span className="text-2xl font-bold mr-2">{averageRating.toFixed(1)}</span>
              <div className="flex">{renderStars(averageRating)}</div>
            </div>
            <div className="text-sm text-gray-500 mt-1">
              {reviewCount} {reviewCount === 1 ? 'avaliação' : 'avaliações'}
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <h3 className="font-medium text-gray-700 mb-2">Qualidade</h3>
            <div className="flex items-center">
              <span className="text-2xl font-bold mr-2">{averageQualityRating.toFixed(1)}</span>
              <div className="flex">{renderStars(averageQualityRating)}</div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <h3 className="font-medium text-gray-700 mb-2">Profissionalismo</h3>
            <div className="flex items-center">
              <span className="text-2xl font-bold mr-2">{averageProfessionalismRating.toFixed(1)}</span>
              <div className="flex">{renderStars(averageProfessionalismRating)}</div>
            </div>
          </div>
        </div>

        {/* Lista de avaliações */}
        <div className="mt-6">
          <h3 className="font-semibold text-lg mb-3">Feedback dos clientes</h3>
          
          {validReviews.length === 0 ? (
            <p className="text-center py-8 text-gray-500">Você ainda não recebeu avaliações.</p>
          ) : (
            <div className="space-y-4">
              {validReviews.map((review) => (
                <div key={review.id} className="bg-gray-50 p-4 rounded-lg border">
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col">
                      <div className="flex mb-1">{renderStars(review.rating)}</div>
                      <span className="text-sm text-gray-500">
                        {formatDate(review.createdAt)}
                      </span>
                    </div>
                    <div className="flex space-x-3">
                      <div className="flex flex-col items-center">
                        <span className="text-xs text-gray-500">Qualidade</span>
                        <span className="font-semibold">{review.qualityRating || 0}/5</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="text-xs text-gray-500">Profissionalismo</span>
                        <span className="font-semibold">{review.professionalismRating || 0}/5</span>
                      </div>
                    </div>
                  </div>
                  {review.comment && (
                    <div className="mt-3 text-gray-700">
                      <p>"{review.comment}"</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReviewsModal; 