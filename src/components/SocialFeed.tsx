
import { useState } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Share, Eye } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const SocialFeed = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch posts from database with user avatar
  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['social-feed-posts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles:user_id (
            full_name,
            email,
            avatar_url
          ),
          post_likes!left (
            user_id
          )
        `)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) {
        console.error('Error fetching posts:', error);
        return [];
      }
      
      return (data || []).map(post => ({
        id: post.id,
        content: post.content,
        image: post.image_url,
        likes: post.likes_count || 0,
        comments: post.comments_count || 0,
        shares: post.shares_count || 0,
        views: post.views_count || 0,
        timestamp: new Date(post.created_at).toLocaleDateString(),
        isLiked: user ? post.post_likes.some((like: any) => like.user_id === user.id) : false,
        user: {
          id: post.user_id,
          name: post.profiles?.full_name || post.profiles?.email?.split('@')[0] || 'Unknown User',
          avatar: post.profiles?.avatar_url || `https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face`,
          username: `@${post.profiles?.email?.split('@')[0] || 'user'}`
        }
      }));
    },
  });

  // Like/unlike post mutation
  const likeMutation = useMutation({
    mutationFn: async ({ postId, isLiked }: { postId: string; isLiked: boolean }) => {
      if (!user) throw new Error('Please login to like posts');

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
      queryClient.invalidateQueries({ queryKey: ['social-feed-posts'] });
    },
    onError: (error: any) => {
      console.error('Like mutation error:', error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Track post view
  const trackView = async (postId: string) => {
    try {
      const { error } = await supabase
        .from('post_views')
        .insert({
          post_id: postId,
          user_id: user?.id || null,
        });
      
      if (!error) {
        // Refresh posts to update view count
        queryClient.invalidateQueries({ queryKey: ['social-feed-posts'] });
      }
    } catch (error) {
      // Silently fail for views tracking
      console.log('View tracking failed:', error);
    }
  };

  const handleLike = (postId: string, isLiked: boolean) => {
    if (!user) {
      toast({ title: "Please login to like posts" });
      return;
    }
    
    likeMutation.mutate({ postId, isLiked });
  };

  const handleShare = (postId: string) => {
    // Simple share functionality - copy link to clipboard
    const postUrl = `${window.location.origin}/posts/${postId}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(postUrl).then(() => {
        toast({ title: "Link copied to clipboard!" });
      });
    } else {
      toast({ title: "Share feature coming soon!" });
    }
  };

  if (isLoading) {
    return (
      <section className="py-20 bg-gradient-to-b from-white to-pink-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Community Feed</h2>
              <p className="text-xl text-gray-600">See what our community is sharing</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="smooth-card animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  // If no posts, show fallback message
  if (posts.length === 0) {
    return (
      <section className="py-20 bg-gradient-to-b from-white to-pink-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Community Feed</h2>
              <p className="text-xl text-gray-600">See what our community is sharing</p>
            </div>
            
            <div className="text-center py-12">
              <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">No posts yet</h3>
              <p className="text-gray-500">Be the first to share something with the community!</p>
              <Button className="mt-4 social-button bg-gradient-to-r from-pink-500 to-rose-400 hover:from-pink-600 hover:to-rose-500">
                Join the Community
              </Button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 bg-gradient-to-b from-white to-pink-50">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Community Feed</h2>
            <p className="text-xl text-gray-600">See what our community is sharing</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <div 
                key={post.id} 
                className="smooth-card p-6 floating-card animate-fade-in cursor-pointer"
                onClick={() => trackView(post.id)}
              >
                <div className="flex items-center mb-4">
                  <Avatar className="w-10 h-10 mr-3">
                    <AvatarImage src={post.user.avatar} alt={post.user.name} />
                    <AvatarFallback>{post.user.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h4 className="font-medium text-sm">{post.user.name}</h4>
                    <p className="text-xs text-gray-500">{post.user.username}</p>
                  </div>
                </div>
                
                <p className="text-gray-700 mb-4 text-sm line-clamp-3">{post.content}</p>
                
                {post.image && (
                  <div className="mb-4 rounded-lg overflow-hidden">
                    <img 
                      src={post.image} 
                      alt="Post content"
                      className="w-full h-32 object-cover hover:scale-105 transition-transform duration-300 cursor-pointer"
                    />
                  </div>
                )}
                
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLike(post.id, post.isLiked);
                    }}
                    disabled={likeMutation.isPending}
                    className={`flex items-center space-x-1 hover:text-red-500 transition-colors ${
                      post.isLiked ? 'text-red-500' : ''
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${post.isLiked ? 'fill-current' : ''}`} />
                    <span>{post.likes}</span>
                  </button>
                  <div className="flex items-center space-x-1">
                    <MessageCircle className="w-4 h-4" />
                    <span>{post.comments}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleShare(post.id);
                    }}
                    className="flex items-center space-x-1 hover:text-blue-500 transition-colors"
                  >
                    <Share className="w-4 h-4" />
                    <span>{post.shares}</span>
                  </button>
                  <div className="flex items-center space-x-1">
                    <Eye className="w-4 h-4" />
                    <span>{post.views}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="text-center mt-12">
            <Button 
              onClick={() => window.location.href = '/feed'}
              className="social-button bg-gradient-to-r from-pink-500 to-rose-400 hover:from-pink-600 hover:to-rose-500"
            >
              View All Posts
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SocialFeed;
