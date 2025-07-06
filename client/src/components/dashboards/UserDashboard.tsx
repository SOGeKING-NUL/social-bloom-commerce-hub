
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Heart, Users, Package } from "lucide-react";
import { useNavigate } from "react-router-dom";

const UserDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Fetch user stats
  const { data: stats, isLoading } = useQuery({
    queryKey: ['user-stats', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const [cartResult, wishlistResult, ordersResult, groupsResult] = await Promise.all([
        supabase.from('cart_items').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('wishlist').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('orders').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('group_members').select('id', { count: 'exact', head: true }).eq('user_id', user.id)
      ]);

      return {
        cartItems: cartResult.count || 0,
        wishlistItems: wishlistResult.count || 0,
        totalOrders: ordersResult.count || 0,
        groupsJoined: groupsResult.count || 0
      };
    },
    enabled: !!user?.id,
  });

  // Fetch recent orders
  const { data: recentOrders = [] } = useQuery({
    queryKey: ['user-recent-orders', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch recent groups
  const { data: recentGroups = [] } = useQuery({
    queryKey: ['user-recent-groups', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('group_members')
        .select(`
          *,
          groups (
            id,
            name,
            description
          )
        `)
        .eq('user_id', user.id)
        .order('joined_at', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-8 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">My Dashboard</h2>
        <p className="text-gray-600">Welcome back! Here's your shopping activity overview</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/cart")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cart Items</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.cartItems || 0}</div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/wishlist")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Wishlist</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.wishlistItems || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalOrders || 0}</div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/groups")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Groups Joined</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.groupsJoined || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Orders</CardTitle>
          <Button variant="outline" size="sm" onClick={() => navigate("/orders")}>
            View All
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">Order #{order.id.slice(0, 8)}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(order.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold">${Number(order.total_amount).toFixed(2)}</p>
                  <p className="text-sm text-gray-500 capitalize">{order.status}</p>
                </div>
              </div>
            ))}
            
            {recentOrders.length === 0 && (
              <p className="text-center text-gray-500 py-8">No orders yet</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Groups */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>My Groups</CardTitle>
          <Button variant="outline" size="sm" onClick={() => navigate("/groups")}>
            View All
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentGroups.map((membership) => (
              <div key={membership.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">{membership.groups?.name}</p>
                  <p className="text-sm text-gray-500">
                    {membership.groups?.description || 'No description'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">
                    Joined {new Date(membership.joined_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
            
            {recentGroups.length === 0 && (
              <p className="text-center text-gray-500 py-8">No groups joined yet</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserDashboard;
