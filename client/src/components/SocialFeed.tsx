
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageCircle, Share2, ShoppingBag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import CommentsDialog from "./CommentsDialog";

const SocialFeed = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPostForComments, setSelectedPostForComments] = useState<string | null>(null);

  // Fetch posts
  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['posts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          user_profile:profiles!user_id (
            full_name,
            avatar_url
          ),
          product:products (
            id,
            name,
            price,
            image_url
          ),
          post_likes (
            user_id
          )
        `)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      
      return data?.map(post => ({
        ...post,
        isLiked: post.post_likes?.some((like: any) => like.user_id === user?.id) || false,
        created_at: post.created_at || new Date().toISOString()
      })) || [];
    },
  });

  // Like/Unlike mutation
  const toggleLikeMutation = useMutation({
    mutationFn: async ({ postId, isLiked }: { postId: string; isLiked: boolean }) => {
      if (!user) throw new Error('Not authenticated');
      
      if (isLiked) {
        // Unlike
        const { error } = await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);
        
        if (error) throw error;
      } else {
        // Like
        const { error } = await supabase
          .from('post_likes')
          .insert({
            post_id: postId,
            user_id: user.id
          });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });

  // Add to cart mutation
  const addToCartMutation = useMutation({
    mutationFn: async (productId: string) => {
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('cart_items')
        .upsert({
          user_id: user.id,
          product_id: productId,
          quantity: 1
        }, {
          onConflict: 'user_id,product_id'
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Added to Cart!",
        description: "Product has been added to your cart.",
      });
    },
  });

  const handleLike = (postId: string, isLiked: boolean) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to like posts.",
        variant: "destructive",
      });
      return;
    }
    
    toggleLikeMutation.mutate({ postId, isLiked });
  };

  const handleAddToCart = (productId: string) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to add items to cart.",
        variant: "destructive",
      });
      return;
    }
    
    addToCartMutation.mutate(productId);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center space-y-0 space-x-4">
              <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/6"></div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-4 bg-gray-200 rounded mb-4"></div>
              <div className="h-48 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {posts.map((post) => (
        <Card key={post.id} className="overflow-hidden">
          <CardHeader className="flex flex-row items-center space-y-0 space-x-4">
            <Avatar className="w-10 h-10">
              <AvatarImage src={post.user_profile?.avatar_url || undefined} />
              <AvatarFallback>
                {post.user_profile?.full_name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-medium">
                {post.user_profile?.full_name || 'Anonymous'}
              </p>
              <p className="text-sm text-gray-500">
                {post.created_at ? new Date(post.created_at).toLocaleDateString() : ''}
              </p>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <p className="text-gray-800">{post.content}</p>
            
            {post.image_url && (
              <img 
                src={post.image_url} 
                alt="Post content"
                className="w-full h-64 object-cover rounded-lg"
              />
            )}
            
            {post.product && (
              <div className="bg-gray-50 rounded-lg p-4 flex items-center space-x-4">
                <img 
                  src={post.product.image_url || "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=100&h=100&fit=crop"} 
                  alt={post.product.name}
                  className="w-16 h-16 object-cover rounded-lg"
                />
                <div className="flex-1">
                  <h4 className="font-medium">{post.product.name}</h4>
                  <p className="text-pink-600 font-bold">${post.product.price}</p>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleAddToCart(post.product.id)}
                  disabled={addToCartMutation.isPending}
                >
                  <ShoppingBag className="w-4 h-4 mr-2" />
                  Add to Cart
                </Button>
              </div>
            )}
            
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex items-center space-x-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleLike(post.id, post.isLiked)}
                  className={post.isLiked ? "text-red-500" : "text-gray-500"}
                >
                  <Heart className={`w-4 h-4 mr-1 ${post.isLiked ? 'fill-current' : ''}`} />
                  {post.likes_count || 0}
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedPostForComments(post.id)}
                >
                  <MessageCircle className="w-4 h-4 mr-1" />
                  {post.comments_count || 0}
                </Button>
                
                <Button variant="ghost" size="sm">
                  <Share2 className="w-4 h-4 mr-1" />
                  Share
                </Button>
              </div>
              
              <p className="text-xs text-gray-500">
                {post.views_count || 0} views
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
      
      {posts.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No posts yet. Start following some users to see their posts!</p>
        </div>
      )}
      
      {selectedPostForComments && (
        <CommentsDialog
          postId={selectedPostForComments}
          open={!!selectedPostForComments}
          onOpenChange={(open) => !open && setSelectedPostForComments(null)}
        />
      )}
    </div>
  );
};

export default SocialFeed;
