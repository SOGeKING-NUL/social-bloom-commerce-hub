import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, CheckCircle, Clock, ShoppingCart, Users, DollarSign, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { loadStripe } from '@stripe/stripe-js';

// Make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render.
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

interface GroupCheckoutProps {
  groupId: string;
  isAdmin: boolean;
}

interface CheckoutSession {
  id: string;
  group_id: string;
  admin_id: string;
  status: string;
  total_amount: number;
  admin_final_amount: number;
  created_at: string;
  expires_at?: string;
  completed_at?: string;
  stripe_session_id?: string;
  notes?: string;
}

interface CheckoutItem {
  id: string;
  checkout_session_id: string;
  user_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  shipping_address: string;
  payment_status: string;
  stripe_payment_intent_id?: string;
  paid_at?: string;
  created_at: string;
  product?: {
    name: string;
    image_url?: string;
  };
  user?: {
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

  // Fetch checkout sessions for the group
  const { data: checkoutSessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ['group-checkout-sessions', groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('group_checkout_sessions')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!groupId
  });

  // Get the latest/active checkout session
  const currentSession = checkoutSessions?.[0];

  // Fetch checkout items for the current session
  const { data: checkoutItems, isLoading: itemsLoading } = useQuery({
    queryKey: ['group-checkout-items', currentSession?.id],
    queryFn: async () => {
      if (!currentSession?.id) return [];
      
      const { data: items, error } = await supabase
        .from('group_checkout_items')
        .select(`
          *,
          product:products(name, image_url),
          user:profiles(full_name, email)
        `)
        .eq('checkout_session_id', currentSession.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return items || [];
    },
    enabled: !!currentSession?.id
  });

  // Fetch user notifications
  const { data: notifications } = useQuery({
    queryKey: ['checkout-notifications', user?.id, groupId],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('group_checkout_notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('sent_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id
  });

  // Create a new checkout session
  const createCheckoutMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');
      
      // First, get all group members who have products in their cart for this group
      const { data: memberCartItems, error: cartError } = await supabase
        .from('cart_items')
        .select(`
          *,
          product:products!inner(vendor_id),
          user:profiles(full_name, email)
        `)
        .eq('product.vendor_id', groupId); // Assuming vendor_id corresponds to group vendor
      
      if (cartError) throw cartError;
      
      if (!memberCartItems || memberCartItems.length === 0) {
        throw new Error('No items in group member carts');
      }
      
      // Create checkout session
      const { data: session, error: sessionError } = await supabase
        .from('group_checkout_sessions')
        .insert({
          group_id: groupId,
          admin_id: user.id,
          status: 'pending',
          total_amount: 0,
          admin_final_amount: 0,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours from now
        })
        .select()
        .single();
      
      if (sessionError) throw sessionError;
      
      // Create checkout items for each cart item
      const checkoutItems = memberCartItems.map(item => ({
        checkout_session_id: session.id,
        user_id: item.user_id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.product.price,
        total_price: item.product.price * item.quantity,
        shipping_address: '',
        payment_status: 'pending'
      }));
      
      const { error: itemsError } = await supabase
        .from('group_checkout_items')
        .insert(checkoutItems);
      
      if (itemsError) throw itemsError;
      
      // Calculate total amount
      const totalAmount = checkoutItems.reduce((sum, item) => sum + item.total_price, 0);
      
      // Update session with total amount
      const { error: updateError } = await supabase
        .from('group_checkout_sessions')
        .update({ total_amount: totalAmount })
        .eq('id', session.id);
      
      if (updateError) throw updateError;
      
      return session;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-checkout-sessions', groupId] });
      queryClient.invalidateQueries({ queryKey: ['group-checkout-items'] });
      toast({
        title: "Checkout Session Created",
        description: "Group checkout session has been initiated. Members can now add shipping addresses and complete payments.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create checkout session",
        variant: "destructive",
      });
    }
  });

  // Send payment notifications to members
  const sendNotificationsMutation = useMutation({
    mutationFn: async () => {
      if (!currentSession) throw new Error('No active checkout session');
      
      // Get all users who have items in this checkout session
      const uniqueUserIds = [...new Set(checkoutItems?.map(item => item.user_id) || [])];
      
      const notifications = uniqueUserIds.map(userId => ({
        checkout_session_id: currentSession.id,
        user_id: userId,
        notification_type: 'payment_required',
        message: 'Please add your shipping address and complete payment for your group order.',
        sent_at: new Date().toISOString()
      }));
      
      const { error } = await supabase
        .from('group_checkout_notifications')
        .insert(notifications);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checkout-notifications'] });
      toast({
        title: "Notifications Sent",
        description: "Payment notifications have been sent to all group members.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send notifications",
        variant: "destructive",
      });
    }
  });

