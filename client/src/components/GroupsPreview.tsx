
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Lock, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const GroupsPreview = () => {
  const navigate = useNavigate();

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ['groups-preview'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('groups')
        .select(`
          *,
          group_members!inner (
            user_id
          ),
          products (
            name,
            image_url
          )
        `)
        .limit(6);
      
      if (error) throw error;
      
      const processedGroups = data?.map(group => {
        const uniqueCategories = new Set<string>();
        const uniqueProducts = new Set<string>();
        
        if (group.products?.name) {
          uniqueProducts.add(group.products.name);
        }
        
        return {
          ...group,
          members: Array.from(uniqueCategories).length,
          products: Array.from(uniqueProducts).length,
          image: group.products?.image_url || "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=300&h=200&fit=crop"
        };
      }) || [];
      
      return processedGroups;
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="h-32 bg-gray-200 rounded-lg"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Popular Groups</h2>
        <Button variant="outline" onClick={() => navigate("/groups")}>
          View All Groups
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {groups.slice(0, 6).map((group) => (
          <Card key={group.id} className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
            <div className="relative">
              <img 
                src={group.image} 
                alt={group.name}
                className="w-full h-32 object-cover"
                onClick={() => navigate(`/groups/${group.id}`)}
              />
              <div className="absolute top-2 right-2">
                {group.is_private ? (
                  <Lock className="w-4 h-4 text-white bg-black bg-opacity-50 rounded-full p-1" />
                ) : null}
              </div>
            </div>
            
            <CardContent className="p-4">
              <h3 className="font-semibold mb-2">{group.name}</h3>
              <div className="flex items-center justify-between text-sm text-gray-600">
                <div className="flex items-center">
                  <Users className="w-4 h-4 mr-1" />
                  <span>{group.members} members</span>
                </div>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => navigate(`/groups/${group.id}`)}
                >
                  View
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default GroupsPreview;
