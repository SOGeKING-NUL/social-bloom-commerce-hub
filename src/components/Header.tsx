
import { Button } from "@/components/ui/button";
import { Users, ShoppingBag, Heart } from "lucide-react";

const Header = () => {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-pink-100 bg-white/90 backdrop-blur-lg">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-br from-pink-400 to-rose-500 rounded-2xl flex items-center justify-center">
              <Heart className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold gradient-text">SocialShop</span>
          </div>
          
          <nav className="hidden md:flex items-center space-x-8">
            <a href="#" className="text-gray-600 hover:text-pink-500 transition-colors duration-300">Feed</a>
            <a href="#" className="text-gray-600 hover:text-pink-500 transition-colors duration-300">Products</a>
            <a href="#" className="text-gray-600 hover:text-pink-500 transition-colors duration-300">Groups</a>
            <a href="#" className="text-gray-600 hover:text-pink-500 transition-colors duration-300">About</a>
          </nav>
          
          <div className="flex items-center space-x-4">
            <Button variant="outline" className="social-button border-pink-200 text-pink-600 hover:bg-pink-50">
              Login
            </Button>
            <Button className="social-button bg-gradient-to-r from-pink-500 to-rose-400 hover:from-pink-600 hover:to-rose-500">
              <Users className="w-4 h-4 mr-2" />
              Join Now
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
