
import { Button } from "@/components/ui/button";
import { Users, Lock, Plus } from "lucide-react";

const GroupsPreview = () => {
  const groups = [
    {
      id: 1,
      name: "Premium Skincare Circle",
      brand: "GlowUp Beauty",
      members: 24,
      image: "https://images.unsplash.com/photo-1618160702438-9b02ab6515c9?w=300&h=200&fit=crop",
      description: "Exclusive access to premium skincare products and early releases"
    },
    {
      id: 2,
      name: "Home Decor Enthusiasts",
      brand: "Modern Living Co",
      members: 18,
      image: "https://images.unsplash.com/photo-1721322800607-8c38375eef04?w=300&h=200&fit=crop",
      description: "Curated home decor items for the modern lifestyle"
    },
    {
      id: 3,
      name: "Pet Parents United",
      brand: "PawPerfect",
      members: 32,
      image: "https://images.unsplash.com/photo-1582562124811-c09040d0a901?w=300&h=200&fit=crop",
      description: "Premium pet products for our furry family members"
    }
  ];

  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">Exclusive Shopping Groups</h2>
          <p className="text-xl text-gray-600">Join private groups for your favorite brands and shop with your inner circle</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {groups.map((group) => (
            <div key={group.id} className="smooth-card overflow-hidden floating-card">
              <div className="relative">
                <img 
                  src={group.image} 
                  alt={group.name}
                  className="w-full h-48 object-cover"
                />
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-full p-2">
                  <Lock className="w-4 h-4 text-pink-500" />
                </div>
              </div>
              
              <div className="p-6">
                <h3 className="text-xl font-semibold mb-2">{group.name}</h3>
                <p className="text-pink-600 font-medium mb-2">{group.brand}</p>
                <p className="text-gray-600 text-sm mb-4">{group.description}</p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-gray-500">
                    <Users className="w-4 h-4 mr-1" />
                    <span className="text-sm">{group.members} members</span>
                  </div>
                  <Button size="sm" className="social-button bg-gradient-to-r from-pink-500 to-rose-400 hover:from-pink-600 hover:to-rose-500">
                    Join Group
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="text-center">
          <Button size="lg" variant="outline" className="social-button border-pink-200 text-pink-600 hover:bg-pink-50">
            <Plus className="w-5 h-5 mr-2" />
            Create New Group
          </Button>
        </div>
      </div>
    </section>
  );
};

export default GroupsPreview;
