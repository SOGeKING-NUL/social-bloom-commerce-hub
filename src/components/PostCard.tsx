import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Heart, MessageCircle, Share } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

// Define feelings (same as in Feed)
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

interface PostCardProps {
  post: {
    id: string;
    content: string;
    feeling?: string;
    created_at: string;
    user: {
      id: string;
      name: string;
      avatar?: string;
      username: string;
    };
    images?: Array<{
      image_url: string;
      display_order: number;
    }>;
    liked: boolean;
    likes_count: number;
    comments_count: number;
  };
  onUserClick?: (userId: string) => void;
  onCommentClick?: (postId: string) => void;
  showUserInfo?: boolean;
}

const PostCard: React.FC<PostCardProps> = ({ 
  post, 
  onUserClick, 
  onCommentClick,
  showUserInfo = true 
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isLiked, setIsLiked] = useState(post.liked);
  const [likesCount, setLikesCount] = useState(post.likes_count);

  // Like/Unlike mutation
  const likePostMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Please log in to like posts");

      if (isLiked) {
        const { error } = await supabase
          .from("post_likes")
          .delete()
          .eq("post_id", post.id)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("post_likes")
          .insert({
            post_id: post.id,
            user_id: user.id,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      setIsLiked(!isLiked);
      setLikesCount(isLiked ? likesCount - 1 : likesCount + 1);
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update like",
        variant: "destructive",
      });
    },
  });

  // Share post
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${post.user.name}'s post`,
          text: post.content,
          url: window.location.href,
        });
      } catch (error) {
        console.log("Error sharing:", error);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(
        `${post.user.name}'s post: ${post.content}`
      );
      toast({
        title: "Copied to clipboard",
        description: "Post link copied to clipboard",
      });
    }
  };

  const handleLike = () => {
    if (!user) {
      toast({ title: "Please log in to like posts" });
      return;
    }
    likePostMutation.mutate();
  };

  const handleUserClick = () => {
    if (onUserClick) {
      onUserClick(post.user.id);
    } else {
      navigate(`/users/${post.user.id}`);
    }
  };

  const handleCommentClick = () => {
    if (onCommentClick) {
      onCommentClick(post.id);
    }
  };

  const renderContentWithTags = (content: string) => {
    const words = content.split(" ");
    return words.map((word, index) => {
      if (word.startsWith("#")) {
        return (
          <span
            key={index}
            className="text-pink-500 hover:text-pink-600 cursor-pointer font-medium"
          >
            {word}{" "}
          </span>
        );
      }
      return <span key={index}>{word} </span>;
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 hover:shadow-md transition-all duration-300">
      {showUserInfo && (
        <div className="flex items-center mb-4">
          {post.user.avatar ? (
            <Avatar
              className="w-12 h-12 mr-4 cursor-pointer hover:ring-2 hover:ring-pink-300 transition-all"
              onClick={handleUserClick}
            >
              <AvatarImage
                src={post.user.avatar}
                alt={post.user.name}
              />
              <AvatarFallback>
                {post.user.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div
              className="w-12 h-12 mr-4 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white font-medium cursor-pointer hover:ring-2 hover:ring-pink-300 transition-all"
              onClick={handleUserClick}
            >
              {post.user.name.charAt(0)}
            </div>
          )}
          <div>
            <div className="flex items-center space-x-2">
              <h3
                className="font-semibold cursor-pointer hover:text-pink-500 transition-colors dark:text-white dark:hover:text-pink-400"
                onClick={handleUserClick}
              >
                {post.user.name}
              </h3>
              {post.feeling && (
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  is feeling{" "}
                  {
                    feelings.find((f) => f.name === post.feeling)
                      ?.emoji
                  }{" "}
                  {post.feeling}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {post.user.username}
            </p>
          </div>
        </div>
      )}

      <div className="mb-4 text-gray-700 dark:text-gray-300">
        {renderContentWithTags(post.content)}
      </div>

      {post.images && post.images.length > 0 && (
        <div className="mb-4 rounded-2xl overflow-hidden">
          <div className={`grid gap-1 ${
            post.images.length === 1 ? 'grid-cols-1' :
            post.images.length === 2 ? 'grid-cols-2' :
            post.images.length === 3 ? 'grid-cols-3' :
            'grid-cols-2'
          }`}>
            {post.images.map((image, index) => (
              <div 
                key={index} 
                className={`relative ${
                  post.images.length === 3 && index === 2 ? 'col-span-2' :
                  post.images.length === 4 && index === 3 ? 'col-span-2' : ''
                }`}
              >
                <div className={`${
                  post.images.length === 1 ? 'aspect-[4/3]' :
                  post.images.length === 2 ? 'aspect-square' :
                  post.images.length === 3 && index === 2 ? 'aspect-[2/1]' :
                  post.images.length === 4 && index === 3 ? 'aspect-[2/1]' :
                  'aspect-square'
                }`}>
                  <img
                    src={image.image_url}
                    alt={`Post image ${index + 1}`}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300 cursor-pointer"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="border-t border-pink-100 dark:border-gray-600 pt-4">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={handleLike}
            disabled={likePostMutation.isPending}
            className={`flex items-center space-x-2 rounded-xl ${
              isLiked
                ? "text-pink-500 hover:bg-pink-50 dark:hover:bg-pink-900/20"
                : "text-gray-600 hover:text-pink-500 hover:bg-pink-50 rounded-xl dark:text-gray-400 dark:hover:text-pink-400 dark:hover:bg-pink-900/20"
            }`}
          >
            <Heart
              className={`w-5 h-5 ${
                isLiked ? "fill-current" : ""
              }`}
            />
            <span>{likesCount}</span>
          </Button>

          <Button
            variant="ghost"
            onClick={handleCommentClick}
            className="flex items-center space-x-2 rounded-xl text-gray-600 hover:text-pink-500 hover:bg-pink-50 dark:text-gray-400 dark:hover:text-pink-400 dark:hover:bg-pink-900/20"
          >
            <MessageCircle className="w-5 h-5" />
            <span>{post.comments_count}</span>
          </Button>

          <Button
            variant="ghost"
            onClick={handleShare}
            className="flex items-center space-x-2 rounded-xl text-gray-600 hover:text-pink-500 hover:bg-pink-50 dark:text-gray-400 dark:hover:text-pink-400 dark:hover:bg-pink-900/20"
          >
            <Share className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PostCard; 