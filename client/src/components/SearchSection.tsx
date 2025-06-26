import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Grid, User, MessageCircle, Heart, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const SearchSection = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  // Fetch posts based on search
  const { data: posts = [], isLoading: postsLoading } = useQuery({
    queryKey: ['search-posts', searchTerm],
    queryFn: async () => {
      if (!searchTerm) return [];
      
      const response = await fetch(`/api/posts/search?q=${encodeURIComponent(searchTerm)}`);
      
      if (!response.ok) {
        console.error('Error searching posts:', response.statusText);
        return [];
      }
      
      const data = await response.json();
      
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
          name: post.user?.full_name || post.user?.email?.split('@')[0] || 'Unknown User',
          avatar: post.user?.avatar_url || null,
          username: `@${post.user?.email?.split('@')[0] || 'user'}`
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
      
      const response = await fetch(`/api/profiles/search?q=${encodeURIComponent(searchTerm)}`);
      
      if (!response.ok) {
        console.error('Error searching users:', response.statusText);
        return [];
      }
      
      const data = await response.json();
      return data || [];
    },
    enabled: !!searchTerm,
  });

  const handleUserClick = (userId: string) => {
    navigate(`/users/${userId}`);
  };

  const handlePostClick = (postId: string) => {
    // Navigate to post detail or handle post interaction
    console.log('Post clicked:', postId);
  };

  if (!searchTerm) {
    return (
      <section className="py-16 bg-gradient-to-b from-white to-pink-50 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4 dark:text-white">Discover Content</h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">Search for posts, content, and connect with users</p>
            
            <div className="relative max-w-2xl mx-auto">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="Search for posts, content, and users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 pr-4 py-4 text-lg border-gray-200 rounded-2xl bg-white shadow-lg dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              />
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-gradient-to-b from-white to-pink-50 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          {/* Search Header */}
          <div className="mb-8">
            <div className="relative max-w-2xl mx-auto">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="Search for posts, content, and users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 pr-4 py-4 text-lg border-gray-200 rounded-2xl bg-white shadow-lg dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              />
            </div>
          </div>

          {/* Search Results */}
          <Tabs defaultValue="posts" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8 bg-white rounded-xl shadow-sm dark:bg-gray-800">
              <TabsTrigger value="posts" className="flex items-center gap-2 text-lg py-3 dark:text-gray-300">
                <MessageCircle className="w-5 h-5" />
                Posts & Content
              </TabsTrigger>
              <TabsTrigger value="users" className="flex items-center gap-2 text-lg py-3 dark:text-gray-300">
                <User className="w-5 h-5" />
                People
              </TabsTrigger>
            </TabsList>

            <TabsContent value="posts" className="space-y-6">
              {/* Posts Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {postsLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="smooth-card animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  ))
                ) : posts.length > 0 ? (
                  posts.map((post) => (
                    <div 
                      key={post.id}
                      className="smooth-card p-6 floating-card animate-fade-in cursor-pointer dark:bg-gray-800 dark:border-gray-700 hover:shadow-lg transition-shadow"
                      onClick={() => handlePostClick(post.id)}
                    >
                      <div className="flex items-center mb-4">
                        {post.user.avatar ? (
                          <Avatar className="w-10 h-10 mr-3">
                            <AvatarImage src={post.user.avatar} alt={post.user.name} />
                            <AvatarFallback>{post.user.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                        ) : (
                          <div className="w-10 h-10 mr-3 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white font-medium">
                            {post.user.name.charAt(0)}
                          </div>
                        )}
                        <div>
                          <h4 
                            className="font-medium text-sm cursor-pointer hover:text-pink-500 transition-colors dark:text-white dark:hover:text-pink-400"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUserClick(post.user.id);
                            }}
                          >
                            {post.user.name}
                          </h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{post.user.username}</p>
                        </div>
                      </div>
                      
                      <p className="text-gray-700 dark:text-gray-300 mb-4 text-sm line-clamp-3">{post.content}</p>
                      
                      {post.image && (
                        <div className="mb-4 rounded-lg overflow-hidden">
                          <img 
                            src={post.image} 
                            alt="Post content"
                            className="w-full h-32 object-cover hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex items-center space-x-1">
                          <Heart className="w-4 h-4" />
                          <span>{post.likes}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <MessageCircle className="w-4 h-4" />
                          <span>{post.comments}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Eye className="w-4 h-4" />
                          <span>{post.views}</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full text-center py-12">
                    <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-600 mb-2 dark:text-gray-400">No posts found</h3>
                    <p className="text-gray-500 dark:text-gray-500">Try searching for different keywords</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="users" className="space-y-6">
              {/* Users Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {usersLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-4 animate-pulse">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                        </div>
                      </div>
                    </div>
                  ))
                ) : users.length > 0 ? (
                  users.map((user) => (
                    <div
                      key={user.id}
                      className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer border dark:border-gray-700"
                      onClick={() => handleUserClick(user.id)}
                    >
                      <div className="flex items-center space-x-4">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={user.avatar_url || undefined} />
                          <AvatarFallback>
                            {user.full_name ? user.full_name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 dark:text-white truncate">
                            {user.full_name || 'Unknown User'}
                          </p>
                          <p className="text-gray-500 dark:text-gray-400 text-sm truncate">
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
                          className="social-button"
                        >
                          View Profile
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full text-center py-12">
                    <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-600 mb-2 dark:text-gray-400">No people found</h3>
                    <p className="text-gray-500 dark:text-gray-500">Try searching for different names or usernames</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </section>
  );
};

export default SearchSection;