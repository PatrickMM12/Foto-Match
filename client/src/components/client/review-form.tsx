import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Star } from 'lucide-react';

// Rating schema for form validation
const reviewSchema = z.object({
  rating: z.coerce.number().min(1, 'Avaliação geral obrigatória').max(5),
  qualityRating: z.coerce.number().min(1, 'Avaliação de qualidade obrigatória').max(5),
  professionalismRating: z.coerce.number().min(1, 'Avaliação de profissionalismo obrigatória').max(5),
  comment: z.string().optional(),
});

type ReviewFormValues = z.infer<typeof reviewSchema>;

interface ReviewFormProps {
  sessionId: number;
  photographerId: number;
  onReviewSubmitted: () => void;
}

const ReviewForm: React.FC<ReviewFormProps> = ({
  sessionId,
  photographerId,
  onReviewSubmitted,
}) => {
  const { toast } = useToast();
  
  const form = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      rating: 5,
      qualityRating: 5,
      professionalismRating: 5,
      comment: '',
    },
  });

  // Review mutation
  const reviewMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('POST', '/api/reviews', data);
    },
    onSuccess: () => {
      toast({
        title: 'Avaliação enviada',
        description: 'Sua avaliação foi enviada com sucesso.',
      });
      queryClient.invalidateQueries({ queryKey: [`/api/reviews/photographer/${photographerId}`] });
      onReviewSubmitted();
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao enviar avaliação',
        description: error.message || 'Ocorreu um erro ao enviar sua avaliação.',
        variant: 'destructive',
      });
    },
  });

  // Handle form submission
  const onSubmit = (values: ReviewFormValues) => {
    reviewMutation.mutate({
      ...values,
      sessionId,
      photographerId,
    });
  };

  // Star rating component
  const StarRating = ({ 
    rating,
    onChange,
    name,
  }: { 
    rating: number;
    onChange: (rating: number) => void;
    name: string;
  }) => {
    return (
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="focus:outline-none"
          >
            <Star
              className={`h-6 w-6 ${
                star <= rating
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-300'
              }`}
            />
            <span className="sr-only">Avaliação {star} estrelas</span>
          </button>
        ))}
        <input
          type="hidden"
          name={name}
          value={rating}
        />
      </div>
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="rating"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Avaliação Geral</FormLabel>
              <FormControl>
                <StarRating
                  rating={field.value}
                  onChange={field.onChange}
                  name={field.name}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="qualityRating"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Qualidade das Fotos</FormLabel>
              <FormControl>
                <StarRating
                  rating={field.value}
                  onChange={field.onChange}
                  name={field.name}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="professionalismRating"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Profissionalismo</FormLabel>
              <FormControl>
                <StarRating
                  rating={field.value}
                  onChange={field.onChange}
                  name={field.name}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="comment"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Comentários (opcional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Conte sua experiência com este fotógrafo..."
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <Button type="submit" className="w-full" disabled={reviewMutation.isPending}>
          {reviewMutation.isPending ? 'Enviando...' : 'Enviar Avaliação'}
        </Button>
      </form>
    </Form>
  );
};

export default ReviewForm;
