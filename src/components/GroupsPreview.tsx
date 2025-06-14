
import { Button } from "@/components/ui/button";
import { Users, Package } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const GroupsPreview = () => {
  // Fetch groups from database
  const { data: groups = [], isLoading } = useQuery({
    queryKey: ['groups-preview'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('groups')
        .select(`
          *,
          creator_profile:profiles!groups_creator_id_fkey (
            full_name,
            email
          ),
          product:products!product_id (
            name,
            image_url
          ),
          group_members (
            user_id
          )
        `)
        .order('created_at', { ascending: false })
        .limit(3); // Limit to 3 groups for preview
      
      if (error) throw error;
      
      return data.map(group => ({
        id: group.id,
        name: group.name,
        description: group.description,
        members: group.group_members?.length || 0,
        image: group.product?.image_url || `https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&h=300&fit=crop`,
        productName: group.product?.name || 'Unknown Product',
        creatorName: group.creator_profile?.full_name || group.creator_profile?.email?.split('@')[0] || 'Unknown Creator'
      }));
    },
  });

  if (isLoading) {
    return (
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Active Groups</h2>
              <p className="text-xl text-gray-600">Join groups and share experiences</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="smooth-card animate-pulse">
                  <div className="h-48 bg-gray-200 rounded mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  // If no groups, show fallback message
  if (groups.length === 0) {
    return (
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Active Groups</h2>
              <p className="text-xl text-gray-600">Join groups and share experiences</p>
            </div>
            
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">No groups yet</h3>
              <p className="text-gray-500">Be the first to create a group and start building community!</p>
              <Button className="mt-4 social-button bg-gradient-to-r from-pink-500 to-rose-400 hover:from-pink-600 hover:to-rose-500">
                Create First Group
              </Button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Active Groups</h2>
            <p className="text-xl text-gray-600">Join groups and share experiences</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {groups.map((group) => (
              <div key={group.id} className="smooth-card overflow-hidden floating-card animate-fade-in">
                <div className="relative">
                  <img 
                    src={group.image} 
                    alt={group.name}
                    className="w-full h-48 object-cover"
                  />
                  <div className="absolute top-4 left-4">
                    <span className="bg-white/90 text-pink-600 px-3 py-1 rounded-full text-sm font-medium backdrop-blur-sm">
                      <Package className="w-4 h-4 inline mr-1" />
                      {group.productName}
                    </span>
                  </div>
                </div>
                
                <div className="p-6">
                  <h3 className="text-xl font-semibold mb-2">{group.name}</h3>
                  <p className="text-gray-600 mb-4 line-clamp-2">{group.description}</p>
                  
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center text-pink-600">
                      <Users className="w-5 h-5 mr-2" />
                      <span className="font-medium">{group.members} members</span>
                    </div>
                    <span className="text-sm text-gray-500">by {group.creatorName}</span>
                  </div>
                  
                  <Button className="w-full social-button bg-gradient-to-r from-pink-500 to-rose-400 hover:from-pink-600 hover:to-rose-500">
                    Join Group
                  </Button>
                </div>
              </div>
            ))}
          </div>
          
          <div className="text-center mt-12">
            <Button className="social-button bg-gradient-to-r from-pink-500 to-rose-400 hover:from-pink-600 hover:to-rose-500">
              View All Groups
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default GroupsPreview;
