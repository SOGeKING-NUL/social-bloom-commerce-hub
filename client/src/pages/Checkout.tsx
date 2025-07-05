import { useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, ShoppingCart, Users, CreditCard } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const Checkout = () => {
  const [, navigate] = useLocation();
  const { user } = useAuth();

  // Fetch user's groups where they have checkout items
  const { data: userGroups, isLoading } = useQuery({
    queryKey: ['user-checkout-groups', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('groups')
        .select(`
          id,
          name,
          description,
          creator_id,
          group_members!inner(user_id)
        `)
        .eq('group_members.user_id', user.id);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user
  });

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-4">
            Group Checkout
          </h1>
          <p className="text-gray-600 text-lg">
            Manage your group purchases and payments
          </p>
        </div>

        {/* How it works section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              How Group Checkout Works
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Users className="w-6 h-6 text-pink-600" />
                </div>
                <h3 className="font-semibold mb-2">1. Admin Initiates</h3>
                <p className="text-sm text-gray-600">
                  Group admin starts the checkout process for all members
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CreditCard className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="font-semibold mb-2">2. Members Pay</h3>
                <p className="text-sm text-gray-600">
                  Each member pays for their selected products individually
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <ShoppingCart className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="font-semibold mb-2">3. Final Checkout</h3>
                <p className="text-sm text-gray-600">
                  Admin completes the final checkout and places the order
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* User's Groups */}
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold mb-4">Your Groups</h2>
          
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-24 bg-gray-200 rounded-lg"></div>
                </div>
              ))}
            </div>
          ) : userGroups && userGroups.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {userGroups.map((group) => (
                <Card key={group.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-lg">{group.name}</h3>
                        <p className="text-gray-600 text-sm mt-1">
                          {group.description || "No description"}
                        </p>
                      </div>
                      <div className="text-right">
                        {group.creator_id === user.id ? (
                          <Badge className="bg-gradient-to-r from-pink-500 to-purple-600 text-white">
                            Admin
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            Member
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-500">
                        {group.creator_id === user.id 
                          ? "Manage group checkout and payments" 
                          : "View your items and payment status"
                        }
                      </div>
                      <Button
                        size="sm"
                        onClick={() => navigate(`/groups/${group.id}`)}
                        className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                      >
                        View Group
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Users className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Groups Found</h3>
                <p className="text-gray-600 mb-4">
                  You're not a member of any groups yet.
                </p>
                <Button
                  onClick={() => navigate('/groups')}
                  className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                >
                  Browse Groups
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Quick Actions */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-2">Create a New Group</h3>
              <p className="text-gray-600 text-sm mb-4">
                Start a new group and invite members for group purchasing
              </p>
              <Button
                variant="outline"
                onClick={() => navigate('/groups')}
                className="w-full"
              >
                Create Group
              </Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-2">Browse Products</h3>
              <p className="text-gray-600 text-sm mb-4">
                Discover products to add to your group purchases
              </p>
              <Button
                variant="outline"
                onClick={() => navigate('/products')}
                className="w-full"
              >
                Browse Products
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Checkout;