  // Update shipping address
  const updateAddressMutation = useMutation({
    mutationFn: async ({ itemId, address }: { itemId: string; address: string }) => {
      const { error } = await supabase
        .from('group_checkout_items')
        .update({ shipping_address: address })
        .eq('id', itemId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-checkout-items'] });
      setShowAddressDialog(false);
      setSelectedItem(null);
      setShippingAddress("");
      toast({
        title: "Address Updated",
        description: "Shipping address has been saved.",
      });
    }
  });

  // Process individual member payment
  const processPaymentMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const item = checkoutItems?.find(i => i.id === itemId);
      if (!item) throw new Error('Item not found');
      
      // Create Stripe payment intent for this specific item
      const response = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: item.total_price,
          currency: 'usd',
          metadata: {
            checkout_item_id: itemId,
            user_id: user?.id,
            group_id: groupId
          }
        })
      });
      
      if (!response.ok) throw new Error('Failed to create payment intent');
      
      const { clientSecret } = await response.json();
      
      // Redirect to payment page or open payment modal
      const stripe = await stripePromise;
      if (!stripe) throw new Error('Stripe not loaded');
      
      const { error } = await stripe.confirmPayment({
        clientSecret,
        confirmParams: {
          return_url: `${window.location.origin}/groups/${groupId}?payment=success`,
        },
      });
      
      if (error) throw error;
    },
    onError: (error: any) => {
      toast({
        title: "Payment Failed",
        description: error.message || "Failed to process payment",
        variant: "destructive",
      });
    }
  });

  const handleAddressUpdate = (item: CheckoutItem) => {
    setSelectedItem(item);
    setShippingAddress(item.shipping_address);
    setShowAddressDialog(true);
  };

  const handleSubmitAddress = () => {
    if (selectedItem && shippingAddress.trim()) {
      updateAddressMutation.mutate({
        itemId: selectedItem.id,
        address: shippingAddress.trim()
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'member_payments': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (sessionsLoading) {
    return <div className="flex items-center justify-center p-8">Loading checkout data...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Group Checkout</h2>
        {isAdmin && !currentSession && (
          <Button
            onClick={() => createCheckoutMutation.mutate()}
            disabled={createCheckoutMutation.isPending}
            className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
          >
            <ShoppingCart className="mr-2 h-4 w-4" />
            {createCheckoutMutation.isPending ? 'Creating...' : 'Start Group Checkout'}
          </Button>
        )}
      </div>

      {/* Current Session Status */}
      {currentSession && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Checkout Session Status</span>
              <Badge className={getStatusColor(currentSession.status)}>
                {currentSession.status.replace('_', ' ').toUpperCase()}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">Total Amount</p>
                  <p className="font-semibold">${currentSession.total_amount.toFixed(2)}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Total Items</p>
                  <p className="font-semibold">{checkoutItems?.length || 0}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="text-sm text-gray-600">Created</p>
                  <p className="font-semibold">
                    {new Date(currentSession.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
            
            {isAdmin && currentSession.status === 'pending' && (
              <div className="mt-4">
                <Button
                  onClick={() => sendNotificationsMutation.mutate()}
                  disabled={sendNotificationsMutation.isPending}
                  variant="outline"
                >
                  <Users className="mr-2 h-4 w-4" />
                  {sendNotificationsMutation.isPending ? 'Sending...' : 'Send Payment Notifications'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Checkout Items - Showing which member selected which product */}
      {checkoutItems && checkoutItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Checkout Items by Member</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {checkoutItems.map((item) => (
                <div key={item.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      {item.product?.image_url && (
                        <img
                          src={item.product.image_url}
                          alt={item.product.name}
                          className="w-16 h-16 object-cover rounded-lg"
                        />
                      )}
                      <div className="flex-1">
                        <h3 className="font-semibold">{item.product?.name}</h3>
                        <div className="flex items-center space-x-2 mt-1">
                          <User className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-600">
                            Selected by: {item.user?.full_name} ({item.user?.email})
                          </span>
                        </div>
                        <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                          <span>Quantity: {item.quantity}</span>
                          <span>Unit Price: ${item.unit_price.toFixed(2)}</span>
                          <span className="font-semibold">Total: ${item.total_price.toFixed(2)}</span>
                        </div>
                        {item.shipping_address && (
                          <p className="text-sm text-gray-600 mt-1">
                            <strong>Shipping:</strong> {item.shipping_address}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end space-y-2">
                      <Badge className={getPaymentStatusColor(item.payment_status)}>
                        {item.payment_status.toUpperCase()}
                      </Badge>
                      {item.user_id === user?.id && item.payment_status === 'pending' && (
                        <div className="space-y-2">
                          {!item.shipping_address && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAddressUpdate(item)}
                            >
                              Add Address
                            </Button>
                          )}
                          {item.shipping_address && (
                            <Button
                              size="sm"
                              onClick={() => processPaymentMutation.mutate(item.id)}
                              disabled={processPaymentMutation.isPending}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              Pay Now
                            </Button>
                          )}
                        </div>
                      )}
                      {item.user_id === user?.id && item.shipping_address && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleAddressUpdate(item)}
                        >
                          Edit Address
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* User Notifications */}
      {notifications && notifications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Payment Notifications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {notifications.slice(0, 5).map((notification) => (
                <div key={notification.id} className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm">{notification.message}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(notification.sent_at || '').toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Session State */}
      {!currentSession && !sessionsLoading && (
        <Card>
          <CardContent className="text-center py-8">
            <ShoppingCart className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">No Active Checkout Session</h3>
            <p className="text-gray-500 mb-4">
              {isAdmin 
                ? "Start a group checkout session to begin the payment process for all members."
                : "Waiting for the group admin to start the checkout process."
              }
            </p>
          </CardContent>
        </Card>
      )}

      {/* Address Dialog */}
      <Dialog open={showAddressDialog} onOpenChange={setShowAddressDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Shipping Address</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="address">Shipping Address</Label>
              <Textarea
                id="address"
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                placeholder="Enter your complete shipping address..."
                rows={4}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowAddressDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmitAddress}
                disabled={!shippingAddress.trim() || updateAddressMutation.isPending}
              >
                {updateAddressMutation.isPending ? 'Saving...' : 'Save Address'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GroupCheckout;