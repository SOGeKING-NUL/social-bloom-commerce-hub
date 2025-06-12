
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, ShoppingCart, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    price: number;
    image_url?: string;
    vendor_profile?: {
      full_name?: string;
      email?: string;
    };
    vendor_kyc?: Array<{
      display_business_name?: string;
      business_name?: string;
    }>;
  };
}

const ProductCard = ({ product }: ProductCardProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [groupForm, setGroupForm] = useState({
    name: '',
    description: '',
  });

  // Check if product is in wishlist
  const { data: isInWishlist } = useQuery({
    queryKey: ['wishlist-status', product.id, user?.id],
    queryFn: async () => {
      if (!user) return false;
      
      const { data, error } = await supabase
        .from('wishlist')
        .select('id')
        .eq('user_id', user.id)
        .eq('product_id', product.id)
        .single();
      
      return !!data;
    },
    enabled: !!user,
  });

  // Wishlist mutations
  const addToWishlistMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Please login to add to wishlist');
      
      const { error } = await supabase
        .from('wishlist')
        .insert({
          user_id: user.id,
          product_id: product.id
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist-status'] });
      toast({ title: "Added to wishlist" });
    },
  });

  const removeFromWishlistMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Please login');
      
      const { error } = await supabase
        .from('wishlist')
        .delete()
        .eq('user_id', user.id)
        .eq('product_id', product.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist-status'] });
      toast({ title: "Removed from wishlist" });
    },
  });

  // Add to cart mutation
  const addToCartMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Please login to add to cart');
      
      const { error } = await supabase
        .from('cart_items')
        .insert({
          user_id: user.id,
          product_id: product.id,
          quantity: 1
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart-count'] });
      toast({ title: "Added to cart" });
    },
  });

  // Create group mutation
  const createGroupMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Please login to create a group');
      
      const { error } = await supabase
        .from('groups')
        .insert({
          name: groupForm.name,
          description: groupForm.description,
          creator_id: user.id,
          product_id: product.id,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      setIsGroupDialogOpen(false);
      setGroupForm({ name: '', description: '' });
      toast({ title: "Group created successfully!" });
      navigate('/groups');
    },
  });

  const handleWishlistToggle = () => {
    if (!user) {
      toast({ title: "Please login to add to wishlist" });
      return;
    }
    
    if (isInWishlist) {
      removeFromWishlistMutation.mutate();
    } else {
      addToWishlistMutation.mutate();
    }
  };

  const getVendorName = () => {
    if (Array.isArray(product.vendor_kyc) && product.vendor_kyc.length > 0) {
      return product.vendor_kyc[0]?.display_business_name || 
             product.vendor_kyc[0]?.business_name;
    }
    return product.vendor_profile?.full_name || 'Unknown Vendor';
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="relative">
        <img 
          src={product.image_url || "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=300&h=300&fit=crop"}
          alt={product.name}
          className="w-full h-48 object-cover cursor-pointer hover:scale-105 transition-transform duration-300"
          onClick={() => navigate(`/products/${product.id}`)}
        />
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-2 right-2 bg-white/80 hover:bg-white"
          onClick={handleWishlistToggle}
        >
          <Heart 
            className={`w-4 h-4 ${isInWishlist ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} 
          />
        </Button>
      </div>
      
      <CardContent className="p-4">
        <h3 
          className="font-semibold mb-1 cursor-pointer hover:text-pink-600"
          onClick={() => navigate(`/products/${product.id}`)}
        >
          {product.name}
        </h3>
        <p className="text-sm text-pink-600 mb-2">
          by {getVendorName()}
        </p>
        
        <div className="flex items-center justify-between mb-3">
          <span className="text-lg font-bold text-gray-800">${product.price}</span>
        </div>
        
        <div className="space-y-2">
          <Button
            onClick={() => addToCartMutation.mutate()}
            className="w-full bg-gradient-to-r from-pink-500 to-rose-400 hover:from-pink-600 hover:to-rose-500"
            disabled={addToCartMutation.isPending}
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            Add to Cart
          </Button>
          
          <Dialog open={isGroupDialogOpen} onOpenChange={setIsGroupDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="w-full border-pink-200 text-pink-600 hover:bg-pink-50"
                size="sm"
              >
                <Users className="w-4 h-4 mr-2" />
                Create Group
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Group for {product.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="groupName">Group Name</Label>
                  <Input
                    id="groupName"
                    value={groupForm.name}
                    onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                    placeholder="Enter group name"
                  />
                </div>
                <div>
                  <Label htmlFor="groupDescription">Description</Label>
                  <Textarea
                    id="groupDescription"
                    value={groupForm.description}
                    onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })}
                    placeholder="Describe your group"
                  />
                </div>
                <Button
                  onClick={() => createGroupMutation.mutate()}
                  className="w-full"
                  disabled={!groupForm.name || createGroupMutation.isPending}
                >
                  Create Group
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProductCard;
