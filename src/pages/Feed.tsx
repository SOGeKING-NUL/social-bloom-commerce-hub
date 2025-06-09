
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Heart, MessageCircle, Share, Plus, Image } from "lucide-react";
import Header from "@/components/Header";
import { useToast } from "@/hooks/use-toast";

const Feed = () => {
  const { toast } = useToast();
  const [posts, setPosts] = useState([
    {
      id: 1,
      user: {
        name: "Sarah Johnson",
        avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
        username: "@sarah_j"
      },
      content: "Just discovered this amazing skincare routine! The results are incredible after just 2 weeks. Perfect for my sensitive skin ✨",
      image: "https://images.unsplash.com/photo-1618160702438-9b02ab6515c9?w=500&h=400&fit=crop",
      likes: 24,
      comments: 8,
      shares: 3,
      liked: false,
      product: "Gentle Skincare Set"
    },
    {
      id: 2,
      user: {
        name: "Mike Chen",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
        username: "@mike_chen"
      },
      content: "Found the perfect home decor pieces for my living room makeover! The quality is outstanding and they arrived so quickly.",
      image: "https://images.unsplash.com/photo-1721322800607-8c38375eef04?w=500&h=400&fit=crop",
      likes: 42,
      comments: 12,
      shares: 7,
      liked: false,
      product: "Modern Living Set"
    }
  ]);

  const [newPost, setNewPost] = useState("");

  const handleLike = (postId: number) => {
    setPosts(posts.map(post => 
      post.id === postId 
        ? { 
            ...post, 
            liked: !post.liked, 
            likes: post.liked ? post.likes - 1 : post.likes + 1 
          }
        : post
    ));
  };

  const handleComment = (postId: number) => {
    toast({
      title: "Comment",
      description: "Comment feature coming soon!",
    });
  };

  const handleShare = (postId: number) => {
    toast({
      title: "Shared!",
      description: "Post shared successfully.",
    });
  };

  const handleCreatePost = () => {
    if (newPost.trim()) {
      const post = {
        id: posts.length + 1,
        user: {
          name: "You",
          avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
          username: "@you"
        },
        content: newPost,
        image: "",
        likes: 0,
        comments: 0,
        shares: 0,
        liked: false,
        product: ""
      };
      setPosts([post, ...posts]);
      setNewPost("");
      toast({
        title: "Posted!",
        description: "Your post has been shared with the community.",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-pink-50">
      <Header />
      
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
                    className="social-button bg-gradient-to-r from-pink-500 to-rose-400 hover:from-pink-600 hover:to-rose-500"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Post
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
                
                {post.image && (
                  <div className="mb-4 rounded-2xl overflow-hidden">
                    <img 
                      src={post.image} 
                      alt={post.product}
                      className="w-full h-64 object-cover hover:scale-105 transition-transform duration-300 cursor-pointer"
                    />
                  </div>
                )}
                
                <div className="flex items-center justify-between border-t border-pink-100 pt-4">
                  <Button 
                    variant="ghost" 
                    onClick={() => handleLike(post.id)}
                    className={`flex items-center space-x-2 rounded-xl ${
                      post.liked 
                        ? 'text-pink-500 hover:bg-pink-50' 
                        : 'text-gray-600 hover:text-pink-500 hover:bg-pink-50'
                    }`}
                  >
                    <Heart className={`w-5 h-5 ${post.liked ? 'fill-current' : ''}`} />
                    <span>{post.likes}</span>
                  </Button>
                  
                  <Button 
                    variant="ghost" 
                    onClick={() => handleComment(post.id)}
                    className="flex items-center space-x-2 text-gray-600 hover:text-pink-500 hover:bg-pink-50 rounded-xl"
                  >
                    <MessageCircle className="w-5 h-5" />
                    <span>{post.comments}</span>
                  </Button>
                  
                  <Button 
                    variant="ghost" 
                    onClick={() => handleShare(post.id)}
                    className="flex items-center space-x-2 text-gray-600 hover:text-pink-500 hover:bg-pink-50 rounded-xl"
                  >
                    <Share className="w-5 h-5" />
                    <span>{post.shares}</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Feed;
