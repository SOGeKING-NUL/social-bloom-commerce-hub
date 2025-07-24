import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Save, Upload, AlertCircle, Package, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { motion, AnimatePresence } from "framer-motion";

interface ProductFormData {
  name: string;
  description: string;
  price: number;
  category: string;
  stock_quantity: number;
  is_active: boolean;
  image_url: string;
}

interface ValidationErrors {
  name?: string;
  description?: string;
  price?: string;
  category?: string;
  stock_quantity?: string;
}

const EditProduct = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    description: '',
    price: 0,
    category: '',
    stock_quantity: 0,
    is_active: true,
    image_url: '',
  });
  
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isUploading, setIsUploading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Fetch product data
  const { data: product, isLoading, error } = useQuery({
    queryKey: ['product', productId],
    queryFn: async () => {
      if (!productId) throw new Error('Product ID is required');
      
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .eq('vendor_id', user?.id) // Ensure user owns the product
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!productId && !!user?.id,
  });

  // Initialize form when product loads
  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        description: product.description || '',
        price: product.price || 0,
        category: product.category || '',
        stock_quantity: product.stock_quantity || 0,
        is_active: product.is_active ?? true,
        image_url: product.image_url || '',
      });
    }
  }, [product]);

  // Validation function
  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Product name is required';
    } else if (formData.name.length < 3) {
      newErrors.name = 'Product name must be at least 3 characters';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Product description is required';
    } else if (formData.description.length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    }

    if (formData.price <= 0) {
      newErrors.price = 'Price must be greater than 0';
    } else if (formData.price > 1000000) {
      newErrors.price = 'Price cannot exceed ₹10,00,000';
    }

    if (!formData.category.trim()) {
      newErrors.category = 'Category is required';
    }

    if (formData.stock_quantity < 0) {
      newErrors.stock_quantity = 'Stock quantity cannot be negative';
    } else if (formData.stock_quantity > 10000) {
      newErrors.stock_quantity = 'Stock quantity cannot exceed 10,000';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Update product mutation
  const updateProductMutation = useMutation({
    mutationFn: async (updatedData: ProductFormData) => {
      if (!productId) throw new Error('Product ID is required');
      
      const { error } = await supabase
        .from('products')
        .update({
          ...updatedData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', productId)
        .eq('vendor_id', user?.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Product updated successfully!" });
      queryClient.invalidateQueries({ queryKey: ['product', productId] });
      queryClient.invalidateQueries({ queryKey: ['vendor-products'] });
      navigate(`/users/${user?.id}`);
    },
    onError: (error: any) => {
      toast({ 
        title: "Error updating product", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Delete product mutation
  const deleteProductMutation = useMutation({
    mutationFn: async () => {
      if (!productId) throw new Error('Product ID is required');
      
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId)
        .eq('vendor_id', user?.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Product deleted successfully!" });
      queryClient.invalidateQueries({ queryKey: ['vendor-products'] });
      queryClient.invalidateQueries({ queryKey: ['vendor-stats'] });
      navigate(`/users/${user?.id}`);
    },
    onError: (error: any) => {
      toast({ 
        title: "Error deleting product", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        title: "Please fix the errors below",
        variant: "destructive"
      });
      return;
    }

    updateProductMutation.mutate(formData);
  };

  // Handle delete confirmation
  const handleDelete = () => {
    setShowDeleteDialog(false);
    deleteProductMutation.mutate();
  };

  // Handle input changes
  const handleInputChange = (field: keyof ProductFormData, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error for this field when user starts typing
    if (errors[field as keyof ValidationErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  // Handle image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 5MB",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}/${productId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);

      setFormData(prev => ({ ...prev, image_url: publicUrl }));
      
      toast({ title: "Image uploaded successfully!" });
    } catch (error: any) {
      toast({
        title: "Error uploading image",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  if (!user) {
    navigate('/auth');
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center mt-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center mt-20">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Product not found</h1>
            <p className="text-gray-600 mb-4">You can only edit your own products.</p>
            <Button onClick={() => navigate(`/users/${user.id}`)}>
              Go Back to Profile
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      
      <div className="flex-1 container mx-auto px-2 sm:px-4 py-4 sm:py-8 mt-20">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6"
        >
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="outline"
              onClick={() => navigate(`/users/${user.id}`)}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Profile
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <Package className="w-6 h-6 text-pink-600" />
            <h1 className="text-3xl font-bold text-gray-900">Edit Product</h1>
          </div>
          <p className="text-gray-600 mt-2">Update your product information and details</p>
        </motion.div>

        {/* Main Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="max-w-2xl mx-auto"
        >
          <Card>
            <CardHeader>
              <CardTitle>Product Details</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Product Image */}
                <div className="space-y-2">
                  <Label htmlFor="image">Product Image</Label>
                  <div className="flex flex-col gap-4">
                    {formData.image_url && (
                      <div className="relative w-32 h-32 rounded-lg overflow-hidden bg-gray-100">
                        <img
                          src={formData.image_url}
                          alt="Product preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Input
                        id="image"
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={isUploading}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        disabled={isUploading}
                        className="flex items-center gap-2"
                      >
                        <Upload className="w-4 h-4" />
                        {isUploading ? 'Uploading...' : 'Upload'}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Product Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">Product Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Enter product name"
                    className={errors.name ? 'border-red-500' : ''}
                  />
                  {errors.name && (
                    <div className="flex items-center gap-1 text-red-500 text-sm">
                      <AlertCircle className="w-4 h-4" />
                      {errors.name}
                    </div>
                  )}
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Input
                    id="category"
                    value={formData.category}
                    onChange={(e) => handleInputChange('category', e.target.value)}
                    placeholder="e.g. Electronics, Clothing, Books"
                    className={errors.category ? 'border-red-500' : ''}
                  />
                  {errors.category && (
                    <div className="flex items-center gap-1 text-red-500 text-sm">
                      <AlertCircle className="w-4 h-4" />
                      {errors.category}
                    </div>
                  )}
                </div>

                {/* Price and Stock */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price">Price (₹) *</Label>
                    <Input
                      id="price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className={errors.price ? 'border-red-500' : ''}
                    />
                    {errors.price && (
                      <div className="flex items-center gap-1 text-red-500 text-sm">
                        <AlertCircle className="w-4 h-4" />
                        {errors.price}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="stock">Stock Quantity</Label>
                    <Input
                      id="stock"
                      type="number"
                      min="0"
                      value={formData.stock_quantity}
                      onChange={(e) => handleInputChange('stock_quantity', parseInt(e.target.value) || 0)}
                      placeholder="0"
                      className={errors.stock_quantity ? 'border-red-500' : ''}
                    />
                    {errors.stock_quantity && (
                      <div className="flex items-center gap-1 text-red-500 text-sm">
                        <AlertCircle className="w-4 h-4" />
                        {errors.stock_quantity}
                      </div>
                    )}
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Describe your product in detail..."
                    rows={4}
                    className={errors.description ? 'border-red-500' : ''}
                  />
                  {errors.description && (
                    <div className="flex items-center gap-1 text-red-500 text-sm">
                      <AlertCircle className="w-4 h-4" />
                      {errors.description}
                    </div>
                  )}
                </div>

                {/* Active Status */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label htmlFor="active">Product Status</Label>
                    <p className="text-sm text-gray-600">
                      {formData.is_active ? 'Product is active and visible to customers' : 'Product is inactive and hidden from customers'}
                    </p>
                  </div>
                  <Switch
                    id="active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => handleInputChange('is_active', checked)}
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-4 pt-4">
                  <div className="flex gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => navigate(`/users/${user.id}`)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={updateProductMutation.isPending}
                      className="flex-1 bg-gradient-to-r from-pink-500 to-rose-400 hover:from-pink-600 hover:to-rose-500"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {updateProductMutation.isPending ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                  
                  {/* Delete Button */}
                  <div className="border-t pt-4">
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => setShowDeleteDialog(true)}
                      disabled={deleteProductMutation.isPending}
                      className="w-full"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      {deleteProductMutation.isPending ? 'Deleting...' : 'Delete Product'}
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AnimatePresence>
        {showDeleteDialog && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-md"
            >
            <Card className="bg-white shadow-2xl">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                    <Trash2 className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Delete Product</CardTitle>
                    <p className="text-sm text-gray-600 mt-1">This action cannot be undone</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800 text-sm">
                    Are you sure you want to delete "<strong>{formData.name}</strong>"? 
                    This will permanently remove the product from your store and cannot be undone.
                  </p>
                </div>
                
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowDeleteDialog(false)}
                    className="flex-1"
                    disabled={deleteProductMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={deleteProductMutation.isPending}
                    className="flex-1"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {deleteProductMutation.isPending ? 'Deleting...' : 'Delete Product'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
        )}
      </AnimatePresence>

      <Footer />
    </div>
  );
};

export default EditProduct; 