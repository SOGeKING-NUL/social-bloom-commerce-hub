
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import UserProfileDropdown from "@/components/UserProfileDropdown";
import CartIcon from "@/components/CartIcon";
import SearchDropdown from "@/components/SearchDropdown";

const Header = () => {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, signOut } = useAuth();



  // Fetch wishlist count
  const { data: wishlistCount } = useQuery({
    queryKey: ['wishlist-count', user?.id],
    queryFn: async () => {
      if (!user) return 0;
      
      const { data, error } = await supabase
        .from('wishlist')
        .select('id')
        .eq('user_id', user.id);
      
      if (error) return 0;
      return data.length;
    },
    enabled: !!user,
  });

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Signed out successfully",
        description: "You have been logged out.",
      });
      setLocation("/");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const isActive = (path: string) => location === path;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-pink-100 bg-white/90 backdrop-blur-lg">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div 
            className="flex items-center space-x-2 cursor-pointer"
            onClick={() => setLocation("/")}
          >
            <div className="w-10 h-10 bg-gradient-to-br from-pink-400 to-rose-500 rounded-2xl flex items-center justify-center">
              <Heart className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold gradient-text">SocialShop</span>
          </div>
          

          
          <div className="flex items-center space-x-4">
            <SearchDropdown />
            {user && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLocation("/wishlist")}
                  className="relative"
                >
                  <Heart className="w-4 h-4" />
                  {(wishlistCount || 0) > 0 && (
                    <span className="absolute -top-2 -right-2 bg-pink-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {wishlistCount || 0}
                    </span>
                  )}
                </Button>
                <CartIcon />
              </>
            )}
            
            {user ? (
              <UserProfileDropdown />
            ) : (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => setLocation("/auth")}
                  className="social-button border-pink-200 text-pink-600 hover:bg-pink-50"
                >
                  Login
                </Button>
                <Button 
                  onClick={() => setLocation("/auth")}
                  className="social-button bg-gradient-to-r from-pink-500 to-rose-400 hover:from-pink-600 hover:to-rose-500"
                >
                  <Heart className="w-4 h-4 mr-2" />
                  Join Now
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
