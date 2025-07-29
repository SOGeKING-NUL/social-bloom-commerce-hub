import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import StarRating from './StarRating';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle } from 'lucide-react';

interface ReviewFormProps {
  productId: string;
  onSuccess?: () => void;
}

const ReviewForm: React.FC<ReviewFormProps> = ({ productId, onSuccess }) => {
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check if user has already reviewed this product
  const { data: existingReview } = useQuery({
    queryKey: ['user-review', productId, user?.id],
    queryFn: async () => {
      if (!user || !productId) return null;
      
      const { data, error } = await supabase
        .from('product_reviews')
        .select('id, rating, review_text, created_at')
        .eq('product_id', productId)
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!productId,
  });

  const submitReviewMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('User not authenticated');
      if (rating === 0) throw new Error('Please select a rating');
      if (!reviewText.trim()) throw new Error('Please write a review');

      const { error } = await supabase
        .from('product_reviews')
        .insert({
          product_id: productId,
          user_id: user.id,
          rating,
          review_text: reviewText.trim()
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Review submitted successfully!',
        description: 'Thank you for your review.',
      });
      setRating(0);
      setReviewText('');
      queryClient.invalidateQueries({ queryKey: ['product-reviews', productId] });
      queryClient.invalidateQueries({ queryKey: ['product-rating', productId] });
      queryClient.invalidateQueries({ queryKey: ['user-review', productId, user?.id] });
      onSuccess?.();
    },
    onError: (error: Error) => {
      // Check if it's a duplicate review error
      if (error.message.includes('duplicate key value violates unique constraint') || 
          error.message.includes('product_reviews_product_id_user_id_key')) {
        toast({
          title: 'Already reviewed',
          description: 'You have already submitted a review for this product.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error submitting review',
          description: error.message,
          variant: 'destructive',
        });
      }
    },
    onSettled: () => {
      setIsSubmitting(false);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    submitReviewMutation.mutate();
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-gray-500">
            Please log in to write a review.
          </p>
        </CardContent>
      </Card>
    );
  }

  // If user has already reviewed, show a banner
  if (existingReview) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Write a Review</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              You have already submitted a review for this product. Thank you for your feedback!
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Write a Review</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rating
            </label>
            <StarRating
              rating={rating}
              interactive={true}
              onRatingChange={setRating}
              size="lg"
            />
          </div>
          
          <div>
            <label htmlFor="review-text" className="block text-sm font-medium text-gray-700 mb-2">
              Review
            </label>
            <Textarea
              id="review-text"
              placeholder="Share your experience with this product..."
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              rows={4}
              className="resize-none"
              required
            />
          </div>
          
          <Button
            type="submit"
            disabled={rating === 0 || !reviewText.trim() || isSubmitting}
            className="w-full"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Review'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default ReviewForm; 