import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, CheckCircle, Clock, ShoppingCart, Users, DollarSign, User, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { loadStripe } from '@stripe/stripe-js';
import { useParams } from "wouter";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

interface GroupCheckoutItem {
  id: string;
  user_name: string;
  user_email: string;
  product_name: string;
  product_image: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  shipping_address: string;
  payment_status: string;
  user_id: string;
  product_id: string;
}

const GroupCheckout = () => {
  const [checkoutItems, setCheckoutItems] = useState<GroupCheckoutItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionStatus, setSessionStatus] = useState<string>('');
  const [sessionTotal, setSessionTotal] = useState<number>(0);
  const [showAddressDialog, setShowAddressDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [shippingAddress, setShippingAddress] = useState("");
  const { toast } = useToast();
  const { user } = useAuth();
  const { groupId } = useParams<{ groupId: string }>();

  useEffect(() => {
    if (groupId) {
      loadCheckoutData();
    }
  }, [groupId]);

  const loadCheckoutData = async () => {
    try {
      setLoading(true);
      
      // Create some demo checkout items to show the functionality
      const demoItems: GroupCheckoutItem[] = [
        {
          id: '1',
          user_name: 'John Smith',
          user_email: 'john@example.com',
          product_name: 'Premium Wireless Headphones',
          product_image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&h=300&fit=crop',
          quantity: 1,
          unit_price: 299.99,
          total_price: 299.99,
          shipping_address: '',
          payment_status: 'pending',
          user_id: 'user1',
          product_id: 'prod1'
        },
        {
          id: '2',
          user_name: 'Sarah Johnson',
          user_email: 'sarah@example.com',
          product_name: 'Organic Skincare Set',
          product_image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=300&h=300&fit=crop',
          quantity: 2,
          unit_price: 89.99,
          total_price: 179.98,
          shipping_address: '123 Main St, New York, NY 10001',
          payment_status: 'pending',
          user_id: 'user2',
          product_id: 'prod2'
        },
        {
          id: '3',
          user_name: 'Mike Chen',
          user_email: 'mike@example.com',
          product_name: 'Smart Fitness Tracker',
          product_image: 'https://images.unsplash.com/photo-1544117519-31a4b719223d?w=300&h=300&fit=crop',
          quantity: 1,
          unit_price: 199.99,
          total_price: 199.99,
          shipping_address: '456 Oak Ave, San Francisco, CA 94102',
          payment_status: 'paid',
          user_id: 'user3',
          product_id: 'prod3'
        }
      ];
      
      setCheckoutItems(demoItems);
      setSessionStatus('member_payments');
      setSessionTotal(demoItems.reduce((sum, item) => sum + item.total_price, 0));
      
    } catch (error) {
      console.error('Error loading checkout data:', error);
      toast({
        title: "Error",
        description: "Failed to load checkout data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddressUpdate = (item: GroupCheckoutItem) => {
    setSelectedItem(item);
    setShippingAddress(item.shipping_address);
    setShowAddressDialog(true);
  };

  const handleSaveAddress = () => {
    if (selectedItem && shippingAddress.trim()) {
      // Update the item in state
      setCheckoutItems(prev => 
        prev.map(item => 
          item.id === selectedItem.id 
            ? { ...item, shipping_address: shippingAddress.trim() }
            : item
        )
      );
      
      setShowAddressDialog(false);
      setSelectedItem(null);
      setShippingAddress("");
      
      toast({
        title: "Address Updated",
        description: "Shipping address has been saved.",
      });
    }
  };

  const handlePayment = async (item: GroupCheckoutItem) => {
    try {
      // Create payment intent for this item
      const response = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: item.total_price,
          currency: 'usd',
          customer_name: item.user_name || 'Customer',
          customer_address: item.shipping_address || 'Test Address for Indian Regulations Compliance',
          metadata: {
            checkout_item_id: item.id,
            user_id: item.user_id,
            group_id: groupId
          }
        })
      });
      
      if (!response.ok) throw new Error('Failed to create payment intent');
      
      const { clientSecret } = await response.json();
      
      // Redirect to Stripe checkout
      const stripe = await stripePromise;
      if (!stripe) throw new Error('Stripe not loaded');
      
      const { error } = await stripe.confirmPayment({
        clientSecret,
        confirmParams: {
          return_url: `${window.location.origin}/groups/${groupId}/checkout?payment=success`,
        },
      });
      
      if (error) {
        throw error;
      } else {
        // Update payment status locally
        setCheckoutItems(prev => 
          prev.map(i => 
            i.id === item.id 
              ? { ...i, payment_status: 'paid' }
              : i
          )
        );
      }
      
    } catch (error: any) {
      toast({
        title: "Payment Failed",
        description: error.message || "Failed to process payment",
        variant: "destructive",
      });
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

  const paidItems = checkoutItems.filter(item => item.payment_status === 'paid');
  const pendingItems = checkoutItems.filter(item => item.payment_status === 'pending');

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Group Checkout</h1>
            <p className="text-gray-600 mt-1">Manage group order payments and shipping</p>
          </div>
        </div>

        {/* Session Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Checkout Session Overview</span>
              <Badge className="bg-blue-100 text-blue-800">
                {sessionStatus.replace('_', ' ').toUpperCase()}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-green-100 rounded-lg">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Amount</p>
                  <p className="text-xl font-semibold">${sessionTotal.toFixed(2)}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Package className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Items</p>
                  <p className="text-xl font-semibold">{checkoutItems.length}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-green-100 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Paid Items</p>
                  <p className="text-xl font-semibold">{paidItems.length}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Pending Items</p>
                  <p className="text-xl font-semibold">{pendingItems.length}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Checkout Items by Member */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Items by Member</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {checkoutItems.map((item) => (
                <div key={item.id} className="border rounded-lg p-6 bg-white">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      <img
                        src={item.product_image}
                        alt={item.product_name}
                        className="w-20 h-20 object-cover rounded-lg"
                      />
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">{item.product_name}</h3>
                        <div className="flex items-center space-x-2 mt-2">
                          <User className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-600">
                            <strong>{item.user_name}</strong> ({item.user_email})
                          </span>
                        </div>
                        <div className="flex items-center space-x-6 mt-3 text-sm text-gray-600">
                          <span>Qty: <strong>{item.quantity}</strong></span>
                          <span>Unit: <strong>${item.unit_price.toFixed(2)}</strong></span>
                          <span>Total: <strong>${item.total_price.toFixed(2)}</strong></span>
                        </div>
                        {item.shipping_address && (
                          <div className="mt-3">
                            <p className="text-sm text-gray-600">
                              <strong>Shipping:</strong> {item.shipping_address}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end space-y-3">
                      <Badge className={getPaymentStatusColor(item.payment_status)}>
                        {item.payment_status.toUpperCase()}
                      </Badge>
                      
                      {/* Actions for current user's items */}
                      {item.user_email === user?.email && (
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
                          {item.shipping_address && item.payment_status === 'pending' && (
                            <Button
                              size="sm"
                              onClick={() => handlePayment(item)}
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              Pay ${item.total_price.toFixed(2)}
                            </Button>
                          )}
                          {item.shipping_address && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleAddressUpdate(item)}
                            >
                              Edit Address
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Address Dialog */}
        <Dialog open={showAddressDialog} onOpenChange={setShowAddressDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Update Shipping Address</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="address">Complete Shipping Address</Label>
                <Textarea
                  id="address"
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  placeholder="Enter your complete shipping address including street, city, state, and ZIP code..."
                  rows={4}
                  className="mt-1"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowAddressDialog(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveAddress}
                  disabled={!shippingAddress.trim()}
                  className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                >
                  Save Address
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default GroupCheckout;