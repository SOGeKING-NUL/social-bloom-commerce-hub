import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, MessageCircle, Heart, Eye, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const SearchSidebar = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  // Fetch posts based on search
  const { data: posts = [], isLoading: postsLoading } = useQuery({
    queryKey: ['search-posts', searchTerm],
    queryFn: async () => {
      if (!searchTerm) return [];
      
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles:user_id (
            full_name,
            email,
            avatar_url
          )
        `)
        .ilike('content', `%${searchTerm}%`)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) {
        console.error('Error searching posts:', error);
        return [];
      }
      
      return (data || []).map((post: any) => ({
        id: post.id,
        user_id: post.user_id,
        content: post.content,
        image: post.image_url,
        likes: post.likes_count || 0,
        comments: post.comments_count || 0,
        views: post.views_count || 0,
        timestamp: new Date(post.created_at).toLocaleDateString(),
        user: {
          id: post.user_id,
          name: post.profiles?.full_name || post.profiles?.email?.split('@')[0] || 'Unknown User',
          avatar: post.profiles?.avatar_url || null,
          username: `@${post.profiles?.email?.split('@')[0] || 'user'}`
        }
      }));
    },
    enabled: !!searchTerm,
  });

  // Fetch users based on search
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['search-users', searchTerm],
    queryFn: async () => {
      if (!searchTerm) return [];
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, followers_count, following_count, posts_count')
        .or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
        .limit(5);
      
      if (error) {
        console.error('Error searching users:', error);
        return [];
      }
      
      return data || [];
    },
    enabled: !!searchTerm,
  });

  const handleUserClick = (userId: string) => {
    navigate(`/users/${userId}`);
  };

  const handlePostClick = (postId: string) => {
    console.log('Post clicked:', postId);
  };

  return (
    <div className="w-80 h-screen bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-4 overflow-y-auto">
      {/* Search Input */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search posts and users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border-gray-200 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>
      </div>

      {/* Search Results */}
      {searchTerm && (
        <div className="space-y-6">
          {/* Posts Section */}
          <div>
            <div className="flex items-center mb-3">
              <MessageCircle className="w-4 h-4 text-gray-500 mr-2" />
              <h3 className="font-semibold text-gray-800 dark:text-white">Posts</h3>
              <span className="ml-2 text-xs text-gray-500">({posts.length})</span>
            </div>
            
            <div className="space-y-3">
              {postsLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="flex items-start space-x-2">
                      <div className="w-8 h-8 bg-gray-200 dark:bg-gray-600 rounded-full"></div>
                      <div className="flex-1 space-y-1">
                        <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-1/2"></div>
                      </div>
                    </div>
                  </div>
                ))
              ) : posts.length > 0 ? (
                posts.map((post) => (
                  <div 
                    key={post.id}
                    className="p-3 rounded-lg border border-gray-100 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                    onClick={() => handlePostClick(post.id)}
                  >
                    <div className="flex items-start space-x-2 mb-2">
                      {post.user.avatar ? (
                        <Avatar className="w-6 h-6">
                          <AvatarImage src={post.user.avatar} alt={post.user.name} />
                          <AvatarFallback className="text-xs">{post.user.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white text-xs font-medium">
                          {post.user.name.charAt(0)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-800 dark:text-white truncate">
                          {post.user.name}
                        </p>
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mb-2">
                      {post.content}
                    </p>
                    
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                      <div className="flex items-center space-x-3">
                        <span className="flex items-center">
                          <Heart className="w-3 h-3 mr-1" />
                          {post.likes}
                        </span>
                        <span className="flex items-center">
                          <MessageCircle className="w-3 h-3 mr-1" />
                          {post.comments}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">No posts found</p>
              )}
            </div>
          </div>

          {/* Users Section */}
          <div>
            <div className="flex items-center mb-3">
              <User className="w-4 h-4 text-gray-500 mr-2" />
              <h3 className="font-semibold text-gray-800 dark:text-white">People</h3>
              <span className="ml-2 text-xs text-gray-500">({users.length})</span>
            </div>
            
            <div className="space-y-2">
              {usersLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-gray-200 dark:bg-gray-600 rounded-full"></div>
                      <div className="flex-1 space-y-1">
                        <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-3/4"></div>
                        <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded w-1/2"></div>
                      </div>
                    </div>
                  </div>
                ))
              ) : users.length > 0 ? (
                users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                    onClick={() => handleUserClick(user.id)}
                  >
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={user.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {user.full_name ? user.full_name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 dark:text-white truncate">
                        {user.full_name || 'Unknown User'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {user.email}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUserClick(user.id);
                      }}
                      className="text-xs px-2 py-1 h-6"
                    >
                      View
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">No people found</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!searchTerm && (
        <div className="text-center py-8">
          <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Search Everything</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">Find posts and people in your community</p>
        </div>
      )}
    </div>
  );
};

export default SearchSidebar;