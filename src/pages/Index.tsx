import Header from "@/components/Header";
import Hero from "@/components/Hero";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Star } from "@phosphor-icons/react";
import { useNavigate } from "react-router-dom";
import GroupsPreview from "@/components/GroupsPreview";
import Footer from "@/components/Footer";
import { motion, AnimatePresence } from "framer-motion";

const Index = () => {
  const navigate = useNavigate();

  // Fetch featured products
  const { data: featuredProducts = [] } = useQuery({
    queryKey: ["featured-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(
          `
          *,
          vendor_profile:profiles!vendor_id (
            full_name,
            email
          )
        `
        )
        .eq("is_active", true)
        .limit(8)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen">
      <Header />
      <Hero />

      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 mb-4">
              Featured Products
            </h2>
            <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto">
              Discover amazing products from our vibrant community
            </p>
          </motion.div>

          {/* mock data used fere to showcase the layout  */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="animate-pulse bg-white rounded-2xl shadow-lg p-6"
              >
                <div className="h-48 bg-gray-200 rounded-xl mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="h-10 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>

          {/* working api call below */}
          {/* <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredProducts.map((product) => (
              <div
                key={product.id}
                className="bg-white rounded-2xl shadow-lg p-6"
              >
                <div className="relative">
                  <img
                    src={
                      product.image_url ||
                      "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=300&h=300&fit=crop"
                    }
                    alt={product.name}
                    className="w-full h-48 object-cover rounded-xl mb-4 cursor-pointer hover:scale-105 transition-transform duration-300"
                    onClick={() => navigate(`/products/${product.id}`)}
                  />
                </div>

                <div>
                  <h3
                    className="font-semibold text-gray-800 w-3/4 mb-2 cursor-pointer hover:text-pink-600"
                    onClick={() => navigate(`/products/${product.id}`)}
                  >
                    {product.name}
                  </h3>
                  <p className="text-sm text-pink-600 w-1/2 mb-4">
                    by{" "}
                    {product.vendor_profile?.full_name ||
                      product.vendor_profile?.email?.split("@")[0] ||
                      "Unknown Vendor"}
                  </p>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center mb-4">
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      <span className="text-sm text-gray-600 ml-1">4.5</span>
                    </div>
                    <span className="text-lg font-bold text-gray-800">
                      ${product.price}
                    </span>
                  </div>

                  <button
                    onClick={() => navigate(`/products/${product.id}`)}
                    className="w-full h-10 bg-gradient-to-r from-pink-500 to-rose-400 hover:from-pink-600 hover:to-rose-500 text-white rounded font-semibold"
                  >
                    View Product
                  </button>
                </div>
              </div>
            ))}
          </div> */}

          <div className="text-center mt-10">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                onClick={() => navigate("/products")}
                size="lg"
                className="bg-gradient-to-r from-pink-500 to-rose-400 hover:from-pink-600 hover:to-rose-500 text-white font-semibold px-8 py-3 rounded-lg"
              >
                View All Products
              </Button>
            </motion.div>
          </div>
        </div>
      </section>

      <GroupsPreview />
      <Footer />
    </div>
  );
};

export default Index;
