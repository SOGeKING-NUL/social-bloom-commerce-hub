import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, CheckCircle, Clock, ShoppingCart, Users, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface GroupCheckoutProps {
  groupId: string;
  isAdmin: boolean;
}

interface CheckoutSession {
  session_id: string;
  status: 'pending' | 'member_payments' | 'admin_final' | 'completed' | 'cancelled';
  total_amount: number;
  created_at: string;
  member_count: number;
  paid_members: number;
  pending_members: number;
  items_count: number;
}

interface CheckoutItem {
  id: string;
  user_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  shipping_address: string;
  payment_status: 'pending' | 'paid' | 'failed';
  product: {
    name: string;
    image_url?: string;
  };
  user: {
    full_name: string;
    email: string;
  };
}

const GroupCheckout = ({ groupId, isAdmin }: GroupCheckoutProps) => {
  const [showAddressDialog, setShowAddressDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<CheckoutItem | null>(null);
  const [shippingAddress, setShippingAddress] = useState("");
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch checkout dashboard data for admin
  const { data: checkoutSessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ['group-checkout-dashboard', groupId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_group_checkout_dashboard', {
        p_group_id: groupId,
        p_admin_id: user?.id
      });
      
      if (error) throw error;
      return data as CheckoutSession[];
    },
    enabled: isAdmin && !!user?.id
  });

  // Fetch user's checkout items if not admin
  const { data: userItems, isLoading: itemsLoading } = useQuery({
    queryKey: ['user-checkout-items', groupId, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('group_checkout_items')
        .select(`
          *,
          product:products(name, image_url),
          checkout_session:group_checkout_sessions!inner(group_id, status)
        `)
        .eq('user_id', user?.id)
        .eq('checkout_session.group_id', groupId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as CheckoutItem[];
    },
    enabled: !isAdmin && !!user?.id
  });

  // Fetch user notifications
  const { data: notifications } = useQuery({
    queryKey: ['checkout-notifications', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('group_checkout_notifications')
        .select(`
          *,
          checkout_session:group_checkout_sessions!inner(group_id)
        `)
        .eq('user_id', user?.id)
        .eq('checkout_session.group_id', groupId)
        .order('sent_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  // Initiate group checkout mutation (admin only)
  const initiateCheckoutMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('initiate_group_checkout', {
        p_group_id: groupId,
        p_admin_id: user?.id
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-checkout-dashboard', groupId] });
      toast({
        title: "Checkout Initiated",
        description: "Group checkout has been started. Members will be notified.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Send payment notifications mutation (admin only)
  const sendNotificationsMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const { data, error } = await supabase.rpc('send_payment_notifications', {
        p_checkout_session_id: sessionId
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Notifications Sent",
        description: "Payment notifications have been sent to all members.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Update shipping address mutation
  const updateAddressMutation = useMutation({
    mutationFn: async ({ itemId, address }: { itemId: string; address: string }) => {
      const { error } = await supabase
        .from('group_checkout_items')
        .update({ shipping_address: address })
        .eq('id', itemId)
        .eq('user_id', user?.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-checkout-items', groupId, user?.id] });
      setShowAddressDialog(false);
      setShippingAddress("");
      toast({
        title: "Address Updated",
        description: "Shipping address has been updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update address.",
        variant: "destructive"
      });
    }
  });

  const handleAddressUpdate = (item: CheckoutItem) => {
    setSelectedItem(item);
    setShippingAddress(item.shipping_address);
    setShowAddressDialog(true);
  };

  const handleSaveAddress = () => {
    if (!selectedItem) return;
    updateAddressMutation.mutate({
      itemId: selectedItem.id,
      address: shippingAddress
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'member_payments':
        return 'bg-blue-100 text-blue-800';
      case 'admin_final':
        return 'bg-purple-100 text-purple-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'member_payments':
        return <Users className="w-4 h-4" />;
      case 'admin_final':
        return <DollarSign className="w-4 h-4" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'cancelled':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  if (isAdmin) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Group Checkout Management</h2>
          <Button
            onClick={() => initiateCheckoutMutation.mutate()}
            disabled={initiateCheckoutMutation.isPending}
            className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            Start Group Checkout
          </Button>
        </div>

        {sessionsLoading ? (
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {checkoutSessions?.map((session) => (
              <Card key={session.session_id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      Checkout Session
                    </CardTitle>
                    <Badge className={getStatusColor(session.status)}>
                      {getStatusIcon(session.status)}
                      <span className="ml-1 capitalize">{session.status.replace('_', ' ')}</span>
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-600">Total Amount</p>
                      <p className="text-2xl font-bold text-green-600">${session.total_amount}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Members</p>
                      <p className="text-2xl font-bold">{session.member_count}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Paid</p>
                      <p className="text-2xl font-bold text-green-600">{session.paid_members}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Pending</p>
                      <p className="text-2xl font-bold text-yellow-600">{session.pending_members}</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    {session.status === 'pending' && (
                      <Button
                        size="sm"
                        onClick={() => sendNotificationsMutation.mutate(session.session_id)}
                        disabled={sendNotificationsMutation.isPending}
                      >
                        Send Payment Notifications
                      </Button>
                    )}
                    {session.status === 'member_payments' && session.pending_members === 0 && (
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Final Checkout
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}

            {(!checkoutSessions || checkoutSessions.length === 0) && (
              <Card>
                <CardContent className="text-center py-8">
                  <ShoppingCart className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500">No checkout sessions yet.</p>
                  <p className="text-sm text-gray-400">Click "Start Group Checkout" to begin.</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    );
  }

  // Member view
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">My Checkout Items</h2>

      {/* Notifications */}
      {notifications && notifications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Notifications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {notifications.slice(0, 3).map((notification) => (
                <div key={notification.id} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm">{notification.message}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(notification.sent_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* User Items */}
      {itemsLoading ? (
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded"></div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {userItems?.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <img
                    src={item.product.image_url || "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=100&h=100&fit=crop"}
                    alt={item.product.name}
                    className="w-16 h-16 object-cover rounded"
                  />
                  <div className="flex-1">
                    <h4 className="font-medium">{item.product.name}</h4>
                    <p className="text-sm text-gray-600">
                      Quantity: {item.quantity} × ${item.unit_price} = ${item.total_price}
                    </p>
                    <Badge className={getStatusColor(item.payment_status)}>
                      {item.payment_status}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAddressUpdate(item)}
                    >
                      {item.shipping_address === 'Address not provided' ? 'Add Address' : 'Update Address'}
                    </Button>
                  </div>
                </div>
                
                {item.shipping_address !== 'Address not provided' && (
                  <div className="mt-3 p-3 bg-gray-50 rounded">
                    <p className="text-sm font-medium">Shipping Address:</p>
                    <p className="text-sm text-gray-600">{item.shipping_address}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {(!userItems || userItems.length === 0) && (
            <Card>
              <CardContent className="text-center py-8">
                <ShoppingCart className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500">No checkout items yet.</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Address Dialog */}
      <Dialog open={showAddressDialog} onOpenChange={setShowAddressDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Shipping Address</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="address">Shipping Address</Label>
              <Textarea
                id="address"
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                placeholder="Enter your full shipping address..."
                rows={4}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSaveAddress} disabled={updateAddressMutation.isPending}>
                Save Address
              </Button>
              <Button variant="outline" onClick={() => setShowAddressDialog(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GroupCheckout;