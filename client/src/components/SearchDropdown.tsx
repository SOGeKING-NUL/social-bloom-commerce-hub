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
    setLocation(`/profile/${userId}`);
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
        onClick={() => setIsOpen(!isOpen)}
        className="bg-gradient-to-r from-pink-50 to-rose-50 border-pink-200 text-pink-600 hover:from-pink-100 hover:to-rose-100"
      >
        <Search className="w-4 h-4" />
      </Button>

      {/* Search Dropdown */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-96 bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-96 overflow-hidden">
          {/* Search Header */}
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">Search</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="h-6 w-6 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                ref={inputRef}
                placeholder="Search people and products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-gray-200 focus:border-pink-300"
              />
            </div>
          </div>

          {/* Search Results */}
          <div className="max-h-80 overflow-y-auto">
            {searchTerm.length < 2 ? (
              <div className="p-6 text-center text-gray-500">
                <Search className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p>Start typing to search...</p>
              </div>
            ) : isLoading ? (
              <div className="p-6">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center space-x-3 mb-3 animate-pulse">
                    <div className="w-10 h-10 bg-gray-200 rounded-full" />
                    <div className="flex-1 space-y-1">
                      <div className="h-4 bg-gray-200 rounded w-3/4" />
                      <div className="h-3 bg-gray-200 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : showResults ? (
              <div className="py-2">
                {/* Users Section */}
                {users.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50">
                      <User className="w-4 h-4" />
                      People
                    </div>
                    {users.map((user) => (
                      <div
                        key={user.id}
                        onClick={() => handleUserClick(user.id)}
                        className="flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={user.avatar_url || undefined} />
                          <AvatarFallback>
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

                {/* Products Section */}
                {products.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50">
                      <ShoppingBag className="w-4 h-4" />
                      Products
                    </div>
                    {products.map((product) => (
                      <div
                        key={product.id}
                        onClick={() => handleProductClick(product.id)}
                        className="flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <div className="w-10 h-10 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                          {product.image_url ? (
                            <img 
                              src={product.image_url} 
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-pink-100 to-rose-100 flex items-center justify-center">
                              <ShoppingBag className="w-5 h-5 text-pink-400" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{product.name}</p>
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-gray-500 truncate">
                              {product.vendor_profile?.full_name || 'Unknown Vendor'}
                            </p>
                            <p className="text-sm font-medium text-pink-600">
                              ₹{product.price}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* View All Results */}
                {(users.length > 0 || products.length > 0) && (
                  <div className="border-t border-gray-100 p-3">
                    <Button
                      onClick={handleViewAllResults}
                      variant="ghost"
                      className="w-full text-pink-600 hover:bg-pink-50"
                    >
                      View all results for "{searchTerm}"
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 text-center text-gray-500">
                <Search className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p>No results found</p>
                <p className="text-sm">Try searching for something else</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchDropdown;