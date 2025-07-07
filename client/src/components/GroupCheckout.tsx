import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, ShoppingCart, Users, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface GroupCheckoutProps {
  groupId: string;
  isAdmin: boolean;
}

const GroupCheckout = ({ groupId, isAdmin }: GroupCheckoutProps) => {
  const { toast } = useToast();
  const { user } = useAuth();

  // Fetch group details
  const { data: group, isLoading: groupLoading } = useQuery({
    queryKey: ['group', groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('groups')
        .select(`
          *,
          creator:profiles!groups_creator_id_fkey(full_name, email),
          product:products!groups_product_id_fkey(name, price, image_url)
        `)
        .eq('id', groupId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!groupId
  });

  // Fetch group members
  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ['group-members', groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('group_members')
        .select(`
          *,
          user:profiles(full_name, email, avatar_url)
        `)
        .eq('group_id', groupId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!groupId
  });

  // Fetch member cart items for this group's product
  const { data: memberCartItems, isLoading: cartLoading } = useQuery({
    queryKey: ['member-cart-items', groupId, group?.product_id],
    queryFn: async () => {
      if (!group?.product_id) return [];
      
      const memberIds = members?.map(m => m.user_id) || [];
      if (memberIds.length === 0) return [];

      const { data, error } = await supabase
        .from('cart_items')
        .select(`
          *,
          user:profiles(full_name, email)
        `)
        .eq('product_id', group.product_id)
        .in('user_id', memberIds);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!group?.product_id && !!members?.length
  });

  const handleInitiateCheckout = async () => {
    if (!memberCartItems || memberCartItems.length === 0) {
      toast({
        title: "No Items to Checkout",
        description: "No group members have added this product to their cart yet.",
        variant: "destructive"
      });
      return;
    }

    // Calculate total amount
    const totalAmount = memberCartItems.reduce((sum, item) => {
      return sum + (item.quantity * (group?.product?.price || 0));
    }, 0);

    toast({
      title: "Checkout Initiated",
      description: `Group checkout for ${memberCartItems.length} items totaling $${totalAmount.toFixed(2)} has been initiated. Individual payment processing will be implemented soon.`,
    });
  };

  if (groupLoading || membersLoading || cartLoading) {
    return <div className="flex items-center justify-center p-8">Loading checkout data...</div>;
  }

  if (!group) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Group Not Found</h3>
          <p className="text-gray-600 dark:text-gray-300">The group you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  const totalItems = memberCartItems?.reduce((sum, item) => sum + item.quantity, 0) || 0;
  const totalAmount = memberCartItems?.reduce((sum, item) => {
    return sum + (item.quantity * (group.product?.price || 0));
  }, 0) || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Group Checkout</h2>
        {isAdmin && memberCartItems && memberCartItems.length > 0 && (
          <Button
            onClick={handleInitiateCheckout}
            className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
          >
            <ShoppingCart className="mr-2 h-4 w-4" />
            Initiate Group Checkout
          </Button>
        )}
      </div>

      {/* Group Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            {group.name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              {group.product?.image_url && (
                <img
                  src={group.product.image_url}
                  alt={group.product.name}
                  className="w-16 h-16 object-cover rounded-lg"
                />
              )}
              <div>
                <h3 className="font-semibold">{group.product?.name}</h3>
                <p className="text-lg font-bold text-green-600">
                  ${group.product?.price?.toFixed(2)}
                </p>
              </div>
            </div>
            {group.description && (
              <p className="text-gray-600 dark:text-gray-300">{group.description}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Checkout Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Checkout Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Total Amount</p>
                <p className="font-semibold">${totalAmount.toFixed(2)}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <ShoppingCart className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Total Items</p>
                <p className="font-semibold">{totalItems}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Members</p>
                <p className="font-semibold">{members?.length || 0}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Member Cart Items */}
      {memberCartItems && memberCartItems.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Items in Member Carts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {memberCartItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between border rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <div>
                      <p className="font-semibold">{item.user?.full_name}</p>
                      <p className="text-sm text-gray-600">{item.user?.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">Quantity: {item.quantity}</p>
                    <p className="text-sm text-gray-600">
                      ${((group.product?.price || 0) * item.quantity).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="text-center py-8">
            <ShoppingCart className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Items in Cart</h3>
            <p className="text-gray-600 dark:text-gray-300">
              No group members have added this product to their cart yet.
            </p>
          </CardContent>
        </Card>
      )}

      {!isAdmin && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-amber-600">
              <AlertCircle className="h-5 w-5" />
              <p className="font-medium">Only group administrators can initiate checkout</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default GroupCheckout;