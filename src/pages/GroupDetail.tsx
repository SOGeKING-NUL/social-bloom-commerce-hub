
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Users, Lock, ArrowLeft, ShoppingBag, Plus } from "lucide-react";
import Layout from "@/components/Layout";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const GroupDetail = () => {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch group details
  const { data: group, isLoading } = useQuery({
    queryKey: ['group', groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('groups')
        .select(`
          *,
          creator_profile:profiles!creator_id (
            full_name,
            email
          ),
          product:products!product_id (
            *,
            vendor_profile:profiles!vendor_id (
              full_name,
              email
            )
          ),
          group_members (
            user_id,
            joined_at,
            user_profile:profiles!user_id (
              full_name,
              email,
              avatar_url
            )
          )
        `)
        .eq('id', groupId)
        .single();
      
      if (error) throw error;
      
      return {
        ...data,
        isJoined: data.group_members?.some(member => member.user_id === user?.id) || false,
        members: data.group_members || []
      };
    },
    enabled: !!user && !!groupId
  });

  // Add to cart mutation
  const addToCartMutation = useMutation({
    mutationFn: async (productId: string) => {
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('cart_items')
        .upsert({
          user_id: user.id,
          product_id: productId,
          quantity: 1
        }, {
          onConflict: 'user_id,product_id'
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Added to Cart!",
        description: "Product has been added to your cart.",
      });
    },
    onError: (error) => {
      console.error('Error adding to cart:', error);
      toast({
        title: "Error",
        description: "Failed to add product to cart.",
        variant: "destructive"
      });
    }
  });

  // Join/Leave group mutation
  const toggleGroupMembershipMutation = useMutation({
    mutationFn: async (isJoined: boolean) => {
      if (!user || !groupId) throw new Error('Missing required data');
      
      if (isJoined) {
        const { error } = await supabase
          .from('group_members')
          .delete()
          .eq('group_id', groupId)
          .eq('user_id', user.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('group_members')
          .insert({
            group_id: groupId,
            user_id: user.id
          });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
    },
    onError: (error) => {
      console.error('Error toggling group membership:', error);
      toast({
        title: "Error",
        description: "Failed to update group membership.",
        variant: "destructive"
      });
    }
  });

  const handleJoinGroup = () => {
    if (group) {
      toggleGroupMembershipMutation.mutate(group.isJoined);
      toast({
        title: group.isJoined ? "Left Group" : "Joined Group!",
        description: group.isJoined 
          ? `You left ${group.name}` 
          : `Welcome to ${group.name}!`,
      });
    }
  };

  const handleAddToCart = () => {
    if (group?.product) {
      addToCartMutation.mutate(group.product.id);
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-b from-white to-pink-50">
          <div className="container mx-auto px-4 py-8">
            <div className="max-w-4xl mx-auto">
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-1/2 mb-6"></div>
                <div className="h-64 bg-gray-200 rounded mb-6"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!group) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-b from-white to-pink-50">
          <div className="container mx-auto px-4 py-8">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-2xl font-bold mb-4">Group not found</h1>
              <Button onClick={() => navigate('/groups')}>
                Back to Groups
              </Button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-white to-pink-50">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            {/* Back Button */}
            <Button
              variant="ghost"
              onClick={() => navigate('/groups')}
              className="mb-6 text-pink-600 hover:bg-pink-50"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Groups
            </Button>

            {/* Group Header */}
            <div className="smooth-card p-6 mb-8">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="md:w-1/2">
                  <img 
                    src={group.product?.image_url || "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=500&h=300&fit=crop"} 
                    alt={group.name}
                    className="w-full h-64 object-cover rounded-lg"
                  />
                </div>
                <div className="md:w-1/2">
                  <div className="flex items-center gap-2 mb-2">
                    <Lock className="w-5 h-5 text-pink-500" />
                    <span className="text-sm text-gray-500">Private Group</span>
                    {group.isJoined && (
                      <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                        Joined
                      </span>
                    )}
                  </div>
                  <h1 className="text-3xl font-bold mb-4">{group.name}</h1>
                  <p className="text-gray-600 mb-4">{group.description || "A shopping group for exclusive products"}</p>
                  
                  <div className="flex items-center gap-4 mb-6">
                    <div className="flex items-center text-gray-500">
                      <Users className="w-5 h-5 mr-2" />
                      <span>{group.members.length} members</span>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <Button 
                      onClick={handleJoinGroup}
                      disabled={toggleGroupMembershipMutation.isPending}
                      variant={group.isJoined ? "outline" : "default"}
                      className={group.isJoined 
                        ? "border-pink-200 text-pink-600 hover:bg-pink-50" 
                        : "social-button bg-gradient-to-r from-pink-500 to-rose-400 hover:from-pink-600 hover:to-rose-500"
                      }
                    >
                      {group.isJoined ? "Leave Group" : "Join Group"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Product Section */}
            {group.product && (
              <div className="smooth-card p-6 mb-8">
                <h2 className="text-2xl font-semibold mb-4">Featured Product</h2>
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="md:w-1/3">
                    <img 
                      src={group.product.image_url || "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=300&h=300&fit=crop"} 
                      alt={group.product.name}
                      className="w-full h-48 object-cover rounded-lg"
                    />
                  </div>
                  <div className="md:w-2/3">
                    <h3 className="text-xl font-semibold mb-2">{group.product.name}</h3>
                    <p className="text-gray-600 mb-4">{group.product.description}</p>
                    <p className="text-2xl font-bold text-pink-600 mb-4">${group.product.price}</p>
                    <p className="text-sm text-gray-500 mb-4">
                      By {group.product.vendor_profile?.full_name || group.product.vendor_profile?.email}
                    </p>
                    
                    {group.isJoined && (
                      <Button 
                        onClick={handleAddToCart}
                        disabled={addToCartMutation.isPending}
                        className="social-button bg-gradient-to-r from-pink-500 to-rose-400 hover:from-pink-600 hover:to-rose-500"
                      >
                        <ShoppingBag className="w-4 h-4 mr-2" />
                        {addToCartMutation.isPending ? 'Adding...' : 'Add to Cart'}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Members Section */}
            <div className="smooth-card p-6">
              <h2 className="text-2xl font-semibold mb-4">Members ({group.members.length})</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {group.members.map((member) => (
                  <div key={member.user_id} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={member.user_profile?.avatar_url} />
                      <AvatarFallback>
                        {member.user_profile?.full_name?.charAt(0) || member.user_profile?.email?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">
                        {member.user_profile?.full_name || member.user_profile?.email?.split('@')[0] || 'User'}
                      </p>
                      <p className="text-sm text-gray-500">
                        Joined {new Date(member.joined_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              
              {group.members.length === 0 && (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No members yet. Be the first to join!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default GroupDetail;
