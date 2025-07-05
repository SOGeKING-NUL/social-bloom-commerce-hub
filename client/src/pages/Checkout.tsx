import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, CreditCard, Lock, Truck, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";

interface CartItem {
  id: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    price: number;
    image_url?: string;
  };
}

const Checkout = () => {
  const [billingInfo, setBillingInfo] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'US'
  });
  
  const [shippingInfo, setShippingInfo] = useState({
    firstName: '',
    lastName: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'US'
  });
  
  const [sameAsBilling, setSameAsBilling] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState('credit');
  const [cardInfo, setCardInfo] = useState({
    number: '',
    expiry: '',
    cvv: '',
    name: ''
  });
  
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [location, setLocation] = useLocation();

  // Fetch cart items for checkout
  const { data: cartItems, isLoading } = useQuery({
    queryKey: ['cart-items', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('cart_items')
        .select(`
          id,
          quantity,
          product:products(id, name, price, image_url)
        `)
        .eq('user_id', user.id);
      
      if (error) throw error;
      return data as CartItem[];
    },
    enabled: !!user,
  });

  // Process order mutation
  const processOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      // In a real app, you would integrate with a payment processor here
      // For now, we'll simulate the order creation
      
      const orderItems = cartItems?.map(item => ({
        product_id: item.product.id,
        quantity: item.quantity,
        price: item.product.price
      })) || [];

      if (!user?.id) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          total_amount: total,
          status: 'pending',
          shipping_address: sameAsBilling ? `${billingInfo.address}, ${billingInfo.city}, ${billingInfo.state} ${billingInfo.zipCode}` : `${shippingInfo.address}, ${shippingInfo.city}, ${shippingInfo.state} ${shippingInfo.zipCode}`,
        })
        .select()
        .single();

      if (error) throw error;

      // Insert order items
      const orderItemsWithOrderId = orderItems.map(item => ({
        ...item,
        order_id: data.id
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItemsWithOrderId);

      if (itemsError) throw itemsError;

      // Clear cart
      const { error: clearCartError } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', user.id);

      if (clearCartError) throw clearCartError;

      return data;
    },
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: ['cart-items', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['cart-count', user?.id] });
      toast({
        title: "Order Placed Successfully!",
        description: `Your order #${order.id} has been placed and is being processed.`,
      });
      setLocation('/orders');
    },
    onError: (error) => {
      toast({
        title: "Order Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!billingInfo.firstName || !billingInfo.lastName || !billingInfo.email || !billingInfo.address) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required billing information.",
        variant: "destructive"
      });
      return;
    }

    if (!sameAsBilling && (!shippingInfo.firstName || !shippingInfo.lastName || !shippingInfo.address)) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required shipping information.",
        variant: "destructive"
      });
      return;
    }

    if (!cardInfo.number || !cardInfo.expiry || !cardInfo.cvv || !cardInfo.name) {
      toast({
        title: "Missing Payment Information",
        description: "Please fill in all payment details.",
        variant: "destructive"
      });
      return;
    }

    processOrderMutation.mutate({
      billingInfo,
      shippingInfo: sameAsBilling ? billingInfo : shippingInfo,
      paymentMethod,
      cardInfo
    });
  };

  const subtotal = cartItems?.reduce((sum, item) => sum + (item.product.price * item.quantity), 0) || 0;
  const shipping = subtotal > 50 ? 0 : 9.99;
  const tax = subtotal * 0.08;
  const total = subtotal + shipping + tax;

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-48"></div>
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!cartItems || cartItems.length === 0) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Your cart is empty</h1>
          <p className="text-gray-600 mb-8">Add some items to your cart before checking out.</p>
          <Button onClick={() => setLocation('/groups')}>Continue Shopping</Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation('/cart')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Cart
          </Button>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <CreditCard className="w-8 h-8" />
            Checkout
          </h1>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Checkout Form */}
            <div className="lg:col-span-2 space-y-8">
              {/* Billing Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    Billing Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input
                        id="firstName"
                        value={billingInfo.firstName}
                        onChange={(e) => setBillingInfo(prev => ({ ...prev, firstName: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Last Name *</Label>
                      <Input
                        id="lastName"
                        value={billingInfo.lastName}
                        onChange={(e) => setBillingInfo(prev => ({ ...prev, lastName: e.target.value }))}
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={billingInfo.email}
                        onChange={(e) => setBillingInfo(prev => ({ ...prev, email: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={billingInfo.phone}
                        onChange={(e) => setBillingInfo(prev => ({ ...prev, phone: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="address">Address *</Label>
                    <Input
                      id="address"
                      value={billingInfo.address}
                      onChange={(e) => setBillingInfo(prev => ({ ...prev, address: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="city">City *</Label>
                      <Input
                        id="city"
                        value={billingInfo.city}
                        onChange={(e) => setBillingInfo(prev => ({ ...prev, city: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="state">State *</Label>
                      <Input
                        id="state"
                        value={billingInfo.state}
                        onChange={(e) => setBillingInfo(prev => ({ ...prev, state: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="zipCode">ZIP Code *</Label>
                      <Input
                        id="zipCode"
                        value={billingInfo.zipCode}
                        onChange={(e) => setBillingInfo(prev => ({ ...prev, zipCode: e.target.value }))}
                        required
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Shipping Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="w-5 h-5" />
                    Shipping Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="sameAsBilling"
                      checked={sameAsBilling}
                      onChange={(e) => setSameAsBilling(e.target.checked)}
                      className="rounded"
                    />
                    <Label htmlFor="sameAsBilling">Same as billing address</Label>
                  </div>

                  {!sameAsBilling && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="shippingFirstName">First Name *</Label>
                          <Input
                            id="shippingFirstName"
                            value={shippingInfo.firstName}
                            onChange={(e) => setShippingInfo(prev => ({ ...prev, firstName: e.target.value }))}
                            required={!sameAsBilling}
                          />
                        </div>
                        <div>
                          <Label htmlFor="shippingLastName">Last Name *</Label>
                          <Input
                            id="shippingLastName"
                            value={shippingInfo.lastName}
                            onChange={(e) => setShippingInfo(prev => ({ ...prev, lastName: e.target.value }))}
                            required={!sameAsBilling}
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="shippingAddress">Address *</Label>
                        <Input
                          id="shippingAddress"
                          value={shippingInfo.address}
                          onChange={(e) => setShippingInfo(prev => ({ ...prev, address: e.target.value }))}
                          required={!sameAsBilling}
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="shippingCity">City *</Label>
                          <Input
                            id="shippingCity"
                            value={shippingInfo.city}
                            onChange={(e) => setShippingInfo(prev => ({ ...prev, city: e.target.value }))}
                            required={!sameAsBilling}
                          />
                        </div>
                        <div>
                          <Label htmlFor="shippingState">State *</Label>
                          <Input
                            id="shippingState"
                            value={shippingInfo.state}
                            onChange={(e) => setShippingInfo(prev => ({ ...prev, state: e.target.value }))}
                            required={!sameAsBilling}
                          />
                        </div>
                        <div>
                          <Label htmlFor="shippingZipCode">ZIP Code *</Label>
                          <Input
                            id="shippingZipCode"
                            value={shippingInfo.zipCode}
                            onChange={(e) => setShippingInfo(prev => ({ ...prev, zipCode: e.target.value }))}
                            required={!sameAsBilling}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Payment Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lock className="w-5 h-5" />
                    Payment Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Payment Method</Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="credit">Credit Card</SelectItem>
                        <SelectItem value="debit">Debit Card</SelectItem>
                        <SelectItem value="paypal">PayPal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {(paymentMethod === 'credit' || paymentMethod === 'debit') && (
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="cardName">Name on Card *</Label>
                        <Input
                          id="cardName"
                          value={cardInfo.name}
                          onChange={(e) => setCardInfo(prev => ({ ...prev, name: e.target.value }))}
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="cardNumber">Card Number *</Label>
                        <Input
                          id="cardNumber"
                          placeholder="1234 5678 9012 3456"
                          value={cardInfo.number}
                          onChange={(e) => setCardInfo(prev => ({ ...prev, number: e.target.value }))}
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="cardExpiry">Expiry Date *</Label>
                          <Input
                            id="cardExpiry"
                            placeholder="MM/YY"
                            value={cardInfo.expiry}
                            onChange={(e) => setCardInfo(prev => ({ ...prev, expiry: e.target.value }))}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="cardCvv">CVV *</Label>
                          <Input
                            id="cardCvv"
                            placeholder="123"
                            value={cardInfo.cvv}
                            onChange={(e) => setCardInfo(prev => ({ ...prev, cvv: e.target.value }))}
                            required
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Order Summary */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {cartItems?.map((item) => (
                    <div key={item.id} className="flex items-center gap-3">
                      <img
                        src={item.product.image_url || "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=50&h=50&fit=crop"}
                        alt={item.product.name}
                        className="w-12 h-12 object-cover rounded"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item.product.name}</p>
                        <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                      </div>
                      <p className="font-semibold">${(item.product.price * item.quantity).toFixed(2)}</p>
                    </div>
                  ))}
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>${subtotal.toFixed(2)}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span>Shipping</span>
                      <span>{shipping === 0 ? 'Free' : `$${shipping.toFixed(2)}`}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span>Tax</span>
                      <span>${tax.toFixed(2)}</span>
                    </div>
                    
                    <Separator />
                    
                    <div className="flex justify-between font-semibold text-lg">
                      <span>Total</span>
                      <span>${total.toFixed(2)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Button 
                type="submit"
                disabled={processOrderMutation.isPending}
                className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-semibold py-3"
                size="lg"
              >
                {processOrderMutation.isPending ? 'Processing...' : 'Place Order'}
              </Button>

              <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                <Shield className="w-4 h-4" />
                <span>Secure 256-bit SSL encryption</span>
              </div>
            </div>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default Checkout;