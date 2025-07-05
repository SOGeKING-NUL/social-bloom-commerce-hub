import { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ArrowLeft, CreditCard, Lock } from "lucide-react";
import Layout from "@/components/Layout";

// Test card information for users
const TEST_CARDS = [
  { number: "4242424242424242", type: "Visa", description: "Succeeds" },
  { number: "4000000000000002", type: "Visa", description: "Card declined" },
  { number: "5555555555554444", type: "Mastercard", description: "Succeeds" },
  { number: "2223003122003222", type: "Mastercard", description: "Succeeds" },
];

if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

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

const CheckoutForm = ({ cartItems }: { cartItems: CartItem[] }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [processing, setProcessing] = useState(false);
  const [location, setLocation] = useLocation();
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  const createOrderMutation = useMutation({
    mutationFn: async (paymentIntentId: string) => {
      if (!user || !profile) throw new Error("User not authenticated or profile not found");

      // Calculate total
      const totalAmount = cartItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

      // Create order in Supabase
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: profile.id,
          total_amount: totalAmount,
          status: 'confirmed',
          shipping_address: 'Test Address',
          payment_intent_id: paymentIntentId
        })
        .select()
        .single();

      if (orderError) {
        console.error('Order creation error:', orderError);
        throw orderError;
      }

      // Create order items in Supabase
      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(cartItems.map(item => ({
          order_id: order.id,
          product_id: item.product.id,
          quantity: item.quantity,
          price: item.product.price
        })));

      if (itemsError) throw itemsError;

      // Clear cart after successful order
      const { error: clearError } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', profile.id);

      if (clearError) throw clearError;

      return order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart-items'] });
      queryClient.invalidateQueries({ queryKey: ['cart-count'] });
      toast({
        title: "Order placed successfully!",
        description: "Thank you for your purchase. You'll receive a confirmation email shortly.",
      });
      setLocation('/orders');
    },
    onError: (error: any) => {
      toast({
        title: "Order creation failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/orders`,
        },
        redirect: 'if_required'
      });

      if (error) {
        toast({
          title: "Payment Failed",
          description: error.message,
          variant: "destructive",
        });
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        await createOrderMutation.mutateAsync(paymentIntent.id);
      }
    } catch (error: any) {
      toast({
        title: "Payment Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    }

    setProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Payment Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Lock className="w-4 h-4" />
            <AlertDescription>
              <strong>Test Mode:</strong> Use test card numbers below. No real charges will be made.
              <div className="mt-2 space-y-1">
                {TEST_CARDS.map((card, index) => (
                  <div key={index} className="text-sm">
                    <code className="bg-gray-100 px-1 rounded">{card.number}</code> - {card.type} ({card.description})
                  </div>
                ))}
              </div>
              <div className="mt-2 text-sm">
                Use any valid expiry date (e.g., 12/25) and any 3-digit CVC.
              </div>
            </AlertDescription>
          </Alert>
          
          <PaymentElement />
        </CardContent>
      </Card>

      <Button 
        type="submit" 
        disabled={!stripe || processing || createOrderMutation.isPending}
        className="w-full"
        size="lg"
      >
        {processing || createOrderMutation.isPending ? "Processing..." : "Place Order"}
      </Button>
    </form>
  );
};

const StripeCheckout = () => {
  const { user, profile } = useAuth();
  const [location, setLocation] = useLocation();
  const [clientSecret, setClientSecret] = useState("");
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  // Fetch cart items from Supabase
  const { data: cart, isLoading } = useQuery({
    queryKey: ['cart-items', profile?.id],
    queryFn: async () => {
      if (!profile) return [];
      
      const { data, error } = await supabase
        .from('cart_items')
        .select(`
          id,
          quantity,
          product:products(id, name, price, image_url)
        `)
        .eq('user_id', profile.id);
      
      if (error) throw error;
      return data as CartItem[];
    },
    enabled: !!profile
  });

  useEffect(() => {
    if (cart) {
      setCartItems(cart);
    }
  }, [cart]);

  // Debug logging
  console.log('StripeCheckout - user:', user?.id, 'profile:', profile?.id, 'cart items:', cartItems.length);

  useEffect(() => {
    const createPaymentIntent = async () => {
      if (!cartItems.length || clientSecret) return; // Don't recreate if already exists

      const totalAmount = cartItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
      
      try {
        const response = await fetch('/api/create-payment-intent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: totalAmount,
            currency: 'usd',
            customer_name: profile?.full_name || 'Customer',
            customer_address: 'Test Address for Indian Regulations Compliance'
          }),
        });

        const data = await response.json();
        setClientSecret(data.clientSecret);
      } catch (error) {
        console.error('Error creating payment intent:', error);
      }
    };

    createPaymentIntent();
  }, [cartItems, clientSecret, profile]);

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
        </div>
      </Layout>
    );
  }

  if (!cartItems.length) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="p-8 text-center">
              <h2 className="text-2xl font-bold mb-4">Your cart is empty</h2>
              <p className="text-gray-600 mb-6">Add some items to your cart before checking out.</p>
              <Button onClick={() => setLocation('/products')}>
                Continue Shopping
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  const total = cartItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

  if (!clientSecret) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center mb-8">
            <Button
              variant="outline"
              onClick={() => setLocation('/cart')}
              className="mr-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Cart
            </Button>
            <h1 className="text-3xl font-bold">Checkout</h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Order Summary */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {cartItems.map((item) => (
                    <div key={item.id} className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        {item.product.image_url && (
                          <img
                            src={item.product.image_url}
                            alt={item.product.name}
                            className="w-12 h-12 object-cover rounded"
                          />
                        )}
                        <div>
                          <h3 className="font-medium">{item.product.name}</h3>
                          <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                        </div>
                      </div>
                      <p className="font-medium">${(item.product.price * item.quantity).toFixed(2)}</p>
                    </div>
                  ))}
                  
                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center font-bold text-lg">
                      <span>Total</span>
                      <span>${total.toFixed(2)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Payment Form */}
            <div>
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <CheckoutForm cartItems={cartItems} />
              </Elements>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default StripeCheckout;