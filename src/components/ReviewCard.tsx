import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { MessageSquare, Send } from 'lucide-react';
import StarRating from './StarRating';
import { formatDistanceToNow } from 'date-fns';

interface ReviewResponse {
  id: string;
  response_text: string;
  created_at: string;
  vendor: {
    full_name: string;
    avatar_url?: string;
  };
}

interface Review {
  id: string;
  rating: number;
  review_text: string;
  created_at: string;
  user: {
    full_name: string;
    avatar_url?: string;
  };
  review_responses?: ReviewResponse[];
}

interface ReviewCardProps {
  review: Review;
  productId: string;
  isVendor: boolean;
}

const ReviewCard: React.FC<ReviewCardProps> = ({ review, productId, isVendor }) => {
  const [showResponseForm, setShowResponseForm] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const submitResponseMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('User not authenticated');
      if (!responseText.trim()) throw new Error('Please write a response');

      const { error } = await supabase
        .from('review_responses')
        .insert({
          review_id: review.id,
          vendor_id: user.id,
          response_text: responseText.trim()
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Response submitted successfully!',
        description: 'Your response has been posted.',
      });
      setResponseText('');
      setShowResponseForm(false);
      queryClient.invalidateQueries({ queryKey: ['product-reviews', productId] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error submitting response',
        description: error.message,
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setIsSubmitting(false);
    }
  });

  const handleSubmitResponse = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    submitResponseMutation.mutate();
  };

  const hasVendorResponse = review.review_responses && review.review_responses.length > 0;
  const vendorResponse = hasVendorResponse ? review.review_responses[0] : null;

  return (
    <Card className="mb-4">
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <Avatar className="w-10 h-10">
            <AvatarImage src={review.user.avatar_url} />
            <AvatarFallback>
              {review.user.full_name?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-medium text-gray-900">
                {review.user.full_name}
              </span>
              <span className="text-sm text-gray-500">
                {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
              </span>
            </div>
            
            <div className="mb-3">
              <StarRating rating={review.rating} size="sm" />
            </div>
            
            <p className="text-gray-700 mb-4">{review.review_text}</p>
            
            {/* Vendor Response */}
            {hasVendorResponse && vendorResponse && (
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Avatar className="w-6 h-6">
                    <AvatarImage src={vendorResponse.vendor.avatar_url} />
                    <AvatarFallback>
                      {vendorResponse.vendor.full_name?.charAt(0) || 'V'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium text-sm text-gray-900">
                    {vendorResponse.vendor.full_name} (Vendor)
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatDistanceToNow(new Date(vendorResponse.created_at), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-gray-700 text-sm">{vendorResponse.response_text}</p>
              </div>
            )}
            
            {/* Vendor Response Form */}
            {isVendor && !hasVendorResponse && (
              <div className="mt-4">
                {!showResponseForm ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowResponseForm(true)}
                    className="flex items-center gap-2"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Respond to Review
                  </Button>
                ) : (
                  <form onSubmit={handleSubmitResponse} className="space-y-3">
                    <Textarea
                      placeholder="Write your response to this review..."
                      value={responseText}
                      onChange={(e) => setResponseText(e.target.value)}
                      rows={3}
                      className="resize-none"
                      required
                    />
                    <div className="flex gap-2">
                      <Button
                        type="submit"
                        size="sm"
                        disabled={!responseText.trim() || isSubmitting}
                        className="flex items-center gap-2"
                      >
                        <Send className="w-4 h-4" />
                        {isSubmitting ? 'Sending...' : 'Send Response'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setShowResponseForm(false);
                          setResponseText('');
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReviewCard; 