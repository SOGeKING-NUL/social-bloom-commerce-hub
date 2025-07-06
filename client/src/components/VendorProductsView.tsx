import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, ShoppingCart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface VendorProductsViewProps {
  vendorId: string;
  groupId: string;
  isGroupMember: boolean;
}

const VendorProductsView = ({ vendorId, groupId, isGroupMember }: VendorProductsViewProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch vendor products
  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['vendor-products', vendorId, searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select('*')
        .eq('vendor_id', vendorId)
        .eq('is_active', true);
      
      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!vendorId
  });

  // Add to cart mutation
  const addToCartMutation = useMutation({
    mutationFn: async (productId: string) => {
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('cart_items')
        .upsert({
          user_id: user.id,
          product_id: productId,
          quantity: 1
        }, {
          onConflict: 'user_id,product_id'
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart-items', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['cart-count', user?.id] });
      toast({
        title: "Added to Cart",
        description: "Product has been added to your cart.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add product to cart.",
        variant: "destructive"
      });
    }
  });

  if (productsLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Vendor Products</h3>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700">
              <Search className="w-4 h-4 mr-2" />
              Browse Products
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Browse Vendor Products</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {products?.map((product) => (
                  <Card key={product.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        <img
                          src={product.image_url || "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=200&h=150&fit=crop"}
                          alt={product.name}
                          className="w-20 h-20 object-cover rounded"
                        />
                        <div className="flex-1">
                          <h4 className="font-medium">{product.name}</h4>
                          <p className="text-sm text-gray-600 mt-1">
                            {product.description?.substring(0, 80)}...
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-lg font-semibold text-pink-600">
                              ${product.price}
                            </span>
                            <Button
                              size="sm"
                              onClick={() => addToCartMutation.mutate(product.id)}
                              disabled={addToCartMutation.isPending}
                              className="text-xs px-2 py-1 h-auto"
                            >
                              <ShoppingCart className="w-3 h-3 mr-1" />
                              Add to Cart
                            </Button>
                          </div>
                          {product.category && (
                            <Badge variant="secondary" className="mt-2 text-xs">
                              {product.category}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              {products?.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500">No products found from this vendor.</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Featured Products Display */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {products?.slice(0, 4).map((product) => (
          <Card key={product.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex gap-4">
                <img
                  src={product.image_url || "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=200&h=150&fit=crop"}
                  alt={product.name}
                  className="w-20 h-20 object-cover rounded"
                />
                <div className="flex-1">
                  <h4 className="font-medium">{product.name}</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    {product.description?.substring(0, 80)}...
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-lg font-semibold text-pink-600">
                      ${product.price}
                    </span>
                    {isGroupMember && (
                      <Button
                        size="sm"
                        onClick={() => addToCartMutation.mutate(product.id)}
                        disabled={addToCartMutation.isPending}
                        className="text-xs px-2 py-1 h-auto"
                      >
                        <ShoppingCart className="w-3 h-3 mr-1" />
                        Add to Cart
                      </Button>
                    )}
                  </div>
                  {product.category && (
                    <Badge variant="secondary" className="mt-2 text-xs">
                      {product.category}
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {products && products.length > 4 && (
        <div className="text-center">
          <Button 
            variant="outline" 
            onClick={() => setIsOpen(true)}
            className="border-pink-200 text-pink-600 hover:bg-pink-50"
          >
            View All {products.length} Products
          </Button>
        </div>
      )}

      {(!products || products.length === 0) && (
        <div className="text-center py-8">
          <p className="text-gray-500">No products available from this vendor.</p>
        </div>
      )}
    </div>
  );
};

export default VendorProductsView;