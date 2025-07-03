
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, X, Plus, Minus } from "lucide-react";

interface ProductFormData {
  name: string;
  description: string;
  price: number;
  category: string;
  stock_quantity: number;
  image: File | null;
}

interface TieredDiscount {
  min_quantity: number;
  discount_percentage: number;
}

const categories = [
  "Electronics",
  "Clothing",
  "Home & Garden",
  "Sports & Outdoors",
  "Books",
  "Beauty & Personal Care",
  "Toys & Games",
  "Food & Beverages",
  "Health & Wellness",
  "Automotive",
  "Other"
];

const ProductForm = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState<ProductFormData>({
    name: "",
    description: "",
    price: 0,
    category: "",
    stock_quantity: 0,
    image: null
  });
  
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [tieredDiscounts, setTieredDiscounts] = useState<TieredDiscount[]>([
    { min_quantity: 2, discount_percentage: 10 },
    { min_quantity: 5, discount_percentage: 15 },
    { min_quantity: 10, discount_percentage: 20 }
  ]);

  const createProductMutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
      if (!user) throw new Error('Not authenticated');
      
      let imageUrl = null;
      
      // Upload image if provided
      if (data.image) {
        const fileExt = data.image.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(fileName, data.image);
        
        if (uploadError) throw uploadError;
        
        const { data: urlData } = supabase.storage
          .from('product-images')
          .getPublicUrl(fileName);
        
        imageUrl = urlData.publicUrl;
      }
      
      // Create product
      const { data: product, error } = await supabase
        .from('products')
        .insert({
          vendor_id: user.id,
          name: data.name,
          description: data.description,
          price: data.price,
          category: data.category,
          stock_quantity: data.stock_quantity,
          image_url: imageUrl,
          is_active: true
        })
        .select()
        .single();
      
      if (error) throw error;
      return product;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-products'] });
      toast({
        title: "Product Created",
        description: "Your product has been created successfully!",
      });
      // Reset form
      setFormData({
        name: "",
        description: "",
        price: 0,
        category: "",
        stock_quantity: 0,
        image: null
      });
      setImagePreview(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create product",
        variant: "destructive",
      });
    }
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData({ ...formData, image: file });
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setFormData({ ...formData, image: null });
    setImagePreview(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.price || !formData.category) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    
    createProductMutation.mutate(formData);
  };

  const addTieredDiscount = () => {
    setTieredDiscounts([
      ...tieredDiscounts,
      { min_quantity: 1, discount_percentage: 5 }
    ]);
  };

  const removeTieredDiscount = (index: number) => {
    setTieredDiscounts(tieredDiscounts.filter((_, i) => i !== index));
  };

  const updateTieredDiscount = (index: number, field: keyof TieredDiscount, value: number) => {
    const updated = tieredDiscounts.map((discount, i) => 
      i === index ? { ...discount, [field]: value } : discount
    );
    setTieredDiscounts(updated);
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Add New Product</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Product Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter product name"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe your product"
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="price">Price ($) *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="stock">Stock Quantity</Label>
                <Input
                  id="stock"
                  type="number"
                  min="0"
                  value={formData.stock_quantity}
                  onChange={(e) => setFormData({ ...formData, stock_quantity: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="category">Category *</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Image Upload */}
          <div>
            <Label>Product Image</Label>
            <div className="mt-2">
              {imagePreview ? (
                <div className="relative inline-block">
                  <img 
                    src={imagePreview} 
                    alt="Preview" 
                    className="w-32 h-32 object-cover rounded-lg border"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full p-0"
                    onClick={removeImage}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500 mb-2">Upload product image</p>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="max-w-xs"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Tiered Discounts */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <Label>Tiered Discounts</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addTieredDiscount}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Tier
              </Button>
            </div>
            
            <div className="space-y-3">
              {tieredDiscounts.map((discount, index) => (
                <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                  <div className="flex-1">
                    <Label className="text-xs">Min Quantity</Label>
                    <Input
                      type="number"
                      min="1"
                      value={discount.min_quantity}
                      onChange={(e) => updateTieredDiscount(index, 'min_quantity', parseInt(e.target.value) || 1)}
                      className="mt-1"
                    />
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs">Discount %</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={discount.discount_percentage}
                      onChange={(e) => updateTieredDiscount(index, 'discount_percentage', parseInt(e.target.value) || 0)}
                      className="mt-1"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeTieredDiscount(index)}
                    className="mt-6"
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              
              {tieredDiscounts.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">
                  No tiered discounts configured. Add tiers to offer bulk discounts.
                </p>
              )}
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full"
            disabled={createProductMutation.isPending}
          >
            {createProductMutation.isPending ? "Creating..." : "Create Product"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default ProductForm;
