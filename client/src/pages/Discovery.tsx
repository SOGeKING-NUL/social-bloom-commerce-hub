import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, ShoppingBag, User, Grid, X } from "lucide-react";
import { useLocation } from "wouter";
import Layout from "@/components/Layout";
import ProductCard from "@/components/ProductCard";

const Discovery = () => {
  const [location, setLocation] = useLocation();
  const [selectedCategory, setSelectedCategory] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [dropdownSearchTerm, setDropdownSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Get search term from URL params or state
  const urlParams = new URLSearchParams(window.location.search);
  const [searchTerm, setSearchTerm] = useState(urlParams.get('search') || "");

  // Dropdown search queries for live results
  const { data: dropdownProducts = [] } = useQuery({
    queryKey: ['dropdown-products', dropdownSearchTerm],
    queryFn: async () => {
      if (dropdownSearchTerm.length < 2) return [];
      
      const { data, error } = await supabase
        .from('products')
        .select(`
          id,
          name,
          price,
          image_url,
          category,
          vendor_id,
          vendor_profile:profiles!vendor_id (
            full_name,
            email
          )
        `)
        .ilike('name', `%${dropdownSearchTerm}%`)
        .limit(3);
      
      if (error) return [];
      return data || [];
    },
    enabled: dropdownSearchTerm.length >= 2,
  });

  const { data: dropdownUsers = [] } = useQuery({
    queryKey: ['dropdown-users', dropdownSearchTerm],
    queryFn: async () => {
      if (dropdownSearchTerm.length < 2) return [];
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .ilike('full_name', `%${dropdownSearchTerm}%`)
        .limit(3);
      
      if (error) return [];
      return data || [];
    },
    enabled: dropdownSearchTerm.length >= 2,
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Dropdown handlers
  const handleDropdownProductClick = (productId: string) => {
    setLocation(`/products/${productId}`);
    setIsDropdownOpen(false);
    setDropdownSearchTerm('');
  };

  const handleDropdownUserClick = (userId: string) => {
    setLocation(`/users/${userId}`);
    setIsDropdownOpen(false);
    setDropdownSearchTerm('');
  };

  const handleDropdownSearchChange = (value: string) => {
    setDropdownSearchTerm(value);
    setIsDropdownOpen(value.length > 0);
  };

  const handleViewAllDropdownResults = () => {
    setSearchTerm(dropdownSearchTerm);
    setIsDropdownOpen(false);
    setDropdownSearchTerm('');
  };

  // Fetch products
  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ['discovery-products', searchTerm, selectedCategory],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select(`
          *,
          vendor_profile:profiles!vendor_id (
            full_name,
            email,
            vendor_kyc_data:vendor_kyc!vendor_id ( 
              display_business_name,
              business_name
            )
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
      
      if (error) throw error;
      
      return data?.map(product => ({
        ...product,
        description: product.description || undefined,
        image_url: product.image_url || undefined,
        category: product.category || undefined,
        stock_quantity: product.stock_quantity || undefined,
        vendor_profile: product.vendor_profile || null,
        vendor_kyc: product.vendor_profile?.vendor_kyc_data || []
      })) || [];
    },
  });

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ['discovery-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('category')
        .not('category', 'is', null)
        .eq('is_active', true);
      
      if (error) throw error;
      
      const uniqueCategories = Array.from(new Set(data.map(item => item.category)));
      return uniqueCategories.filter(Boolean);
    },
  });

  // Fetch users for search
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['discovery-users', searchTerm],
    queryFn: async () => {
      if (!searchTerm) return [];
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
        .limit(20);
      
      if (error) throw error;
      return data || [];
    },
  });

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 py-6">
          {/* Enhanced Search Header */}
          <div className="mb-8">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-rose-400 rounded-full flex items-center justify-center">
                  <Search className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Discover</h2>
                  <p className="text-sm text-gray-600">Find products, brands, and people</p>
                </div>
              </div>
              
              <div className="relative" ref={dropdownRef}>
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 z-10" />
                <Input
                  placeholder="Search for products, brands, categories, or people..."
                  value={dropdownSearchTerm}
                  onChange={(e) => handleDropdownSearchChange(e.target.value)}
                  onFocus={() => dropdownSearchTerm.length > 0 && setIsDropdownOpen(true)}
                  className="pl-12 pr-12 py-4 text-lg border-gray-200 rounded-xl bg-gray-50 focus:bg-white transition-colors shadow-sm hover:shadow-md focus:shadow-lg"
                />
                {dropdownSearchTerm && (
                  <button
                    onClick={() => {
                      setDropdownSearchTerm('');
                      setIsDropdownOpen(false);
                    }}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors z-10"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}

                {/* Search Dropdown */}
                {isDropdownOpen && dropdownSearchTerm.length >= 2 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl z-50 max-h-96 overflow-hidden">
                    {/* Products Section */}
                    {dropdownProducts.length > 0 && (
                      <div className="border-b border-gray-100">
                        <div className="px-4 py-3 bg-gray-50 flex items-center gap-2">
                          <ShoppingBag className="w-4 h-4 text-gray-600" />
                          <span className="font-medium text-gray-700">Products</span>
                        </div>
                        {dropdownProducts.map((product) => (
                          <div
                            key={product.id}
                            onClick={() => handleDropdownProductClick(product.id)}
                            className="flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
                          >
                            <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                              {product.image_url ? (
                                <img 
                                  src={product.image_url} 
                                  alt={product.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full bg-pink-100 flex items-center justify-center">
                                  <ShoppingBag className="w-5 h-5 text-pink-400" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 truncate">{product.name}</p>
                              <div className="flex items-center justify-between">
                                <p className="text-sm text-gray-500 truncate">
                                  by {product.vendor_profile?.full_name || 'Unknown Vendor'}
                                </p>
                                <p className="text-sm font-medium text-green-600">₹{product.price}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Users Section */}
                    {dropdownUsers.length > 0 && (
                      <div className="border-b border-gray-100">
                        <div className="px-4 py-3 bg-gray-50 flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-600" />
                          <span className="font-medium text-gray-700">People</span>
                        </div>
                        {dropdownUsers.map((user) => (
                          <div
                            key={user.id}
                            onClick={() => handleDropdownUserClick(user.id)}
                            className="flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
                          >
                            <Avatar className="w-10 h-10">
                              <AvatarImage src={user.avatar_url || undefined} />
                              <AvatarFallback className="bg-gradient-to-br from-pink-400 to-rose-500 text-white font-medium">
                                {user.full_name?.charAt(0) || user.email?.charAt(0) || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 truncate">
                                {user.full_name || 'Unknown User'}
                              </p>
                              <p className="text-sm text-gray-500 truncate">{user.email}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* View All Results */}
                    {(dropdownProducts.length > 0 || dropdownUsers.length > 0) && (
                      <div className="p-3">
                        <button
                          onClick={handleViewAllDropdownResults}
                          className="w-full px-4 py-2 text-pink-600 hover:bg-pink-50 rounded-lg transition-colors font-medium"
                        >
                          View all {dropdownProducts.length} products for "{dropdownSearchTerm}" →
                        </button>
                      </div>
                    )}

                    {/* No Results */}
                    {dropdownProducts.length === 0 && dropdownUsers.length === 0 && (
                      <div className="p-6 text-center text-gray-500">
                        <Search className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p>No results found for "{dropdownSearchTerm}"</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
              

            </div>
          </div>

          {/* Categories Section - Only show when not searching */}
          {categories.length > 0 && !searchTerm && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4">Browse Categories</h2>
              <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-8 gap-3">
                {categories.map((category) => {
                  const categoryProduct = products.find(p => p.category === category);
                  return (
                    <div
                      key={category}
                      className={`cursor-pointer rounded-xl overflow-hidden transition-all duration-300 hover:scale-105 ${
                        selectedCategory === category ? 'ring-2 ring-pink-500' : ''
                      }`}
                      onClick={() => setSelectedCategory(selectedCategory === category ? '' : category || '')}
                    >
                      <div className="aspect-square bg-gradient-to-br from-pink-100 to-rose-100 flex items-center justify-center relative">
                        {categoryProduct?.image_url ? (
                          <img 
                            src={categoryProduct.image_url} 
                            alt={category || ''}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 bg-pink-200 rounded-full flex items-center justify-center">
                            <span className="text-pink-600 font-bold text-sm">
                              {category?.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black bg-opacity-20 flex items-end">
                          <div className="w-full p-1 bg-gradient-to-t from-black to-transparent">
                            <p className="text-white text-xs font-medium text-center truncate">
                              {category}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Products Results - Show only products when searching */}
          {searchTerm && (
            <div>
              {/* Products Section */}
              {products.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <ShoppingBag className="w-5 h-5 text-gray-600" />
                    <h2 className="text-lg font-semibold">Products ({products.length})</h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {productsLoading ? (
                      Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="aspect-square bg-gray-200 rounded-xl animate-pulse" />
                      ))
                    ) : (
                      products.map((product) => (
                        <ProductCard key={product.id} product={product as any} />
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* No Results */}
              {!productsLoading && products.length === 0 && (
                <div className="text-center py-12">
                  <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">No products found</p>
                  <p className="text-gray-400">Try searching for different keywords</p>
                </div>
              )}
            </div>
          )}

          {/* Default Products Grid - Show when no search term */}
          {!searchTerm && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Grid className="w-5 h-5 text-gray-600" />
                <h2 className="text-lg font-semibold">All Products</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {productsLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="aspect-square bg-gray-200 rounded-xl animate-pulse" />
                  ))
                ) : products.length > 0 ? (
                  products.map((product) => (
                    <ProductCard key={product.id} product={product as any} />
                  ))
                ) : (
                  <div className="col-span-full text-center py-12">
                    <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">No products found</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Discovery;