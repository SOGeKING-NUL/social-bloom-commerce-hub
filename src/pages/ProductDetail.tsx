
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Heart, ShoppingCart, ArrowLeft, Star, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
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

const ProductDetail = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [quantity, setQuantity] = useState(1);
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [groupForm, setGroupForm] = useState({
    name: '',
    description: '',
  });

  // Fetch product details
  const { data: product, isLoading } = useQuery({
    queryKey: ['product', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          vendor_profile:profiles!vendor_id (
            full_name,
            email,
            avatar_url
          ),
          vendor_kyc:vendor_kyc!vendor_id (
            display_business_name,
            business_name
          )
        `)
        .eq('id', productId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!productId,
  });

  // Fetch related products
  const { data: relatedProducts = [] } = useQuery({
    queryKey: ['related-products', product?.category, productId],
    queryFn: async () => {
      if (!product?.category) return [];
      
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          vendor_profile:profiles!vendor_id (
            full_name,
            email
          ),
          vendor_kyc:vendor_kyc!vendor_id (
            display_business_name,
            business_name
          )
        `)
        .eq('category', product.category)
        .eq('is_active', true)
        .neq('id', productId)
        .limit(4);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!product?.category,
  });

  // Check if product is in wishlist
  const { data: isInWishlist } = useQuery({
    queryKey: ['wishlist-status', productId, user?.id],
    queryFn: async () => {
      if (!user || !productId) return false;
      
      const { data, error } = await supabase
        .from('wishlist')
        .select('id')
        .eq('user_id', user.id)
        .eq('product_id', productId)
        .single();
      
      return !!data;
    },
    enabled: !!user && !!productId,
  });

  // Wishlist mutations
  const addToWishlistMutation = useMutation({
    mutationFn: async () => {
      if (!user || !productId) throw new Error('Please login to add to wishlist');
      
      const { error } = await supabase
        .from('wishlist')
        .insert({
          user_id: user.id,
          product_id: productId
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist-status'] });
      queryClient.invalidateQueries({ queryKey: ['wishlist-count'] });
      toast({ title: "Added to wishlist" });
    },
  });

  const removeFromWishlistMutation = useMutation({
    mutationFn: async () => {
      if (!user || !productId) throw new Error('Please login');
      
      const { error } = await supabase
        .from('wishlist')
        .delete()
        .eq('user_id', user.id)
        .eq('product_id', productId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist-status'] });
      queryClient.invalidateQueries({ queryKey: ['wishlist-count'] });
      toast({ title: "Removed from wishlist" });
    },
  });

  // Add to cart mutation
  const addToCartMutation = useMutation({
    mutationFn: async () => {
      if (!user || !productId) throw new Error('Please login to add to cart');
      
      const { error } = await supabase
        .from('cart_items')
        .insert({
          user_id: user.id,
          product_id: productId,
          quantity: quantity
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
      if (!user || !productId) throw new Error('Please login to create a group');
      
      const { error } = await supabase
        .from('groups')
        .insert({
          name: groupForm.name,
          description: groupForm.description,
          creator_id: user.id,
          product_id: productId,
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
    if (Array.isArray(product?.vendor_kyc) && product.vendor_kyc.length > 0) {
      return product.vendor_kyc[0]?.display_business_name || 
             product.vendor_kyc[0]?.business_name;
    }
    return product?.vendor_profile?.full_name || 
           product?.vendor_profile?.email?.split('@')[0] || 
           'Unknown Vendor';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">Loading product...</div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">Product not found</div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Back button */}
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          {/* Product details */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
            <div className="relative">
              <img 
                src={product.image_url || "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=600&h=600&fit=crop"}
                alt={product.name}
                className="w-full h-96 object-cover rounded-lg"
              />
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-4 right-4 bg-white/80 hover:bg-white"
                onClick={handleWishlistToggle}
              >
                <Heart 
                  className={`w-6 h-6 ${isInWishlist ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} 
                />
              </Button>
            </div>

            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold mb-2">{product.name}</h1>
                <p className="text-lg text-pink-600">
                  by {getVendorName()}
                </p>
              </div>

              <div className="flex items-center space-x-4">
                <div className="flex items-center">
                  <Star className="w-5 h-5 text-yellow-400 fill-current" />
                  <span className="ml-1 text-lg">4.5</span>
                </div>
                <span className="text-gray-500">|</span>
                <span className="text-gray-600">Stock: {product.stock_quantity}</span>
              </div>

              <div className="text-4xl font-bold text-gray-800">
                ${product.price}
              </div>

              {product.description && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">Description</h3>
                  <p className="text-gray-600">{product.description}</p>
                </div>
              )}

              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <label className="font-medium">Quantity:</label>
                  <input
                    type="number"
                    min="1"
                    max={product.stock_quantity || 1}
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                    className="w-20 px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div className="space-y-3">
                  <Button
                    onClick={() => addToCartMutation.mutate()}
                    className="w-full bg-gradient-to-r from-pink-500 to-rose-400 hover:from-pink-600 hover:to-rose-500"
                    disabled={addToCartMutation.isPending}
                  >
                    <ShoppingCart className="w-5 h-5 mr-2" />
                    Add to Cart
                  </Button>

                  <Dialog open={isGroupDialogOpen} onOpenChange={setIsGroupDialogOpen}>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full border-pink-200 text-pink-600 hover:bg-pink-50"
                      >
                        <Users className="w-5 h-5 mr-2" />
                        Create Group with this Product
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
              </div>
            </div>
          </div>

          {/* Related products */}
          {relatedProducts.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold mb-6">Related Products</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {relatedProducts.map((relatedProduct) => (
                  <ProductCard key={relatedProduct.id} product={relatedProduct} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default ProductDetail;
