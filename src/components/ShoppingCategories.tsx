import { useNavigate } from "react-router-dom";
import { BentoGrid, BentoGridItem } from "@/components/ui/bento-grid";

const ShoppingCategories = () => {
  const navigate = useNavigate();

  const categories = [
    {
      title: "Electronics & Gadgets",
      image: "/electronics.png",
      className: "md:col-span-3",
    },
    {
      title: "Fashion & Clothing", 
      image: "/clothing.png",
      className: "md:col-span-1",
    },
    {
      title: "Beauty & Cosmetics",
      image: "/cosmetic.jpg", 
      className: "md:col-span-1",
    },
    {
      title: "Home & Living",
      image: "/home_decor.jpg",
      className: "md:col-span-2", 
    },
    {
      title: "Food & Groceries",
      image: "/groceries.png",
      className: "md:col-span-1",
    },
    {
      title: "Health & Wellness", 
      image: "/health.png",
      className: "md:col-span-2",
    },
    {
      title: "Books & Stationery",
      image: "/stationary.png",
      className: "md:col-span-2",
    }
  ];

  const handleCategoryClick = (categoryTitle: string) => {
    navigate(`/products?category=${encodeURIComponent(categoryTitle.toLowerCase())}`);
  };

  return (
    <section className="py-16 bg-gradient-to-br from-gray-50 via-white to-pink-50">
      <div className="container mx-auto px-2 sm:px-4 lg:px-6">
        <BentoGrid className="max-w-full mx-auto md:auto-rows-[20rem]">
          {categories.map((category, index) => (
            <BentoGridItem
              key={category.title}
              title=""
              description=""
              header={
                <div 
                  className={`relative h-full min-h-[250px] md:min-h-[300px] cursor-pointer group overflow-hidden transition-all duration-700 ease-out hover:scale-[1.02] ${category.className}`}
                  onClick={() => handleCategoryClick(category.title)}
                  style={{
                    backgroundImage: `url(${category.image})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                  }}
                >
                  {/* Base overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/20 to-transparent group-hover:from-black/30 group-hover:via-black/10 group-hover:to-transparent transition-all duration-500" />
                  
                  {/* Elegant grey overlay on hover */}
                  <div className="absolute inset-0 bg-gradient-to-br from-gray-900/0 via-gray-700/0 to-gray-800/0 group-hover:from-gray-900/10 group-hover:via-gray-700/5 group-hover:to-gray-800/10 transition-all duration-700 ease-out" />
                  
                  {/* Shimmer effect */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent transform -skew-x-12 translate-x-[-100%] group-hover:translate-x-[200%] transition-transform duration-1000 ease-out" />
                  </div>
                  
                  {/* Premium border glow */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    <div className="absolute inset-0 border border-gray-300/30 shadow-[0_0_30px_rgba(107,114,128,0.2)] rounded-sm" />
                  </div>
                  
                  {/* Category title with enhanced animation */}
                  <div className="absolute inset-0 flex items-end p-6 group-hover:p-8 transition-all duration-500">
                    <div className="transform group-hover:translate-y-[-4px] transition-transform duration-500 ease-out">
                      <h3 className="text-white text-xl md:text-2xl font-bold group-hover:text-gray-100 transition-all duration-300 drop-shadow-lg group-hover:drop-shadow-2xl">
                        {category.title}
                      </h3>
                      {/* Underline effect */}
                      <div className="h-0.5 w-0 bg-gradient-to-r from-gray-300 to-gray-400 group-hover:w-full transition-all duration-500 ease-out mt-2" />
                    </div>
                  </div>
                  
                  {/* Ambient glow effect */}
                  <div className="absolute -inset-2 opacity-0 group-hover:opacity-100 transition-opacity duration-700 ease-out -z-10">
                    <div className="absolute inset-0 bg-gradient-to-r from-gray-500/15 via-gray-400/15 to-gray-600/15 blur-xl rounded-lg" />
                  </div>
                </div>
              }
              className={`${category.className} p-0 border-0 bg-transparent shadow-none group-hover:shadow-2xl group-hover:shadow-gray-500/10 transition-all duration-700 ease-out`}
            />
          ))}
        </BentoGrid>
      </div>
    </section>
  );
};

export default ShoppingCategories; 