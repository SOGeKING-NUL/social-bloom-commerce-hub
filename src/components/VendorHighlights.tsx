import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import HighlightProductCard from "./HighlightProductCard";
import { FlipWords } from "./ui/vendorHighlight-flip-words";

const VendorHighlights = () => {
  const [currentProductIndex, setCurrentProductIndex] = useState(0);

  // Fetch vendor count and sample data
  const { data: vendorStats } = useQuery({
    queryKey: ["vendor-stats"],
    queryFn: async () => {
      // Get total vendor count
      const { count: vendorCount, error: countError } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("role", "vendor");

      if (countError) throw countError;

      // Try to get the specific dev69 vendor
      const { data: specificVendors, error: specificError } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("role", "vendor")
        .or("email.ilike.%dev69%,email.ilike.%sogeking%")
        .limit(1);

      let sampleVendor = null;
      let sampleProduct = null;

      if (!specificError && specificVendors && specificVendors.length > 0) {
        sampleVendor = specificVendors[0];
        
        // Get a product from this specific vendor
        const { data: products, error: productError } = await supabase
          .from("products")
          .select("name, category")
          .eq("vendor_id", sampleVendor.id)
          .eq("is_active", true)
          .limit(1);

        if (!productError && products && products.length > 0) {
          sampleProduct = products[0];
        }
      }

      // If dev69 vendor not found or has no products, get any vendor
      if (!sampleVendor || !sampleProduct) {
        const { data: anyVendors, error: anyError } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .eq("role", "vendor")
          .limit(1);

        if (!anyError && anyVendors && anyVendors.length > 0) {
          sampleVendor = anyVendors[0];

          const { data: products, error: productError } = await supabase
            .from("products")
            .select("name, category")
            .eq("vendor_id", sampleVendor.id)
            .eq("is_active", true)
            .limit(1);

          if (!productError && products && products.length > 0) {
            sampleProduct = products[0];
          }
        }
      }

      return {
        vendorCount: vendorCount || 0,
        sampleVendor,
        sampleProduct,
      };
    },
  });

  // Fetch ALL dev69 vendor products for carousel
  const { data: vendorHighlights = [] } = useQuery({
    queryKey: ["vendor-highlights-dev69"],
    queryFn: async () => {
      // ONLY get the specific dev69 vendor
      const { data: dev69Vendor, error: dev69Error } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("role", "vendor")
        .or("email.ilike.%dev69%,email.ilike.%sogeking%")
        .limit(1);

      if (dev69Error || !dev69Vendor || dev69Vendor.length === 0) {
        console.log("Dev69 vendor not found");
        return [];
      }

      // Get all products from dev69 vendor only
      const { data: dev69Products, error: productsError } = await supabase
        .from("products")
        .select("*")
        .eq("vendor_id", dev69Vendor[0].id)
        .eq("is_active", true);

      if (productsError || !dev69Products || dev69Products.length === 0) {
        console.log("No products found for dev69 vendor");
        return [];
      }

      // Return all products from dev69 vendor for carousel
      const highlights = dev69Products.map(product => ({
        vendor: dev69Vendor[0],
        product: product,
      }));

      return highlights;
    },
  });

  // Auto-advance carousel every 2 seconds
  useEffect(() => {
    if (vendorHighlights.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentProductIndex((prev) => (prev + 1) % vendorHighlights.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [vendorHighlights.length]);

  // Generate dynamic text using current product name
  const generateDynamicText = () => {
    const count = vendorStats?.vendorCount || 100;
    const vendor = vendorStats?.sampleVendor;
    
    // Use actual vendor name if available
    const vendorName = vendor?.full_name || 
                     (vendor?.email ? vendor.email.split("@")[0].replace(/[^a-zA-Z0-9]/g, '') : null) || 
                     "dev69";
    
    const vendorLocation = "Mumbai";

    return {
      count,
      vendorName,
      vendorLocation,
    };
  };

  const textData = generateDynamicText();

  if (!vendorHighlights || vendorHighlights.length === 0) {
    return null; // Don't render if no dev69 vendor highlights
  }

  const currentHighlight = vendorHighlights[currentProductIndex];

  // Create words array for FlipWords from all product names
  const productWords = vendorHighlights.map(highlight => highlight.product.name);
  const currentProductName = vendorHighlights[currentProductIndex]?.product.name;

  return (
    <section className="py-20 md:py-28 bg-gradient-to-br from-gray-50 via-white to-pink-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left Side - Dynamic Text with FlipWords */}
          <div className="space-y-8">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.2, delay: 0.2 }}
            >
              <motion.h2 
                className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, delay: 0.4 }}
              >
                Meet{" "}
                <motion.span 
                  className="text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-rose-500"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 1, delay: 0.8 }}
                >
                  {textData.count}+ vendors
                </motion.span>{" "}
                like{" "}
                <motion.span 
                  className="text-pink-600"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 1, delay: 1.0 }}
                >
                  {textData.vendorName}
                </motion.span>{" "}
                from{" "}
                <motion.span 
                  className="text-pink-600"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 1, delay: 1.2 }}
                >
                  {textData.vendorLocation}
                </motion.span>{" "}
                selling{" "}
                <motion.span 
                  className="text-pink-600 inline-block"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 1, delay: 1.4 }}
                >
                  <FlipWords 
                    words={productWords} 
                    currentWord={currentProductName}
                    className="text-pink-600 font-bold"
                  />
                </motion.span>{" "}
                on our platform
              </motion.h2>
            </motion.div>
            
            <motion.p 
              className="text-xl text-gray-600 leading-relaxed max-w-xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 1.6 }}
            >
              Invite your friends, create a group order and avail{" "}
              <span className="font-bold text-green-600">up to 30% discount!</span>
            </motion.p>
          </div>

          {/* Right Side - Single Product Card (Auto-only) */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, delay: 0.6 }}
            className="relative"
          >
            {/* Single Product Display - No Navigation */}
            <div className="relative">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentHighlight.product.id}
                  initial={{ opacity: 0, x: 100 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ duration: 0.5 }}
                >
                  <HighlightProductCard
                    product={currentHighlight.product}
                    vendor={currentHighlight.vendor}
                    index={0}
                  />
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default VendorHighlights; 