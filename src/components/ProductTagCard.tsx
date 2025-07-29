import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import StarRating from "@/components/StarRating";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ProductTagCardProps {
  product: {
    id: string;
    name: string;
    price: number;
    image_url: string | null;
    vendor_id: string;
  };
  onSelect: (productId: string) => void;
  isSelected: boolean;
}

const ProductTagCard: React.FC<ProductTagCardProps> = ({ 
  product, 
  onSelect, 
  isSelected 
}) => {
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
  });

  // Fetch average rating and review count
  const { data: averageRating } = useQuery({
    queryKey: ['product-rating', product.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_product_average_rating', {
        product_uuid: product.id
      });
      if (error) throw error;
      return data || 0;
    },
  });

  const { data: reviewCount } = useQuery({
    queryKey: ['product-review-count', product.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_product_review_count', {
        product_uuid: product.id
      });
      if (error) throw error;
      return data || 0;
    },
  });

  return (
    <Card 
      className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
        isSelected 
          ? 'ring-2 ring-pink-500 bg-pink-50' 
          : 'hover:bg-gray-50'
      }`}
      onClick={() => onSelect(product.id)}
    >
      <CardContent className="p-3">
        <div className="flex flex-col space-y-2">
          {/* Product Image */}
          <div className="relative">
            <img
              src={product.image_url || "/placeholder.svg"}
              alt={product.name}
              className="w-full h-24 object-cover rounded-lg"
              onError={(e) => {
                e.currentTarget.src = "/placeholder.svg";
              }}
            />
            {isSelected && (
              <div className="absolute top-1 right-1 bg-pink-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                ✓
              </div>
            )}
          </div>

          {/* Product Name */}
          <h3 className="font-medium text-sm text-gray-900 line-clamp-2">
            {product.name}
          </h3>

          {/* Price */}
          <p className="text-sm font-semibold text-pink-600">
            ₹{product.price.toLocaleString()}
          </p>

          {/* Categories */}
          {productCategories && productCategories.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {productCategories.slice(0, 2).map((category, index) => (
                <Badge 
                  key={index} 
                  variant="secondary" 
                  className="text-xs px-1 py-0"
                >
                  {category}
                </Badge>
              ))}
              {productCategories.length > 2 && (
                <Badge variant="secondary" className="text-xs px-1 py-0">
                  +{productCategories.length - 2}
                </Badge>
              )}
            </div>
          )}

          {/* Rating */}
          {averageRating && averageRating > 0 && (
            <div className="flex items-center gap-1">
              <StarRating rating={averageRating} size="sm" />
              <span className="text-xs text-gray-500">
                ({reviewCount || 0})
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ProductTagCard; 