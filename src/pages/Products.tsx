
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Filter } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";

const Products = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");

  // Fetch products
  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products', searchTerm, selectedCategory],
    queryFn: async () => {
      console.log('Fetching products...');
      let query = supabase
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
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (searchTerm) {
        query = query.ilike('name', `%${searchTerm}%`);
      }
      
      if (selectedCategory) {
        query = query.eq('category', selectedCategory);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching products:', error);
        throw error;
      }
      
      console.log('Raw products data:', data);
      
      // Process the data to handle vendor_kyc properly and filter out problematic entries
      const processedProducts = (data || [])
        .filter(product => {
          // Filter out products where vendor_kyc is an error object
          if (product.vendor_kyc && typeof product.vendor_kyc === 'object' && !Array.isArray(product.vendor_kyc)) {
            if ('error' in product.vendor_kyc) {
              console.log('Filtering out product with vendor_kyc error:', product.id);
              return false;
            }
          }
          return true;
        })
        .map(product => ({
          ...product,
          vendor_kyc: Array.isArray(product.vendor_kyc) ? product.vendor_kyc : []
        }));
      
      console.log('Processed products:', processedProducts);
      return processedProducts;
    },
  });

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ['product-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('category')
        .not('category', 'is', null)
        .eq('is_active', true);
      
      if (error) throw error;
      
      const uniqueCategories = [...new Set(data.map(item => item.category))];
      return uniqueCategories.filter(Boolean);
    },
  });

  console.log('Products state:', { products, isLoading });

  return (
    <div className="min-h-screen">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4">Products</h1>
            <p className="text-xl text-gray-600">Discover amazing products from our community</p>
          </div>

          {/* Search and Filter */}
          <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-md bg-white"
              >
                <option value="">All Categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm("");
                  setSelectedCategory("");
                }}
              >
                <Filter className="w-4 h-4 mr-2" />
                Clear
              </Button>
            </div>
          </div>

          {/* Products Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="smooth-card animate-pulse">
                  <div className="h-48 bg-gray-200 rounded mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="text-xl font-semibold text-gray-600 mb-2">No products found</h3>
              <p className="text-gray-500">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Products;
