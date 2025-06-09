
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Heart, MessageCircle, Share } from "lucide-react";

const SocialFeed = () => {
  const posts = [
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
      product: "Modern Living Set"
    },
    {
      id: 3,
      user: {
        name: "Emma Davis",
        avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
        username: "@emma_d"
      },
      content: "My furry friend absolutely loves these new organic treats! Made with all natural ingredients and he can't get enough 🐱",
      image: "https://images.unsplash.com/photo-1582562124811-c09040d0a901?w=500&h=400&fit=crop",
      likes: 67,
      comments: 15,
      shares: 9,
      product: "Organic Pet Treats"
    }
  ];

  return (
    <section className="py-20 bg-gradient-to-b from-white to-pink-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">Community Feed</h2>
          <p className="text-xl text-gray-600">See what our community is sharing and discovering</p>
        </div>
        
        <div className="max-w-2xl mx-auto space-y-8">
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
              
              <div className="mb-4 rounded-2xl overflow-hidden">
                <img 
                  src={post.image} 
                  alt={post.product}
                  className="w-full h-64 object-cover hover:scale-105 transition-transform duration-300"
                />
              </div>
              
              <div className="flex items-center justify-between border-t border-pink-100 pt-4">
                <Button variant="ghost" className="flex items-center space-x-2 text-gray-600 hover:text-pink-500 hover:bg-pink-50 rounded-xl">
                  <Heart className="w-5 h-5" />
                  <span>{post.likes}</span>
                </Button>
                
                <Button variant="ghost" className="flex items-center space-x-2 text-gray-600 hover:text-pink-500 hover:bg-pink-50 rounded-xl">
                  <MessageCircle className="w-5 h-5" />
                  <span>{post.comments}</span>
                </Button>
                
                <Button variant="ghost" className="flex items-center space-x-2 text-gray-600 hover:text-pink-500 hover:bg-pink-50 rounded-xl">
                  <Share className="w-5 h-5" />
                  <span>{post.shares}</span>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SocialFeed;
