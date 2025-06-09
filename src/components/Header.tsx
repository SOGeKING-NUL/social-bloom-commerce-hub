
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Users, Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useLocation } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const Header = () => {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Signed out successfully",
        description: "You have been logged out.",
      });
      navigate("/");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-pink-100 bg-white/90 backdrop-blur-lg">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div 
            className="flex items-center space-x-2 cursor-pointer"
            onClick={() => navigate("/")}
          >
            <div className="w-10 h-10 bg-gradient-to-br from-pink-400 to-rose-500 rounded-2xl flex items-center justify-center">
              <Heart className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold gradient-text">SocialShop</span>
          </div>
          
          <nav className="hidden md:flex items-center space-x-8">
            <button 
              onClick={() => navigate("/feed")}
              className={`transition-colors duration-300 ${
                isActive("/feed") 
                  ? "text-pink-500 font-medium" 
                  : "text-gray-600 hover:text-pink-500"
              }`}
            >
              Feed
            </button>
            <button 
              onClick={() => navigate("/products")}
              className={`transition-colors duration-300 ${
                isActive("/products") 
                  ? "text-pink-500 font-medium" 
                  : "text-gray-600 hover:text-pink-500"
              }`}
            >
              Products
            </button>
            <button 
              onClick={() => navigate("/groups")}
              className={`transition-colors duration-300 ${
                isActive("/groups") 
                  ? "text-pink-500 font-medium" 
                  : "text-gray-600 hover:text-pink-500"
              }`}
            >
              Groups
            </button>
            <button 
              onClick={() => navigate("/")}
              className={`transition-colors duration-300 ${
                isActive("/") 
                  ? "text-pink-500 font-medium" 
                  : "text-gray-600 hover:text-pink-500"
              }`}
            >
              About
            </button>
          </nav>
          
          <div className="flex items-center space-x-4">
            {user ? (
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">Welcome back!</span>
                <Button 
                  variant="outline" 
                  onClick={handleSignOut}
                  className="social-button border-pink-200 text-pink-600 hover:bg-pink-50"
                >
                  Sign Out
                </Button>
              </div>
            ) : (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => navigate("/auth")}
                  className="social-button border-pink-200 text-pink-600 hover:bg-pink-50"
                >
                  Login
                </Button>
                <Button 
                  onClick={() => navigate("/auth")}
                  className="social-button bg-gradient-to-r from-pink-500 to-rose-400 hover:from-pink-600 hover:to-rose-500"
                >
                  <Users className="w-4 h-4 mr-2" />
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
