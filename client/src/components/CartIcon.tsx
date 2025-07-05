import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

const CartIcon = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Fetch cart count
  const { data: cartCount } = useQuery({
    queryKey: ['cart-count', user?.id],
    queryFn: async () => {
      if (!user) return 0;
      
      const { count, error } = await supabase
        .from('cart_items')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      
      if (error) throw error;
      return count || 0;
    },
    enabled: !!user,
  });

  const handleCartClick = () => {
    navigate('/cart');
  };

  return (
    <Button 
      variant="ghost" 
      size="sm" 
      className="relative"
      onClick={handleCartClick}
    >
      <ShoppingCart className="w-5 h-5" />
      {cartCount && cartCount > 0 && (
        <Badge 
          variant="destructive" 
          className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
        >
          {cartCount}
        </Badge>
      )}
    </Button>
  );
};

export default CartIcon;