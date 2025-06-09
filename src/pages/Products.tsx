
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, ShoppingCart, Heart, Star } from "lucide-react";
import Header from "@/components/Header";
import { useToast } from "@/hooks/use-toast";

const Products = () => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("featured");

  const [products, setProducts] = useState([
    {
      id: 1,
      name: "Premium Moisturizer",
      brand: "GlowUp Beauty",
      price: 49.99,
      originalPrice: 69.99,
      image: "https://images.unsplash.com/photo-1618160702438-9b02ab6515c9?w=300&h=300&fit=crop",
      rating: 4.8,
      reviews: 124,
      category: "skincare",
      inWishlist: false,
      inCart: false
    },
    {
      id: 2,
      name: "Modern Table Lamp",
      brand: "Modern Living Co",
      price: 89.99,
      originalPrice: 119.99,
      image: "https://images.unsplash.com/photo-1721322800607-8c38375eef04?w=300&h=300&fit=crop",
      rating: 4.6,
      reviews: 89,
      category: "home",
      inWishlist: false,
      inCart: false
    },
    {
      id: 3,
      name: "Organic Dog Treats",
      brand: "PawPerfect",
      price: 24.99,
      originalPrice: 34.99,
      image: "https://images.unsplash.com/photo-1582562124811-c09040d0a901?w=300&h=300&fit=crop",
      rating: 4.9,
      reviews: 203,
      category: "pets",
      inWishlist: false,
      inCart: false
    },
    {
      id: 4,
      name: "Wireless Headphones",
      brand: "TechSound",
      price: 129.99,
      originalPrice: 179.99,
      image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&h=300&fit=crop",
      rating: 4.7,
      reviews: 156,
      category: "electronics",
      inWishlist: false,
      inCart: false
    }
  ]);

  const categories = [
    { value: "all", label: "All Categories" },
    { value: "skincare", label: "Skincare" },
    { value: "home", label: "Home & Decor" },
    { value: "pets", label: "Pet Products" },
    { value: "electronics", label: "Electronics" }
  ];

  const handleAddToCart = (productId: number) => {
    setProducts(products.map(product => 
      product.id === productId 
        ? { ...product, inCart: !product.inCart }
        : product
    ));
    
    const product = products.find(p => p.id === productId);
    toast({
      title: product?.inCart ? "Removed from Cart" : "Added to Cart!",
      description: product?.inCart 
        ? `${product.name} removed from cart` 
        : `${product?.name} added to cart`,
    });
  };

  const handleToggleWishlist = (productId: number) => {
    setProducts(products.map(product => 
      product.id === productId 
        ? { ...product, inWishlist: !product.inWishlist }
        : product
    ));
    
    const product = products.find(p => p.id === productId);
    toast({
      title: product?.inWishlist ? "Removed from Wishlist" : "Added to Wishlist!",
      description: product?.inWishlist 
        ? `${product.name} removed from wishlist` 
        : `${product?.name} added to wishlist`,
    });
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.brand.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (sortBy) {
      case "price-low":
        return a.price - b.price;
      case "price-high":
        return b.price - a.price;
      case "rating":
        return b.rating - a.rating;
      default:
        return 0;
    }
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-pink-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Products</h1>
            <p className="text-xl text-gray-600">Discover amazing products from our community</p>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products..."
                className="pl-10 border-pink-200 focus:ring-pink-300"
              />
            </div>
            
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="border-pink-200 focus:ring-pink-300">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="border-pink-200 focus:ring-pink-300">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="featured">Featured</SelectItem>
                <SelectItem value="price-low">Price: Low to High</SelectItem>
                <SelectItem value="price-high">Price: High to Low</SelectItem>
                <SelectItem value="rating">Highest Rated</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {sortedProducts.map((product) => (
              <div key={product.id} className="smooth-card overflow-hidden floating-card animate-fade-in">
                <div className="relative group">
                  <img 
                    src={product.image} 
                    alt={product.name}
                    className="w-full h-48 object-cover cursor-pointer hover:scale-105 transition-transform duration-300"
                  />
                  <button
                    onClick={() => handleToggleWishlist(product.id)}
                    className={`absolute top-3 right-3 p-2 rounded-full backdrop-blur-sm transition-colors ${
                      product.inWishlist 
                        ? 'bg-pink-500 text-white' 
                        : 'bg-white/80 text-gray-600 hover:bg-pink-50 hover:text-pink-500'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${product.inWishlist ? 'fill-current' : ''}`} />
                  </button>
                  {product.originalPrice > product.price && (
                    <div className="absolute top-3 left-3 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                      Save ${(product.originalPrice - product.price).toFixed(2)}
                    </div>
                  )}
                </div>
                
                <div className="p-4">
                  <h3 className="font-semibold mb-1 text-gray-800">{product.name}</h3>
                  <p className="text-sm text-pink-600 mb-2">{product.brand}</p>
                  
                  <div className="flex items-center mb-2">
                    <div className="flex items-center">
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      <span className="text-sm text-gray-600 ml-1">{product.rating}</span>
                    </div>
                    <span className="text-sm text-gray-500 ml-2">({product.reviews} reviews)</span>
                  </div>
                  
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className="text-lg font-bold text-gray-800">${product.price}</span>
                      {product.originalPrice > product.price && (
                        <span className="text-sm text-gray-500 line-through ml-2">
                          ${product.originalPrice}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <Button
                    onClick={() => handleAddToCart(product.id)}
                    variant={product.inCart ? "outline" : "default"}
                    className={`w-full ${
                      product.inCart 
                        ? 'border-pink-200 text-pink-600 hover:bg-pink-50' 
                        : 'social-button bg-gradient-to-r from-pink-500 to-rose-400 hover:from-pink-600 hover:to-rose-500'
                    }`}
                  >
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    {product.inCart ? "Remove from Cart" : "Add to Cart"}
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {sortedProducts.length === 0 && (
            <div className="text-center py-12">
              <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">No products found</h3>
              <p className="text-gray-500">Try adjusting your search or filter criteria.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Products;
