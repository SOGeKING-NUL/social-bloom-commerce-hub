import { Button } from "@/components/ui/button";
import { ShoppingCart, Users, Heart } from "@phosphor-icons/react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useProductRating } from "@/hooks/useProductRating";
import StarRating from "./StarRating";

interface HighlightProductCardProps {
  product: {
    id: string;
    name: string;
    price: number;
    image_url?: string;
    category?: string;
    description?: string;
  };
  vendor: {
    id: string;
    full_name?: string;
    email: string;
  };
  index?: number;
}

const HighlightProductCard = ({ product, vendor, index }: HighlightProductCardProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const vendorName = vendor.full_name || vendor.email?.split("@")[0] || "Unknown Vendor";

  // Check if product is in wishlist
  const { data: isInWishlist = false } = useQuery({
    queryKey: ['wishlist-status', product.id, user?.id],
    queryFn: async () => {
      if (!user || !product.id) return false;
      
      const { data, error } = await supabase
        .from('wishlist')
        .select('id')
        .eq('user_id', user.id)
        .eq('product_id', product.id)
        .maybeSingle();
      
      if (error) {
        console.error('Wishlist check error:', error);
        return false;
      }
      
      return !!data;
    },
    enabled: !!user && !!product.id,
  });

  // Wishlist mutations
  const addToWishlistMutation = useMutation({
    mutationFn: async () => {
      if (!user || !product.id) throw new Error('Please login to add to wishlist');
      
      const { error } = await supabase
        .from('wishlist')
        .insert({
          user_id: user.id,
          product_id: product.id
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist-status', product.id, user?.id] });
      queryClient.invalidateQueries({ queryKey: ['wishlist-count', user?.id] });
      toast({ title: "Added to wishlist" });
    },
    onError: (error: any) => {
      console.error('Add to wishlist error:', error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const removeFromWishlistMutation = useMutation({
    mutationFn: async () => {
      if (!user || !product.id) throw new Error('Please login to remove from wishlist');
      
      const { error } = await supabase
        .from('wishlist')
        .delete()
        .eq('user_id', user.id)
        .eq('product_id', product.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist-status', product.id, user?.id] });
      queryClient.invalidateQueries({ queryKey: ['wishlist-count', user?.id] });
      toast({ title: "Removed from wishlist" });
    },
    onError: (error: any) => {
      console.error('Remove from wishlist error:', error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
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

  // Fetch product rating and review count
  const { data: ratingData } = useProductRating(product.id);

  // Fetch product images
  const { data: productImages } = useQuery({
    queryKey: ["product-images", product.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_images")
        .select("image_url, is_primary, display_order")
        .eq("product_id", product.id)
        .order("display_order");

      if (error) throw error;
      return data || [];
    },
    enabled: !!product.id,
  });

  // Fetch discount tiers for this product
  const { data: tiers, isLoading } = useQuery({
    queryKey: ["product-tiers", product.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_discount_tiers")
        .select("discount_percentage")
        .eq("product_id", product.id)
        .order("tier_number");

      if (error) throw error;
      return data;
    },
    enabled: !!product.id,
  });

  // Fetch product categories
  const { data: productCategories } = useQuery({
    queryKey: ['product-categories', product.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_category_mappings')
        .select(`
          product_categories!inner(name)
        `)
        .eq('product_id', product.id);

      if (error) throw error;
      return data?.map((item: any) => item.product_categories.name) || [];
    },
    enabled: !!product.id,
  });

  // Determine if tiers exist and calculate max discount
  const hasTiers = tiers && tiers.length > 0;
  const maxDiscount = hasTiers
    ? Math.max(...tiers.map((tier) => tier.discount_percentage))
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: index * 0.05 }}
      className="group relative w-full"
    >
      {/* Main Card Container */}
      <div className="relative overflow-hidden rounded-2xl bg-white shadow-lg transition-all duration-500 hover:shadow-2xl hover:shadow-pink-300/50 hover:scale-[1.02]">
        {/* Optimized Image Container */}
        <div className="relative w-full aspect-[4/3] overflow-hidden bg-gray-100">
          <img
            src={productImages && productImages.length > 0 
              ? productImages[0]?.image_url 
              : product.image_url || "/placeholder.svg"
            }
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-700 cursor-pointer hover:scale-105"
            onClick={() => navigate(`/products/${product.id}`)}
            loading="lazy"
          />
          <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-white/30 to-transparent" />
          <button 
            className="absolute top-3 right-3 p-2 rounded-full bg-white/80 backdrop-blur-sm border border-white/50 transition-all duration-300 hover:bg-white/90 hover:scale-110"
            onClick={(e) => {
              e.stopPropagation();
              handleWishlistToggle();
            }}
            disabled={addToWishlistMutation.isPending || removeFromWishlistMutation.isPending}
          >
            <Heart 
              className={`w-4 h-4 transition-colors duration-200 ${
                isInWishlist 
                  ? 'text-pink-500 fill-pink-500' 
                  : 'text-gray-600 hover:text-pink-500'
              }`} 
              weight={isInWishlist ? "fill" : "regular"}
            />
          </button>
        </div>

        {/* Compact Content Area */}
        <div className="relative bg-white p-4 space-y-3">
          {/* Price */}
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight">₹{product.price}</h2>
          </div>

          {/* Categories Row */}
          {productCategories && productCategories.length > 0 && (
            <div className="flex items-center gap-1 overflow-hidden">
              {productCategories.slice(0, 2).map((category: string) => (
                <span
                  key={category}
                  className="text-xs text-slate-500 uppercase tracking-wide font-medium bg-gray-100 px-2 py-1 rounded-md flex-shrink-0"
                >
                  {category}
                </span>
              ))}
              {productCategories.length > 2 && (
                <span className="text-xs text-slate-500 uppercase tracking-wide font-medium bg-gray-100 px-2 py-1 rounded-md flex-shrink-0">
                  +{productCategories.length - 2} more
                </span>
              )}
            </div>
          )}

          {/* Product Title and Description */}
          <div className="space-y-1">
            <h3 
              className="text-base font-semibold text-slate-800 leading-tight line-clamp-1 cursor-pointer hover:text-pink-600 transition-colors duration-200"
              onClick={() => navigate(`/products/${product.id}`)}
            >
              {product.name}
            </h3>
            <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">
              {product.description || "Quality product perfect for group orders"}
            </p>
            
            {/* Rating Display */}
            <div className="flex items-center gap-2 pt-1">
              <StarRating rating={Math.round(ratingData?.averageRating || 0)} size="sm" />
              <span className="text-xs text-slate-500">
                {ratingData?.averageRating && ratingData.averageRating > 0 
                  ? `${ratingData.averageRating.toFixed(1)} (${ratingData.reviewCount || 0} ${ratingData.reviewCount === 1 ? 'review' : 'reviews'})`
                  : `(0)`
                }
              </span>
            </div>
          </div>

          {/* Group Benefits Row - Only show when tiers are available */}
          {hasTiers && !isLoading && (
            <div className="flex items-center gap-6 py-2">
              <div className="text-center">
                <div className="text-sm font-bold text-slate-800">
                  {maxDiscount}%
                </div>
                <div className="text-xs text-slate-500 uppercase tracking-wide font-medium">Discount</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-bold text-slate-800">
                  Groups
                </div>
                <div className="text-xs text-slate-500 uppercase tracking-wide font-medium">
                  Available
                </div>
              </div>
            </div>
          )}

          {/* Vendor Info */}
          <div className="border-t border-slate-100 pt-3">
            <div className="flex items-center justify-between text-sm mb-3">
              <span className="text-slate-500">
                Sold by{" "}
                <span 
                  className="text-pink-600 font-medium cursor-pointer hover:text-pink-700 transition-colors duration-200"
                  onClick={() => navigate(`/users/${vendor.id}`)}
                >
                  {vendorName}
                </span>
              </span>
            </div>

            {/* Action Buttons - Conditional based on tiers */}
            <div className="flex gap-2">
              <Button
                onClick={() => navigate(`/products/${product.id}`)}
                variant="outline"
                className={`h-9 border-slate-300 hover:border-slate-400 text-sm ${hasTiers ? "flex-1" : "w-full"}`}
              >
                <ShoppingCart className="w-4 h-4 mr-1" />
                Add to Cart
              </Button>
              {hasTiers && (
                <Button
                  onClick={() => navigate(`/products/${product.id}`)}
                  className="flex-1 bg-gradient-to-r from-pink-500 to-rose-400 hover:from-pink-600 hover:to-rose-500 text-white font-medium h-9 text-sm"
                >
                  <Users className="w-4 h-4 mr-1" />
                  Start Group Order
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Subtle glow effect */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-pink-500/5 to-rose-500/5 blur-xl -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    </motion.div>
  );
};

export default HighlightProductCard;
 