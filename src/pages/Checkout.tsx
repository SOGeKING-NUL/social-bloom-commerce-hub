import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MapPin, Plus, Edit, Trash2, CreditCard, Truck, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

type CheckoutStep = "address" | "review" | "payment";

const Checkout = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState<CheckoutStep>("address");
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [addressForm, setAddressForm] = useState({
    address_type: "home" as "home" | "office" | "other",
    full_name: "",
    phone_number: "",
    address_line1: "",
    address_line2: "",
    city: "",
    state: "",
    postal_code: "",
    country: "India",
    is_default: false,
  });

  // Fetch cart items
  const { data: cartItems = [] } = useQuery({
    queryKey: ["cart-items", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("cart_items")
        .select(`
          id,
          quantity,
          products!inner (
            id,
            name,
            price,
            image_url
          )
        `)
        .eq("user_id", user.id);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch user addresses
  const { data: addresses = [], refetch: refetchAddresses } = useQuery({
    queryKey: ["user-addresses", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("user_addresses")
        .select("*")
        .eq("user_id", user.id)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Add address mutation
  const addAddressMutation = useMutation({
    mutationFn: async (addressData: typeof addressForm) => {
      if (!user?.id) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("user_addresses")
        .insert({
          ...addressData,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      refetchAddresses();
      setShowAddAddress(false);
      setAddressForm({
        address_type: "home",
        full_name: "",
        phone_number: "",
        address_line1: "",
        address_line2: "",
        city: "",
        state: "",
        postal_code: "",
        country: "India",
        is_default: false,
      });
      toast({ title: "Address added successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add address",
        variant: "destructive",
      });
    },
  });

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("User not authenticated");
      if (!selectedAddressId) throw new Error("Please select a shipping address");

      const selectedAddress = addresses.find(addr => addr.id === selectedAddressId);
      if (!selectedAddress) throw new Error("Selected address not found");

      // Calculate totals
      const subtotal = cartItems.reduce((sum, item) => sum + (item.products.price * item.quantity), 0);
      const shipping = 50; // Fixed shipping cost for now
      const total = subtotal + shipping;

      // Generate order number
      const { data: orderNumber } = await supabase.rpc('generate_order_number');
      if (!orderNumber) throw new Error("Failed to generate order number");

      // Create order
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          user_id: user.id,
          order_number: orderNumber,
          total_amount: total,
          shipping_amount: shipping,
          shipping_address_id: selectedAddressId,
          shipping_address_text: `${selectedAddress.full_name}, ${selectedAddress.address_line1}, ${selectedAddress.city}, ${selectedAddress.state} ${selectedAddress.postal_code}`,
          payment_method: "razorpay",
          payment_status: "paid", // For testing purposes
          status: "paid", // For testing purposes
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = cartItems.map(item => ({
        order_id: order.id,
        product_id: item.products.id,
        product_name: item.products.name,
        product_image_url: item.products.image_url,
        quantity: item.quantity,
        unit_price: item.products.price,
        total_price: item.products.price * item.quantity,
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Clear cart
      const { error: clearCartError } = await supabase
        .from("cart_items")
        .delete()
        .eq("user_id", user.id);

      if (clearCartError) throw clearCartError;

      return order;
    },
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: ["cart-items"] });
      queryClient.invalidateQueries({ queryKey: ["cart-count"] });
      toast({ title: "Order placed successfully!" });
      navigate(`/orders/${order.id}`);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to place order",
        variant: "destructive",
      });
    },
  });

  const calculateSubtotal = () => {
    return cartItems.reduce((sum, item) => sum + (item.products.price * item.quantity), 0);
  };

  const calculateShipping = () => 50; // Fixed shipping cost
  const calculateTotal = () => calculateSubtotal() + calculateShipping();

  const handleAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addAddressMutation.mutate(addressForm);
  };

  const handleProceedToReview = () => {
    if (!selectedAddressId) {
      toast({
        title: "Address Required",
        description: "Please select a shipping address",
        variant: "destructive",
      });
      return;
    }
    setCurrentStep("review");
  };

  const handleProceedToPayment = () => {
    setCurrentStep("payment");
  };

  const handlePlaceOrder = () => {
    createOrderMutation.mutate();
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="container mx-auto px-4 py-8 mt-20">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Please log in to checkout</h2>
            <Button onClick={() => navigate("/auth")}>Login</Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="container mx-auto px-4 py-8 mt-20">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Your cart is empty</h2>
            <Button onClick={() => navigate("/products")}>Continue Shopping</Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="container mx-auto px-4 py-8 mt-20">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center mb-8">
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
              className="mr-4 hover:bg-gray-100"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <h1 className="text-3xl font-bold text-gray-800">Checkout</h1>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center space-x-4">
              <div className={`flex items-center ${currentStep === "address" ? "text-pink-600" : "text-gray-400"}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                  currentStep === "address" ? "border-pink-600 bg-pink-600 text-white" : "border-gray-300"
                }`}>
                  1
                </div>
                <span className="ml-2 font-medium">Address</span>
              </div>
              <div className={`w-16 h-0.5 ${currentStep === "review" || currentStep === "payment" ? "bg-pink-600" : "bg-gray-300"}`} />
              <div className={`flex items-center ${currentStep === "review" ? "text-pink-600" : currentStep === "payment" ? "text-green-600" : "text-gray-400"}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                  currentStep === "review" ? "border-pink-600 bg-pink-600 text-white" : 
                  currentStep === "payment" ? "border-green-600 bg-green-600 text-white" :
                  "border-gray-300"
                }`}>
                  2
                </div>
                <span className="ml-2 font-medium">Review</span>
              </div>
              <div className={`w-16 h-0.5 ${currentStep === "payment" ? "bg-green-600" : "bg-gray-300"}`} />
              <div className={`flex items-center ${currentStep === "payment" ? "text-green-600" : "text-gray-400"}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                  currentStep === "payment" ? "border-green-600 bg-green-600 text-white" : "border-gray-300"
                }`}>
                  3
                </div>
                <span className="ml-2 font-medium">Payment</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2">
              {currentStep === "address" && (
                <AddressStep
                  addresses={addresses}
                  selectedAddressId={selectedAddressId}
                  onAddressSelect={setSelectedAddressId}
                  showAddAddress={showAddAddress}
                  setShowAddAddress={setShowAddAddress}
                  addressForm={addressForm}
                  setAddressForm={setAddressForm}
                  onSubmit={handleAddressSubmit}
                  addAddressMutation={addAddressMutation}
                  onProceed={handleProceedToReview}
                />
              )}

              {currentStep === "review" && (
                <ReviewStep
                  cartItems={cartItems}
                  selectedAddress={addresses.find(addr => addr.id === selectedAddressId)}
                  onBack={() => setCurrentStep("address")}
                  onProceed={handleProceedToPayment}
                />
              )}

              {currentStep === "payment" && (
                <PaymentStep
                  cartItems={cartItems}
                  selectedAddress={addresses.find(addr => addr.id === selectedAddressId)}
                  subtotal={calculateSubtotal()}
                  shipping={calculateShipping()}
                  total={calculateTotal()}
                  onBack={() => setCurrentStep("review")}
                  onPlaceOrder={handlePlaceOrder}
                  createOrderMutation={createOrderMutation}
                />
              )}
            </div>

            {/* Order Summary Sidebar */}
            <div className="lg:col-span-1">
              <OrderSummary
                cartItems={cartItems}
                subtotal={calculateSubtotal()}
                shipping={calculateShipping()}
                total={calculateTotal()}
              />
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

// Address Step Component
const AddressStep = ({
  addresses,
  selectedAddressId,
  onAddressSelect,
  showAddAddress,
  setShowAddAddress,
  addressForm,
  setAddressForm,
  onSubmit,
  addAddressMutation,
  onProceed,
}: {
  addresses: any[];
  selectedAddressId: string | null;
  onAddressSelect: (id: string) => void;
  showAddAddress: boolean;
  setShowAddAddress: (show: boolean) => void;
  addressForm: any;
  setAddressForm: (form: any) => void;
  onSubmit: (e: React.FormEvent) => void;
  addAddressMutation: any;
  onProceed: () => void;
}) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center">
        <MapPin className="w-5 h-5 mr-2" />
        Shipping Address
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-6">
      {/* Saved Addresses */}
      {addresses.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-800">Saved Addresses</h3>
          <RadioGroup value={selectedAddressId || ""} onValueChange={onAddressSelect}>
            {addresses.map((address) => (
              <div key={address.id} className="flex items-start space-x-3 p-4 border rounded-lg hover:border-pink-300 transition-colors">
                <RadioGroupItem value={address.id} id={address.id} className="mt-1" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-800">{address.full_name}</p>
                      <p className="text-sm text-gray-600">{address.phone_number}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {address.address_type}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {address.address_line1}
                    {address.address_line2 && `, ${address.address_line2}`}
                  </p>
                  <p className="text-sm text-gray-600">
                    {address.city}, {address.state} {address.postal_code}
                  </p>
                  {address.is_default && (
                    <Badge className="mt-2 text-xs">Default</Badge>
                  )}
                </div>
              </div>
            ))}
          </RadioGroup>
        </div>
      )}

      {/* Add New Address */}
      <div className="border-t pt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800">Add New Address</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddAddress(!showAddAddress)}
          >
            <Plus className="w-4 h-4 mr-2" />
            {showAddAddress ? "Cancel" : "Add Address"}
          </Button>
        </div>

        {showAddAddress && (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="address_type">Address Type</Label>
                <Select
                  value={addressForm.address_type}
                  onValueChange={(value: "home" | "office" | "other") =>
                    setAddressForm({ ...addressForm, address_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="home">Home</SelectItem>
                    <SelectItem value="office">Office</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  value={addressForm.full_name}
                  onChange={(e) => setAddressForm({ ...addressForm, full_name: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="phone_number">Phone Number</Label>
              <Input
                id="phone_number"
                value={addressForm.phone_number}
                onChange={(e) => setAddressForm({ ...addressForm, phone_number: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="address_line1">Address Line 1</Label>
              <Input
                id="address_line1"
                value={addressForm.address_line1}
                onChange={(e) => setAddressForm({ ...addressForm, address_line1: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="address_line2">Address Line 2 (Optional)</Label>
              <Input
                id="address_line2"
                value={addressForm.address_line2}
                onChange={(e) => setAddressForm({ ...addressForm, address_line2: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={addressForm.city}
                  onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={addressForm.state}
                  onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="postal_code">Postal Code</Label>
                <Input
                  id="postal_code"
                  value={addressForm.postal_code}
                  onChange={(e) => setAddressForm({ ...addressForm, postal_code: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_default"
                checked={addressForm.is_default}
                onCheckedChange={(checked) =>
                  setAddressForm({ ...addressForm, is_default: checked as boolean })
                }
              />
              <Label htmlFor="is_default">Set as default address</Label>
            </div>

            <Button
              type="submit"
              disabled={addAddressMutation.isPending}
              className="w-full"
            >
              {addAddressMutation.isPending ? "Adding..." : "Add Address"}
            </Button>
          </form>
        )}
      </div>

      {/* Proceed Button */}
      <div className="flex justify-end pt-6">
        <Button
          onClick={onProceed}
          disabled={!selectedAddressId}
          className="bg-pink-600 hover:bg-pink-700"
        >
          Continue to Review
        </Button>
      </div>
    </CardContent>
  </Card>
);

// Review Step Component
const ReviewStep = ({
  cartItems,
  selectedAddress,
  onBack,
  onProceed,
}: {
  cartItems: any[];
  selectedAddress: any;
  onBack: () => void;
  onProceed: () => void;
}) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center">
        <CheckCircle className="w-5 h-5 mr-2" />
        Review Order
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-6">
      {/* Shipping Address */}
      <div>
        <h3 className="font-semibold text-gray-800 mb-3">Shipping Address</h3>
        <div className="p-4 border rounded-lg bg-gray-50">
          <p className="font-medium text-gray-800">{selectedAddress?.full_name}</p>
          <p className="text-sm text-gray-600">{selectedAddress?.phone_number}</p>
          <p className="text-sm text-gray-600">
            {selectedAddress?.address_line1}
            {selectedAddress?.address_line2 && `, ${selectedAddress.address_line2}`}
          </p>
          <p className="text-sm text-gray-600">
            {selectedAddress?.city}, {selectedAddress?.state} {selectedAddress?.postal_code}
          </p>
        </div>
      </div>

      {/* Order Items */}
      <div>
        <h3 className="font-semibold text-gray-800 mb-3">Order Items</h3>
        <div className="space-y-3">
          {cartItems.map((item) => (
            <div key={item.id} className="flex items-center space-x-4 p-3 border rounded-lg">
              <img
                src={item.products.image_url || "/placeholder.svg"}
                alt={item.products.name}
                className="w-16 h-16 object-cover rounded-md"
              />
              <div className="flex-1">
                <h4 className="font-medium text-gray-800">{item.products.name}</h4>
                <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
              </div>
              <div className="text-right">
                <p className="font-medium text-gray-800">₹{(item.products.price * item.quantity).toFixed(2)}</p>
                <p className="text-sm text-gray-600">₹{item.products.price.toFixed(2)} each</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between pt-6">
        <Button variant="outline" onClick={onBack}>
          Back to Address
        </Button>
        <Button onClick={onProceed} className="bg-pink-600 hover:bg-pink-700">
          Continue to Payment
        </Button>
      </div>
    </CardContent>
  </Card>
);

// Payment Step Component
const PaymentStep = ({
  cartItems,
  selectedAddress,
  subtotal,
  shipping,
  total,
  onBack,
  onPlaceOrder,
  createOrderMutation,
}: {
  cartItems: any[];
  selectedAddress: any;
  subtotal: number;
  shipping: number;
  total: number;
  onBack: () => void;
  onPlaceOrder: () => void;
  createOrderMutation: any;
}) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center">
        <CreditCard className="w-5 h-5 mr-2" />
        Payment
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-6">
      {/* Payment Method */}
      <div>
        <h3 className="font-semibold text-gray-800 mb-3">Payment Method</h3>
        <div className="p-4 border rounded-lg bg-gray-50">
          <div className="flex items-center space-x-3">
            <CreditCard className="w-6 h-6 text-pink-600" />
            <div>
              <p className="font-medium text-gray-800">Razorpay</p>
              <p className="text-sm text-gray-600">Secure payment gateway</p>
            </div>
          </div>
        </div>
      </div>

      {/* Order Summary */}
      <div>
        <h3 className="font-semibold text-gray-800 mb-3">Order Summary</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Subtotal ({cartItems.length} items)</span>
            <span>₹{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Shipping</span>
            <span>₹{shipping.toFixed(2)}</span>
          </div>
          <div className="border-t pt-2">
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span>₹{total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between pt-6">
        <Button variant="outline" onClick={onBack}>
          Back to Review
        </Button>
        <Button
          onClick={onPlaceOrder}
          disabled={createOrderMutation.isPending}
          className="bg-green-600 hover:bg-green-700"
        >
          {createOrderMutation.isPending ? "Processing..." : "Pay Now"}
        </Button>
      </div>
    </CardContent>
  </Card>
);

// Order Summary Component
const OrderSummary = ({
  cartItems,
  subtotal,
  shipping,
  total,
}: {
  cartItems: any[];
  subtotal: number;
  shipping: number;
  total: number;
}) => (
  <Card className="sticky top-24">
    <CardHeader>
      <CardTitle>Order Summary</CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      {/* Items */}
      <div className="space-y-3">
        {cartItems.map((item) => (
          <div key={item.id} className="flex items-center space-x-3">
            <img
              src={item.products.image_url || "/placeholder.svg"}
              alt={item.products.name}
              className="w-12 h-12 object-cover rounded-md"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{item.products.name}</p>
              <p className="text-xs text-gray-600">Qty: {item.quantity}</p>
            </div>
            <p className="text-sm font-medium text-gray-800">₹{(item.products.price * item.quantity).toFixed(2)}</p>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="border-t pt-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span>Subtotal ({cartItems.length} items)</span>
          <span>₹{subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Shipping</span>
          <span>₹{shipping.toFixed(2)}</span>
        </div>
        <div className="border-t pt-2">
          <div className="flex justify-between font-semibold text-lg">
            <span>Total</span>
            <span>₹{total.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
);

export default Checkout; 