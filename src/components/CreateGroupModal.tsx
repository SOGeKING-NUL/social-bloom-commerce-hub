import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Lock, Globe, Users, Package } from "lucide-react";
import { useEffect } from "react";

interface CreateGroupModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  preSelectedProductId?: string; // Optional: pre-select a specific product
}

const CreateGroupModal = ({ isOpen, onOpenChange, onSuccess, preSelectedProductId }: CreateGroupModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    product_id: preSelectedProductId || "", // Pre-select product if provided
    is_private: true, // Default to private
    member_limit: 50,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update form data when preSelectedProductId changes
  useEffect(() => {
    if (preSelectedProductId) {
      setFormData(prev => ({
        ...prev,
        product_id: preSelectedProductId
      }));
    }
  }, [preSelectedProductId]);

  // Fetch available products for group creation
  const { data: products = [] } = useQuery({
    queryKey: ["available-products"],
    queryFn: async () => {
      // First get all active products - removed the group_order_enabled filter for now
      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select("id, name, price, group_order_enabled")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (productsError) throw productsError;

      console.log("Fetched products:", productsData);

      // Then get the first image for each product
      const productsWithImages = await Promise.all(
        (productsData || []).map(async (product) => {
          try {
            const { data: images, error: imageError } = await supabase
              .from("product_images")
              .select("image_url")
              .eq("product_id", product.id)
              .order("display_order", { ascending: true })
              .limit(1);

            if (imageError) {
              console.error("Error fetching images for product:", product.id, imageError);
            }

            const imageUrl = images?.[0]?.image_url || null;
            console.log(`Product ${product.name} (${product.id}): image_url = ${imageUrl}`);

            return {
              ...product,
              image_url: imageUrl,
            };
          } catch (error) {
            console.error("Error processing product:", product.id, error);
            return {
              ...product,
              image_url: null,
            };
          }
        })
      );

      return productsWithImages;
    },
    enabled: isOpen,
  });

  // Fetch discount tiers for the selected product
  const { data: productTiers = [], isLoading: tiersLoading } = useQuery({
    queryKey: ["product-tiers", formData.product_id],
    queryFn: async () => {
      if (!formData.product_id) return [];

      console.log("Fetching tiers for product:", formData.product_id);

      const { data, error } = await supabase
        .from("product_discount_tiers")
        .select("*")
        .eq("product_id", formData.product_id)
        .order("tier_number");

      if (error) {
        console.error("Error fetching tiers:", error);
        throw error;
      }

      console.log("Fetched tiers:", data);
      return data || [];
    },
    enabled: !!formData.product_id && isOpen,
  });

  const selectedProduct = products.find(p => p.id === formData.product_id);

  const createGroupMutation = useMutation({
    mutationFn: async (groupData: typeof formData) => {
      if (!user) throw new Error("Please log in to create a group");

      console.log("Creating group with data:", groupData);

      // Create the group
      const { data: group, error: groupError } = await supabase
        .from("groups")
        .insert({
          name: groupData.name,
          description: groupData.description,
          creator_id: user.id,
          product_id: groupData.product_id,
          is_private: groupData.is_private,
          member_limit: groupData.member_limit,
        })
        .select()
        .single();

      if (groupError) {
        console.error("Group creation error:", groupError);
        throw groupError;
      }

      console.log("Group created:", group);

      // Automatically add the creator to the group
      const { error: memberError } = await supabase
        .from("group_members")
        .insert({
          group_id: group.id,
          user_id: user.id,
        });

      if (memberError) {
        console.error("Member addition error:", memberError);
        throw memberError;
      }

      console.log("Creator added to group successfully");

      return group;
    },
    onSuccess: (data) => {
      console.log("Group creation successful:", data);
      
      toast({
        title: "Group created successfully!",
        description: data.is_private 
          ? `Private group "${data.name}" created with access code: ${data.access_code}`
          : `Public group "${data.name}" created successfully`,
      });
      
      // Reset form
      setFormData({
        name: "",
        description: "",
        product_id: "",
        is_private: true, // Reset to private default
        member_limit: 50,
      });
      
      // Close modal
      onOpenChange(false);
      
      // Invalidate queries with more specific keys
      queryClient.invalidateQueries({ queryKey: ["user-groups"] });
      queryClient.invalidateQueries({ queryKey: ["user-groups", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      queryClient.invalidateQueries({ queryKey: ["groups", user?.id] });
      
      // Call success callback
      onSuccess?.();
    },
    onError: (error: any) => {
      console.error("Group creation error:", error);
      toast({
        title: "Error creating group",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Please enter a group name",
        variant: "destructive",
      });
      return;
    }

    if (!formData.product_id) {
      toast({
        title: "Error",
        description: "Please select a product",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    createGroupMutation.mutate(formData, {
      onSettled: () => setIsSubmitting(false),
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-pink-500" />
            Create New Group
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="group-name">Group Name *</Label>
            <Input
              id="group-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter group name"
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="group-description">Description</Label>
            <Textarea
              id="group-description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe your group"
              rows={3}
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="product-select">Product *</Label>
            <Select
              value={formData.product_id}
              onValueChange={(value) => setFormData({ ...formData, product_id: value })}
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a product" />
              </SelectTrigger>
              <SelectContent>
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    <div className="flex items-center gap-2">
                      <img
                        src={product.image_url || "/placeholder.svg"}
                        alt={product.name}
                        className="w-6 h-6 rounded object-cover"
                      />
                      <span>{product.name}</span>
                      <span className="text-gray-500">₹{product.price}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedProduct && (
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center gap-3">
                <img
                  src={selectedProduct.image_url || "/placeholder.svg"}
                  alt={selectedProduct.name}
                  className="w-12 h-12 rounded object-cover"
                />
                <div>
                  <p className="font-medium">{selectedProduct.name}</p>
                  <p className="text-sm text-gray-600">₹{selectedProduct.price}</p>
                </div>
              </div>
              
              {/* Debug info - remove in production */}
              <div className="mt-2 text-xs text-gray-500">
                Product ID: {selectedProduct.id} | Tiers: {productTiers.length} | Loading: {tiersLoading ? 'Yes' : 'No'}
              </div>
            </div>
          )}

          {productTiers.length > 0 && (
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <h3 className="font-medium mb-2 text-green-800 dark:text-green-200">Discount Tiers</h3>
              <div className="space-y-2">
                {productTiers.map((tier) => (
                  <div key={tier.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-green-700 dark:text-green-300">
                        Tier {tier.tier_number}:
                      </span>
                      <span className="text-gray-600 dark:text-gray-400">
                        {tier.members_required}+ members
                      </span>
                    </div>
                    <span className="font-semibold text-green-700 dark:text-green-300">
                      {tier.discount_percentage}% off
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                * Discounts apply when group reaches the required member count
              </p>
            </div>
          )}

          {selectedProduct && productTiers.length === 0 && !tiersLoading && (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <div className="flex items-start gap-2">
                <Package className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-yellow-700 dark:text-yellow-300">
                  <p className="font-medium">No Discount Tiers Available</p>
                  <p className="text-xs mt-1">
                    This product doesn't have any discount tiers set up yet. 
                    The group will use the standard price of ₹{selectedProduct.price}.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="member-limit">Member Limit</Label>
            <Select
              value={formData.member_limit.toString()}
              onValueChange={(value) => setFormData({ ...formData, member_limit: parseInt(value) })}
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 members</SelectItem>
                <SelectItem value="25">25 members</SelectItem>
                <SelectItem value="50">50 members</SelectItem>
                <SelectItem value="100">100 members</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Groups are now exclusively private */}
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex items-start gap-2">
              <Lock className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-700 dark:text-blue-300">
                <p className="font-medium">Private Group</p>
                <p className="text-xs mt-1">
                  • Only visible to members<br/>
                  • Access code will be generated automatically<br/>
                  • Share the code to invite others
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !formData.name.trim() || !formData.product_id}
              className="flex-1 bg-pink-500 hover:bg-pink-600"
            >
              {isSubmitting ? "Creating..." : "Create Group"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateGroupModal; 