import { Button } from "@/components/ui/button";
import { ShoppingCart, Users, Heart } from "@phosphor-icons/react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

interface HighlightProductCardProps {
  product: {
    id: string;
    name: string;
    price: number;
    image_url?: string;
    category?: string;
    description?: string;
  };
  vendor: {
    id: string;
    full_name?: string;
    email: string;
  };
  index?: number;
}

const HighlightProductCard = ({ product, vendor, index = 0 }: HighlightProductCardProps) => {
  const navigate = useNavigate();
  const vendorName = vendor.full_name || vendor.email?.split("@")[0] || "Unknown Vendor";

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: index * 0.1 }}
      className="group relative w-full max-w-md mx-auto"
    >
      {/* Main Card Container */}
      <div className="relative overflow-hidden rounded-2xl bg-white shadow-xl transition-all duration-500 hover:shadow-2xl hover:scale-[1.02]">
        {/* Larger Image Container */}
        <div className="relative h-96 w-full overflow-hidden">
          <img
            src={
              product.image_url ||
              "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=500&h=600&fit=crop"
            }
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 cursor-pointer"
            onClick={() => navigate(`/products/${product.id}`)}
          />

          {/* Subtle gradient at bottom for color bleeding */}
          <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white/20 to-transparent" />

          {/* Heart Icon */}
          <button className="absolute top-4 right-4 p-2 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 transition-all duration-300 hover:bg-white/30 hover:scale-110">
            <Heart className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Color Bleeding Effect */}
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-b from-transparent via-black/5 to-white pointer-events-none" />

        {/* More Compact Text Content Area */}
        <div className="relative bg-white p-5 space-y-3">
          {/* Price */}
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-bold text-slate-800 tracking-tight">${product.price}</h2>
            {product.category && (
              <span className="text-sm text-slate-500 uppercase tracking-wide font-medium">
                {product.category}
              </span>
            )}
          </div>

          {/* Product Title and Description */}
          <div className="space-y-1">
            <h3 
              className="text-lg font-semibold text-slate-800 leading-tight line-clamp-1 cursor-pointer hover:text-pink-600 transition-colors duration-200"
              onClick={() => navigate(`/products/${product.id}`)}
            >
              {product.name}
            </h3>
            <p className="text-sm text-slate-600 line-clamp-1 leading-relaxed">
              {product.description || "Quality product perfect for group orders"}
            </p>
          </div>

          {/* Group Benefits Row */}
          <div className="flex items-center gap-8 py-1">
            <div className="text-center">
              <div className="text-lg font-bold text-slate-800">30%</div>
              <div className="text-xs text-slate-500 uppercase tracking-wide font-medium">Discount</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-slate-800">Groups</div>
              <div className="text-xs text-slate-500 uppercase tracking-wide font-medium">Supported</div>
            </div>
          </div>

          {/* Vendor and Action Buttons */}
          <div className="border-t border-slate-100 pt-3 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">
                Sold by{" "}
                <span 
                  className="text-pink-600 font-medium cursor-pointer hover:text-pink-700 transition-colors duration-200"
                  onClick={() => navigate(`/users/${vendor.id}`)}
                >
                  {vendorName}
                </span>
              </span>
            </div>

            {/* Action Buttons - Side by Side */}
            <div className="flex gap-2">
              <Button
                onClick={() => navigate(`/products/${product.id}`)}
                className="flex-1 bg-gradient-to-r from-pink-500 to-rose-400 hover:from-pink-600 hover:to-rose-500 text-white font-medium h-10"
              >
                <Users className="w-4 h-4 mr-1" />
                Start Group Order
              </Button>
              <Button
                onClick={() => navigate(`/products/${product.id}`)}
                variant="outline"
                className="flex-1 h-10 border-slate-300 hover:border-slate-400"
              >
                <ShoppingCart className="w-4 h-4 mr-1" />
                Add to Cart
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Subtle glow effect */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-pink-500/5 to-rose-500/5 blur-xl -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    </motion.div>
  );
};

export default HighlightProductCard; 