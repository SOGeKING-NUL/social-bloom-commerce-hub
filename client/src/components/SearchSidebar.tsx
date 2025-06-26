import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, MessageCircle, Heart, Eye, User, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const SearchSidebar = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  // Search posts
  const { data: posts = [], isLoading: postsLoading } = useQuery({
    queryKey: ["search-posts", searchTerm],
    queryFn: async () => {
      if (!searchTerm.trim()) return [];

      const { data, error } = await supabase
        .from("posts")
        .select(
          `
          id,
          content,
          image_url,
          created_at,
          likes_count,
          comments_count,
          shares_count,
          profiles!posts_user_id_fkey (
            id,
            full_name,
            email,
            avatar_url
          )
        `,
        )
        .ilike("content", `%${searchTerm}%`)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;

      return data.map((post) => ({
        ...post,
        user: {
          id: post.profiles?.id || "",
          name: post.profiles?.full_name || "Unknown User",
          username: post.profiles?.email?.split("@")[0] || "",
          avatar: post.profiles?.avatar_url || null,
        },
      }));
    },
    enabled: !!searchTerm.trim(),
  });

  // Search users
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ["search-users", searchTerm],
    queryFn: async () => {
      if (!searchTerm.trim()) return [];

      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url, bio")
        .ilike("full_name", `%${searchTerm}%`)
        .limit(10);

      if (error) throw error;
      return data;
    },
    enabled: !!searchTerm.trim(),
  });

  const handleUserClick = (userId: string) => {
    navigate(`/profile/${userId}`);
    setIsOpen(false);
  };

  const handlePostClick = (postId: string) => {
    console.log("Post clicked:", postId);
  };

  return (
    <>
      {/* Search Toggle Button */}
      {!isOpen && (
        <div className="fixed top-40 left-12 z-50">
          <Button
            onClick={() => setIsOpen(true)}
            className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white border-0 shadow-lg rounded-full p-5 transition-all duration-200 hover:scale-105"
          >
            <Search className="w-7 h-7" />
          </Button>
        </div>
      )}

      {/* Search Sidebar */}
      <div
        className={`fixed top-0 left-0 h-screen bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-4 overflow-y-auto z-40 transition-all duration-300 ease-in-out ${
          isOpen ? "w-80 translate-x-0" : "w-0 -translate-x-full"
        }`}
      >
        <div
          className={`transition-opacity duration-200 ${isOpen ? "opacity-100" : "opacity-0"}`}
        >
          {/* Header with Close Button */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
              Search
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Search Input */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search posts and users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border-gray-200 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                autoFocus={isOpen}
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
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Posts
                  </h3>
                </div>

                {postsLoading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div
                        key={i}
                        className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg h-16"
                      ></div>
                    ))}
                  </div>
                ) : posts.length > 0 ? (
                  <div className="space-y-3">
                    {posts.map((post) => (
                      <div
                        key={post.id}
                        onClick={() => handlePostClick(post.id)}
                        className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer transition-colors"
                      >
                        <div className="flex items-start space-x-3">
                          {post.user.avatar ? (
                            <Avatar className="w-6 h-6">
                              <AvatarImage src={post.user.avatar} />
                              <AvatarFallback className="text-xs">
                                {post.user.name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                          ) : (
                            <div className="w-6 h-6 bg-gradient-to-br from-pink-400 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
                              {post.user.name.charAt(0)}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
                              {post.user.name}
                            </p>
                            <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 mt-1">
                              {post.content}
                            </p>
                            <div className="flex items-center space-x-3 mt-2 text-xs text-gray-500">
                              <span className="flex items-center">
                                <Heart className="w-3 h-3 mr-1" />
                                {post.likes_count || 0}
                              </span>
                              <span className="flex items-center">
                                <MessageCircle className="w-3 h-3 mr-1" />
                                {post.comments_count || 0}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No posts found
                  </p>
                )}
              </div>

              {/* Users Section */}
              <div>
                <div className="flex items-center mb-3">
                  <User className="w-4 h-4 text-gray-500 mr-2" />
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    People
                  </h3>
                </div>

                {usersLoading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div
                        key={i}
                        className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg h-12"
                      ></div>
                    ))}
                  </div>
                ) : users.length > 0 ? (
                  <div className="space-y-3">
                    {users.map((user) => (
                      <div
                        key={user.id}
                        onClick={() => handleUserClick(user.id)}
                        className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer transition-colors"
                      >
                        {user.avatar_url ? (
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={user.avatar_url} />
                            <AvatarFallback>
                              {user.full_name?.charAt(0) || "U"}
                            </AvatarFallback>
                          </Avatar>
                        ) : (
                          <div className="w-8 h-8 bg-gradient-to-br from-pink-400 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                            {user.full_name?.charAt(0) || "U"}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {user.full_name || "Unknown User"}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {user.email || "No email"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No people found
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Empty State */}
          {!searchTerm && (
            <div className="text-center py-8">
              <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
                Search Everything
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Find posts and people in your community
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-25 z-30 transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
};

export default SearchSidebar;
