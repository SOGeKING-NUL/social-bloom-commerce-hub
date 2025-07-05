import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, User, ShoppingBag, X } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";

const SearchDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [location, setLocation] = useLocation();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch products
  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ['search-products', searchTerm],
    queryFn: async () => {
      if (!searchTerm || searchTerm.length < 2) return [];
      
      const { data, error } = await supabase
        .from('products')
        .select(`
          id, name, price, image_url, category,
          vendor_profile:profiles!vendor_id (full_name, email)
        `)
        .eq('is_active', true)
        .ilike('name', `%${searchTerm}%`)
        .limit(5);
      
      if (error) throw error;
      return data || [];
    },
    enabled: searchTerm.length >= 2,
  });

  // Fetch users
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['search-users', searchTerm],
    queryFn: async () => {
      if (!searchTerm || searchTerm.length < 2) return [];
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
        .limit(5);
      
      if (error) throw error;
      return data || [];
    },
    enabled: searchTerm.length >= 2,
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus input when dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleProductClick = (productId: string) => {
    setLocation(`/products/${productId}`);
    setIsOpen(false);
    setSearchTerm("");
  };

  const handleUserClick = (userId: string) => {
    setLocation(`/users/${userId}`);
    setIsOpen(false);
    setSearchTerm("");
  };

  const handleViewAllResults = () => {
    setLocation(`/discovery?search=${encodeURIComponent(searchTerm)}`);
    setIsOpen(false);
    setSearchTerm("");
  };

  const isLoading = productsLoading || usersLoading;
  const hasResults = products.length > 0 || users.length > 0;
  const showResults = searchTerm.length >= 2 && (hasResults || !isLoading);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Search Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          console.log('Search button clicked, isOpen:', isOpen);
          setIsOpen(!isOpen);
        }}
        className="bg-gradient-to-r from-pink-50 to-rose-50 border-pink-200 text-pink-600 hover:from-pink-100 hover:to-rose-100"
      >
        <Search className="w-4 h-4" />
      </Button>

      {/* Search Dropdown Panel - Always render but control visibility */}
      <div 
        className={`fixed top-16 right-4 w-[500px] bg-white border border-gray-200 rounded-lg shadow-2xl transition-all duration-300 ${
          isOpen 
            ? 'opacity-100 scale-100 translate-y-0 z-50' 
            : 'opacity-0 scale-95 -translate-y-2 pointer-events-none z-0'
        }`}
        style={{ zIndex: isOpen ? 9999 : -1 }}
      >
          {/* Search Header */}
          <div className="p-4 border-b border-gray-100 bg-gray-50">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800 text-lg">Search Products & People</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 p-0 hover:bg-gray-200"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                ref={inputRef}
                placeholder="Search for products, brands, and people..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 pr-4 py-3 text-base border-gray-300 focus:border-pink-400 focus:ring-pink-200 rounded-lg"
              />
            </div>
          </div>

          {/* Search Results Panel */}
          <div className="max-h-[400px] overflow-y-auto">
            {searchTerm.length < 2 ? (
              <div className="p-8 text-center text-gray-500">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-lg font-medium mb-2">Start typing to search</p>
                <p className="text-sm text-gray-400">Find products, brands, and people</p>
              </div>
            ) : isLoading ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center space-x-4 p-3 animate-pulse">
                    <div className="w-12 h-12 bg-gray-200 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4" />
                      <div className="h-3 bg-gray-200 rounded w-1/2" />
                    </div>
                    <div className="w-16 h-4 bg-gray-200 rounded" />
                  </div>
                ))}
              </div>
            ) : showResults ? (
              <div>
                {/* Products Section */}
                {products.length > 0 && (
                  <div className="border-b border-gray-100 last:border-b-0">
                    <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-100">
                      <ShoppingBag className="w-5 h-5 text-gray-600" />
                      <span className="font-semibold text-gray-700">Products</span>
                      <span className="text-sm text-gray-500">({products.length})</span>
                    </div>
                    {products.map((product) => (
                      <div
                        key={product.id}
                        onClick={() => handleProductClick(product.id)}
                        className="flex items-center space-x-4 p-4 hover:bg-blue-50 cursor-pointer transition-colors border-b border-gray-50 last:border-b-0"
                      >
                        <div className="w-14 h-14 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 border">
                          {product.image_url ? (
                            <img 
                              src={product.image_url} 
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-pink-100 to-rose-100 flex items-center justify-center">
                              <ShoppingBag className="w-6 h-6 text-pink-400" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 truncate text-base">{product.name}</p>
                          <p className="text-sm text-gray-600 truncate">
                            by {product.vendor_profile?.full_name || 'Unknown Vendor'}
                          </p>
                          <div className="flex items-center mt-1">
                            <span className="text-lg font-bold text-green-600">₹{product.price}</span>
                            {product.category && (
                              <span className="ml-2 px-2 py-1 bg-gray-100 text-xs text-gray-600 rounded-full">
                                {product.category}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* People Section */}
                {users.length > 0 && (
                  <div className="border-b border-gray-100 last:border-b-0">
                    <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-100">
                      <User className="w-5 h-5 text-gray-600" />
                      <span className="font-semibold text-gray-700">People</span>
                      <span className="text-sm text-gray-500">({users.length})</span>
                    </div>
                    {users.map((user) => (
                      <div
                        key={user.id}
                        onClick={() => handleUserClick(user.id)}
                        className="flex items-center space-x-4 p-4 hover:bg-blue-50 cursor-pointer transition-colors border-b border-gray-50 last:border-b-0"
                      >
                        <Avatar className="w-12 h-12 border-2 border-gray-200">
                          <AvatarImage src={user.avatar_url || undefined} />
                          <AvatarFallback className="bg-gradient-to-br from-pink-400 to-rose-500 text-white font-semibold">
                            {user.full_name?.charAt(0) || user.email?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 truncate text-base">
                            {user.full_name || 'Unknown User'}
                          </p>
                          <p className="text-sm text-gray-600 truncate">{user.email}</p>
                          <div className="flex items-center mt-1">
                            <span className="px-2 py-1 bg-pink-100 text-xs text-pink-700 rounded-full">
                              User Profile
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* View All Results Footer */}
                {(users.length > 0 || products.length > 0) && (
                  <div className="p-4 bg-gray-50 border-t border-gray-200">
                    <Button
                      onClick={handleViewAllResults}
                      variant="outline"
                      className="w-full py-3 text-blue-600 border-blue-200 hover:bg-blue-50 hover:border-blue-300 font-medium"
                    >
                      View all results for "{searchTerm}" →
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-lg font-medium mb-2">No results found</p>
                <p className="text-sm text-gray-400">Try searching with different keywords</p>
              </div>
            )}
          </div>
      </div>
    </div>
  );
};

export default SearchDropdown;