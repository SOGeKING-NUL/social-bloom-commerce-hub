
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingBag, DollarSign, TrendingUp, Package } from "lucide-react";
import { useNavigate } from "react-router-dom";

const VendorDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Fetch vendor stats
  const { data: stats, isLoading } = useQuery({
    queryKey: ['vendor-stats', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const [productsResult, ordersResult] = await Promise.all([
        supabase.from('products').select('id', { count: 'exact', head: true }).eq('vendor_id', user.id),
        supabase
          .from('order_items')
          .select(`
            *,
            orders!inner (
              total_amount
            ),
            products!inner (
              vendor_id
            )
          `)
          .eq('products.vendor_id', user.id)
      ]);

      const totalRevenue = ordersResult.data?.reduce((sum, item) => 
        sum + (Number(item.price) * item.quantity), 0
      ) || 0;

      return {
        totalProducts: productsResult.count || 0,
        totalOrders: ordersResult.data?.length || 0,
        totalRevenue
      };
    },
    enabled: !!user?.id,
  });

  // Fetch recent products
  const { data: recentProducts = [] } = useQuery({
    queryKey: ['vendor-recent-products', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('vendor_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch recent orders
  const { data: recentOrders = [] } = useQuery({
    queryKey: ['vendor-recent-orders', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('order_items')
        .select(`
          *,
          orders (
            id,
            created_at,
            status,
            profiles (
              full_name,
              email
            )
          ),
          products (
            name
          )
        `)
        .eq('products.vendor_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Vendor Dashboard</h2>
          <p className="text-gray-600">Manage your products and track your sales</p>
        </div>
        <Button onClick={() => navigate("/vendor/products/new")}>
          Add New Product
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalProducts || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalOrders || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats?.totalRevenue?.toFixed(2) || '0.00'}</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Products */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Products</CardTitle>
          <Button variant="outline" size="sm" onClick={() => navigate("/vendor/products")}>
            View All Products
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentProducts.map((product) => (
              <div key={product.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <img 
                    src={product.image_url || "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=50&h=50&fit=crop"} 
                    alt={product.name}
                    className="w-12 h-12 object-cover rounded"
                  />
                  <div>
                    <p className="font-medium">{product.name}</p>
                    <p className="text-sm text-gray-500">{product.category}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold">${Number(product.price).toFixed(2)}</p>
                  <p className="text-sm text-gray-500">{product.stock_quantity} in stock</p>
                </div>
              </div>
            ))}
            
            {recentProducts.length === 0 && (
              <p className="text-center text-gray-500 py-8">No products yet</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentOrders.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">{item.products?.name}</p>
                  <p className="text-sm text-gray-500">
                    Ordered by {item.orders?.profiles?.full_name || item.orders?.profiles?.email || 'Unknown'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {item.orders?.created_at ? new Date(item.orders.created_at).toLocaleDateString() : ''}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold">
                    {item.quantity} × ${Number(item.price).toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-500 capitalize">{item.orders?.status}</p>
                </div>
              </div>
            ))}
            
            {recentOrders.length === 0 && (
              <p className="text-center text-gray-500 py-8">No orders yet</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VendorDashboard;
