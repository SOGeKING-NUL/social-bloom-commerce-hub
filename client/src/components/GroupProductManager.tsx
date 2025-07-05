import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, ShoppingCart, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface GroupProductManagerProps {
  groupId: string;
  vendorId: string;
  isGroupMember: boolean;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category: string | null;
  vendor_id: string;
}

interface GroupProduct {
  id: string;
  group_id: string;
  product_id: string;
  added_by: string;
  added_at: string;
  product: Product;
}

const GroupProductManager = ({ groupId, vendorId, isGroupMember }: GroupProductManagerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch existing group products 
  const { data: groupProducts, isLoading: groupProductsLoading } = useQuery({
    queryKey: ['group-products', groupId],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.rpc('get_group_products', {
          p_group_id: groupId
        });
        
        if (error) {
          console.warn('Using fallback for group products:', error.message);
          return [];
        }
        
        const formattedData: GroupProduct[] = (data || []).map((item: any) => ({
          id: item.id,
          group_id: item.group_id,
          product_id: item.product_id,
          added_by: item.added_by,
          added_at: item.added_at,
          product: {
            id: item.product_id,
            name: item.product_name || 'Unknown Product',
            description: item.product_description,
            price: item.product_price || 0,
            image_url: item.product_image_url,
            category: item.product_category,
            vendor_id: item.product_vendor_id
          }
        }));
        
        return formattedData;
      } catch (err) {
        console.error('Failed to fetch group products:', err);
        return [];
      }
    },
    enabled: !!groupId
  });

  // Fetch vendor products that aren't already in the group
  const { data: availableProducts, isLoading: productsLoading } = useQuery({
    queryKey: ['vendor-products', vendorId, groupId, searchTerm],
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
      
      // Filter out products already in the group
      const existingProductIds = groupProducts?.map(gp => gp.product?.id) || [];
      return data.filter(product => !existingProductIds.includes(product.id));
    },
    enabled: !!vendorId && isOpen
  });

  // Add product to group mutation
  const addProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase.rpc('add_product_to_group', {
        p_group_id: groupId,
        p_product_id: productId,
        p_added_by: user.id
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-products', groupId] });
      queryClient.invalidateQueries({ queryKey: ['vendor-products', vendorId, groupId] });
      toast({
        title: "Product Added",
        description: "Product has been added to the group successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add product to group.",
        variant: "destructive"
      });
    }
  });

  // Remove product from group mutation
  const removeProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      const { data, error } = await supabase.rpc('remove_product_from_group', {
        p_group_id: groupId,
        p_product_id: productId
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-products', groupId] });
      queryClient.invalidateQueries({ queryKey: ['vendor-products', vendorId, groupId] });
      toast({
        title: "Product Removed",
        description: "Product has been removed from the group.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to remove product from group.",
        variant: "destructive"
      });
    }
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
      toast({
        title: "Added to Cart",
        description: "Product has been added to your cart.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add product to cart.",
        variant: "destructive"
      });
    }
  });

  if (groupProductsLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(2)].map((_, i) => (
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
        <h3 className="text-lg font-semibold">Group Products</h3>
        {isGroupMember && (
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700">
                <Plus className="w-4 h-4 mr-2" />
                Add Products
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Products to Group</DialogTitle>
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
                
                {productsLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="h-32 bg-gray-200 rounded animate-pulse"></div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {availableProducts?.map((product) => (
                      <Card key={product.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex gap-4">
                            <img
                              src={product.image_url || "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=200&h=150&fit=crop"}
                              alt={product.name}
                              className="w-16 h-16 object-cover rounded"
                            />
                            <div className="flex-1">
                              <h4 className="font-medium text-sm">{product.name}</h4>
                              <p className="text-xs text-gray-600 mt-1">
                                {product.description?.substring(0, 60)}...
                              </p>
                              <div className="flex items-center justify-between mt-2">
                                <span className="text-sm font-semibold text-pink-600">
                                  ${product.price}
                                </span>
                                <Button
                                  size="sm"
                                  onClick={() => addProductMutation.mutate(product.id)}
                                  disabled={addProductMutation.isPending}
                                  className="text-xs px-2 py-1 h-auto"
                                >
                                  Add to Group
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
                
                {!productsLoading && availableProducts?.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No additional products available from this vendor.</p>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {groupProducts?.map((groupProduct) => (
          <Card key={groupProduct.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex gap-4">
                <img
                  src={groupProduct.product?.image_url || "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=200&h=150&fit=crop"}
                  alt={groupProduct.product?.name}
                  className="w-20 h-20 object-cover rounded"
                />
                <div className="flex-1">
                  <h4 className="font-medium">{groupProduct.product?.name}</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    {groupProduct.product?.description?.substring(0, 80)}...
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-lg font-semibold text-pink-600">
                      ${groupProduct.product?.price}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => addToCartMutation.mutate(groupProduct.product?.id)}
                        disabled={addToCartMutation.isPending}
                        className="text-xs px-2 py-1 h-auto"
                      >
                        <ShoppingCart className="w-3 h-3 mr-1" />
                        Add to Cart
                      </Button>
                      {isGroupMember && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => removeProductMutation.mutate(groupProduct.product?.id)}
                          disabled={removeProductMutation.isPending}
                          className="text-xs px-2 py-1 h-auto text-red-600 hover:text-red-700"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  {groupProduct.product?.category && (
                    <Badge variant="secondary" className="mt-2 text-xs">
                      {groupProduct.product.category}
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {groupProducts?.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">No products added to this group yet.</p>
        </div>
      )}
    </div>
  );
};

export default GroupProductManager;