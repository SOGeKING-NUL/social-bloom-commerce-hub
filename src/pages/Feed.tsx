
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Heart, MessageCircle, Share, Plus, Image } from "lucide-react";
import Layout from "@/components/Layout";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const Feed = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newPost, setNewPost] = useState("");

  // Fetch posts from database
  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['posts'],
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
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return data.map(post => ({
        ...post,
        user: {
          name: post.profiles?.full_name || post.profiles?.email?.split('@')[0] || 'Unknown User',
          avatar: post.profiles?.avatar_url || `https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face`,
          username: `@${post.profiles?.email?.split('@')[0] || 'user'}`
        },
        liked: post.post_likes?.some(like => like.user_id === user?.id) || false
      }));
    },
    enabled: !!user
  });

  // Create post mutation
  const createPostMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          content,
          post_type: 'text'
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      setNewPost("");
      toast({
        title: "Posted!",
        description: "Your post has been shared with the community.",
      });
    },
    onError: (error) => {
      console.error('Error creating post:', error);
      toast({
        title: "Error",
        description: "Failed to create post. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Like post mutation
  const likePostMutation = useMutation({
    mutationFn: async ({ postId, isLiked }: { postId: string; isLiked: boolean }) => {
      if (!user) throw new Error('Not authenticated');
      
      if (isLiked) {
        const { error } = await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);
        
        if (error) throw error;
      } else {
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
    onError: (error) => {
      console.error('Error toggling like:', error);
      toast({
        title: "Error",
        description: "Failed to update like. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleCreatePost = () => {
    if (newPost.trim()) {
      createPostMutation.mutate(newPost);
    }
  };

  const handleLike = (postId: string, isLiked: boolean) => {
    likePostMutation.mutate({ postId, isLiked });
  };

  const handleComment = (postId: string) => {
    toast({
      title: "Comment",
      description: "Comment feature coming soon!",
    });
  };

  const handleShare = (postId: string) => {
    toast({
      title: "Shared!",
      description: "Post shared successfully.",
    });
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-b from-white to-pink-50">
          <div className="container mx-auto px-4 py-8">
            <div className="max-w-2xl mx-auto">
              <div className="animate-pulse space-y-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="smooth-card p-6">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-white to-pink-50">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            {/* Create Post */}
            <div className="smooth-card p-6 mb-8">
              <div className="flex space-x-4">
                <Avatar className="w-12 h-12">
                  <AvatarImage src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face" />
                  <AvatarFallback>You</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <textarea
                    value={newPost}
                    onChange={(e) => setNewPost(e.target.value)}
                    placeholder="What's on your mind?"
                    className="w-full p-3 border border-pink-200 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-pink-300"
                    rows={3}
                  />
                  <div className="flex justify-between items-center mt-4">
                    <Button variant="ghost" className="text-pink-600 hover:bg-pink-50">
                      <Image className="w-5 h-5 mr-2" />
                      Add Photo
                    </Button>
                    <Button 
                      onClick={handleCreatePost}
                      disabled={createPostMutation.isPending || !newPost.trim()}
                      className="social-button bg-gradient-to-r from-pink-500 to-rose-400 hover:from-pink-600 hover:to-rose-500"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      {createPostMutation.isPending ? 'Posting...' : 'Post'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Posts Feed */}
            <div className="space-y-6">
              {posts.map((post) => (
                <div key={post.id} className="smooth-card p-6 animate-fade-in">
                  <div className="flex items-center mb-4">
                    <Avatar className="w-12 h-12 mr-4">
                      <AvatarImage src={post.user.avatar} alt={post.user.name} />
                      <AvatarFallback>{post.user.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold">{post.user.name}</h3>
                      <p className="text-sm text-gray-500">{post.user.username}</p>
                    </div>
                  </div>
                  
                  <p className="mb-4 text-gray-700">{post.content}</p>
                  
                  {post.image_url && (
                    <div className="mb-4 rounded-2xl overflow-hidden">
                      <img 
                        src={post.image_url} 
                        alt="Post content"
                        className="w-full h-64 object-cover hover:scale-105 transition-transform duration-300 cursor-pointer"
                      />
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between border-t border-pink-100 pt-4">
                    <Button 
                      variant="ghost" 
                      onClick={() => handleLike(post.id, post.liked)}
                      disabled={likePostMutation.isPending}
                      className={`flex items-center space-x-2 rounded-xl ${
                        post.liked 
                          ? 'text-pink-500 hover:bg-pink-50' 
                          : 'text-gray-600 hover:text-pink-500 hover:bg-pink-50'
                      }`}
                    >
                      <Heart className={`w-5 h-5 ${post.liked ? 'fill-current' : ''}`} />
                      <span>{post.likes_count || 0}</span>
                    </Button>
                    
                    <Button 
                      variant="ghost" 
                      onClick={() => handleComment(post.id)}
                      className="flex items-center space-x-2 text-gray-600 hover:text-pink-500 hover:bg-pink-50 rounded-xl"
                    >
                      <MessageCircle className="w-5 h-5" />
                      <span>{post.comments_count || 0}</span>
                    </Button>
                    
                    <Button 
                      variant="ghost" 
                      onClick={() => handleShare(post.id)}
                      className="flex items-center space-x-2 text-gray-600 hover:text-pink-500 hover:bg-pink-50 rounded-xl"
                    >
                      <Share className="w-5 h-5" />
                      <span>{post.shares_count || 0}</span>
                    </Button>
                  </div>
                </div>
              ))}
              
              {posts.length === 0 && (
                <div className="text-center py-12">
                  <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-600 mb-2">No posts yet</h3>
                  <p className="text-gray-500">Be the first to share something with the community!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Feed;
