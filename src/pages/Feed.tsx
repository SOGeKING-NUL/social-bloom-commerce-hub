import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Heart, MessageCircle, Share, Plus, Image, ArrowUp } from "lucide-react";
import Layout from "@/components/Layout";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import CommentsDialog from "@/components/CommentsDialog";
import InstagramStylePostCreator from "@/components/InstagramStylePostCreator";
import PostCard from "@/components/PostCard";
import { useNavigate } from "react-router-dom";

// Define feelings (same as in post creator)
const feelings = [
  { emoji: "😊", name: "Happy" },
  { emoji: "😢", name: "Sad" },
  { emoji: "😍", name: "In Love" },
  { emoji: "😴", name: "Sleepy" },
  { emoji: "😃", name: "Excited" },
  { emoji: "😣", name: "Frustrated" },
  { emoji: "🥳", name: "Celebrating" },
  { emoji: "😎", name: "Cool" },
  { emoji: "🤩", name: "Amazed" },
  { emoji: "😌", name: "Relaxed" },
];

const Feed = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [selectedPostForComments, setSelectedPostForComments] = useState<
    string | null
  >(null);
  const [showScrollToTop, setShowScrollToTop] = useState(false);

  // Handle scroll event to show/hide scroll-to-top button
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowScrollToTop(true);
      } else {
        setShowScrollToTop(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Function to scroll to top with smooth animation
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // Fetch posts from database with proper privacy filtering
  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["posts"],
    queryFn: async () => {
      // The RLS policy should automatically filter posts based on privacy
      // But we'll also add client-side filtering for better UX
      const { data, error } = await supabase
        .from("posts")
        .select(
          `
          *,
          profiles:user_id (
            full_name,
            email,
            avatar_url
          ),
          post_likes (user_id),
          comment_count: post_comments (count),
          post_images (
            image_url,
            display_order
          ),
          post_tag_mappings (
            post_tags (
              name
            )
          ),
          post_tagged_products (
            products (
              id,
              name,
              price,
              image_url
            )
          )
        `
        )
        .eq('status', 'published')
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Transform the data
      const transformedPosts = data.map((post) => ({
        ...post,
        user: {
          id: post.user_id,
          name:
            post.profiles?.full_name ||
            post.profiles?.email?.split("@")[0] ||
            "Unknown User",
          avatar: post.profiles?.avatar_url || null,
          username: `@${post.profiles?.email?.split("@")[0] || "user"}`,
        },
        liked:
          user && post.post_likes?.some((like) => like.user_id === user?.id) || false,
        likes_count: post.post_likes?.length || 0,
        comments_count: post.comment_count?.[0]?.count || 0,
        images: post.post_images?.sort((a, b) => a.display_order - b.display_order) || [],
        post_tags: post.post_tag_mappings?.map((mapping: any) => mapping.post_tags) || [],
        tagged_products: post.post_tagged_products?.map((mapping: any) => ({
          product_id: mapping.products.id,
          product_name: mapping.products.name,
          product_price: mapping.products.price,
          product_image: mapping.products.image_url,
        })) || [],
        rating: post.rating,
      }));

      // Additional client-side filtering for better UX
      // This ensures that even if RLS doesn't work perfectly, we have a fallback
      const filteredPosts = await Promise.all(
        transformedPosts.map(async (post) => {
          // If user is not logged in, only show public posts
          if (!user) {
            return post.privacy === 'public' ? post : null;
          }

          // If user is the post creator, show all their posts
          if (post.user_id === user.id) {
            return post;
          }

          // For other users, apply privacy rules
          switch (post.privacy) {
            case 'public':
              return post;
            case 'following':
              // For 'following' posts, check if the current user follows the post creator
              try {
                const { data: followData } = await supabase
                  .from('user_follows')
                  .select('id')
                  .eq('follower_id', user.id)
                  .eq('following_id', post.user_id)
                  .single();
                
                return followData ? post : null;
              } catch (error) {
                return null;
              }
            case 'draft':
              // Draft posts should not appear in the feed
              return null;
            default:
              return post;
          }
        })
      );

      return filteredPosts.filter(Boolean);
    },
  });

  // Like post mutation
  const likePostMutation = useMutation({
    mutationFn: async ({
      postId,
      isLiked,
    }: {
      postId: string;
      isLiked: boolean;
    }) => {
      if (!user) throw new Error("Not authenticated");

      if (isLiked) {
        const { error } = await supabase
          .from("post_likes")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("post_likes").insert({
          post_id: postId,
          user_id: user.id,
        });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
    onError: (error) => {
      console.error("Error toggling like:", error);
      toast({
        title: "Error",
        description: "Failed to update like. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleLike = (
    e: React.MouseEvent,
    postId: string,
    isLiked: boolean
  ) => {
    e.stopPropagation();
    likePostMutation.mutate({ postId, isLiked });
  };

  const handleShare = async (e: React.MouseEvent, postId: string) => {
    e.stopPropagation();
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Check out this post",
          text: "Check out this amazing post!",
          url: `${window.location.origin}/posts/${postId}`,
        });
      } catch (error) {
        console.log("Share failed:", error);
      }
    } else if (navigator.clipboard) {
      navigator.clipboard
        .writeText(`${window.location.origin}/posts/${postId}`)
        .then(() => {
          toast({
            title: "Link copied!",
            description: "Post link copied to clipboard.",
          });
        });
    } else {
      toast({
        title: "Share feature coming soon!",
        description: "Advanced sharing options will be available soon.",
      });
    }
  };

  const handleUserClick = (userId: string) => {
    navigate(`/users/${userId}`);
  };

  // Handle click on tagged entity
  const handleTagClick = async (e: React.MouseEvent, tag: string) => {
    e.stopPropagation();
    const cleanTag = tag.slice(1); // Remove '@' symbol
    // Fetch entity details to determine type (simplified approach)
    const [userRes, productRes, groupRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("id")
        .ilike("full_name", `%${cleanTag}%`)
        .limit(1),
      supabase
        .from("products")
        .select("id")
        .ilike("name", `%${cleanTag}%`)
        .limit(1),
      supabase
        .from("groups")
        .select("id")
        .ilike("name", `%${cleanTag}%`)
        .limit(1),
    ]);

    if (userRes.data?.length) {
      navigate(`/users/${userRes.data[0].id}`);
    } else if (productRes.data?.length) {
      navigate(`/products/${productRes.data[0].id}`);
    } else if (groupRes.data?.length) {
      navigate(`/groups/${groupRes.data[0].id}`);
    } else {
      toast({
        title: "Not Found",
        description: "The tagged entity could not be found.",
        variant: "destructive",
      });
    }
  };

  const handleCommentClick = (postId: string) => {
    setSelectedPostForComments(postId);
  };

  const handlePostClick = (postId: string) => {
    setSelectedPostForComments(postId);
  };

  // Render content with highlighted tags
  const renderContentWithTags = (content: string, postId: string) => {
    const tagRegex = /@[\w-]+/g;
    const parts = content.split(tagRegex);
    const tags = content.match(tagRegex) || [];

    return parts.reduce((acc, part, index) => {
      acc.push(<span key={`part-${index}`}>{part}</span>);
      if (index < tags.length) {
        acc.push(
          <span
            key={`tag-${index}`}
            className="text-pink-500 underline cursor-pointer"
            onClick={(e) => handleTagClick(e, tags[index])}
          >
            {tags[index]}
          </span>
        );
      }
      return acc;
    }, [] as JSX.Element[]);
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
      <div className="min-h-screen bg-gradient-to-b from-white to-pink-50 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mt-20 mx-auto">
            {/* Instagram-style Post Creator */}
            <div className="mb-8">
              <InstagramStylePostCreator />
            </div>

            {/* Posts Feed */}
            <div className="space-y-6">
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onUserClick={handleUserClick}
                  onCommentClick={handleCommentClick}
                />
              ))}

              {posts.length === 0 && (
                <div className="text-center py-12">
                  <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-300 mb-2">
                    No posts yet
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    Be the first to share something with the community!
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Scroll to Top Button */}
        <Button
          variant="default"
          size="icon"
          onClick={scrollToTop}
          className={`fixed bottom-8 right-4 rounded-full bg-primary hover:bg-primary/90 text-white shadow-lg transition-all duration-300 ease-in-out z-50 ${
            showScrollToTop
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-4 pointer-events-none"
          }`}
        >
          <ArrowUp className="h-5 w-5" />
        </Button>
      </div>

      {/* Comments Dialog */}
      <CommentsDialog
        postId={selectedPostForComments || ""}
        isOpen={!!selectedPostForComments}
        onOpenChange={(open) => !open && setSelectedPostForComments(null)}
      />
    </Layout>
  );
};

export default Feed;