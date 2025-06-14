
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Users, Lock, ArrowLeft, ShoppingBag, UserPlus, Settings } from "lucide-react";
import Layout from "@/components/Layout";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import JoinRequestsDialog from "@/components/JoinRequestsDialog";
import InviteMembersDialog from "@/components/InviteMembersDialog";

const GroupDetail = () => {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showJoinRequests, setShowJoinRequests] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);

  console.log('GroupDetail: Component loading with groupId:', groupId, 'user:', user?.id);

  // Fetch group details with error handling
  const { data: group, isLoading, error } = useQuery({
    queryKey: ['group', groupId],
    queryFn: async () => {
      console.log('GroupDetail: Fetching group details for:', groupId);
      
      if (!groupId) {
        throw new Error('Group ID is required');
      }
      
      try {
        // Get basic group data
        const { data: groupData, error: groupError } = await supabase
          .from('groups')
          .select('*')
          .eq('id', groupId)
          .single();
        
        console.log('GroupDetail: Basic group query result:', { groupData, groupError });
        
        if (groupError) {
          console.error('GroupDetail: Group query error:', groupError);
          throw groupError;
        }
        
        if (!groupData) {
          throw new Error('Group not found');
        }
        
        // Get creator, product, vendor, and members data in parallel
        const promises = [];
        
        // Creator profile
        if (groupData.creator_id) {
          promises.push(
            supabase
              .from('profiles')
              .select('full_name, email')
              .eq('id', groupData.creator_id)
              .single()
              .then(result => ({ type: 'creator', ...result }))
          );
        }
        
        // Product details
        if (groupData.product_id) {
          promises.push(
            supabase
              .from('products')
              .select('*')
              .eq('id', groupData.product_id)
              .single()
              .then(result => ({ type: 'product', ...result }))
          );
        }
        
        // Group members
        promises.push(
          supabase
            .from('group_members')
            .select('user_id, joined_at')
            .eq('group_id', groupId)
            .then(result => ({ type: 'members', ...result }))
        );
        
        // CRITICAL: Check for pending join requests for current user
        if (user?.id) {
          promises.push(
            supabase
              .from('group_join_requests')
              .select('id, status, requested_at')
              .eq('group_id', groupId)
              .eq('user_id', user.id)
              .eq('status', 'pending')
              .then(result => ({ type: 'join_requests', ...result }))
          );
        }
        
        const results = await Promise.allSettled(promises);
        console.log('GroupDetail: Parallel queries results:', results);
        
        let creatorProfile = null;
        let product = null;
        let members = [];
        let hasPendingRequest = false;
        
        results.forEach((result) => {
          if (result.status === 'fulfilled' && result.value.data) {
            switch (result.value.type) {
              case 'creator':
                creatorProfile = result.value.data;
                break;
              case 'product':
                product = result.value.data;
                break;
              case 'members':
                members = result.value.data || [];
                break;
              case 'join_requests':
                const pendingRequests = result.value.data || [];
                hasPendingRequest = pendingRequests.length > 0;
                console.log('GroupDetail: Pending request check:', { pendingRequests, hasPendingRequest });
                break;
            }
          }
        });
        
        // Get vendor profile if product exists
        let vendorProfile = null;
        if (product && product.vendor_id) {
          const { data: vendor } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', product.vendor_id)
            .single();
          vendorProfile = vendor;
        }
        
        // Get member profiles
        let memberProfiles = [];
        if (members.length > 0) {
          const memberIds = members.map(m => m.user_id);
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, email, avatar_url')
            .in('id', memberIds);
          
          // Combine member data with profiles
          memberProfiles = members.map(member => {
            const profile = profiles?.find(p => p.id === member.user_id);
            return {
              user_id: member.user_id,
              joined_at: member.joined_at,
              user_profile: profile
            };
          });
        }
        
        const isJoined = members.some(member => member.user_id === user?.id);
        
        const result = {
          ...groupData,
          creator_profile: creatorProfile,
          product: product ? {
            ...product,
            vendor_profile: vendorProfile
          } : null,
          group_members: memberProfiles,
          isJoined,
          hasPendingRequest,
          members: memberProfiles
        };
        
        console.log('GroupDetail: Final result:', result);
        return result;
        
      } catch (error) {
        console.error('GroupDetail: Error in query function:', error);
        throw error;
      }
    },
    enabled: !!user && !!groupId,
    staleTime: 0, // Always fetch fresh data
    refetchOnWindowFocus: true
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

  // Join/Leave group mutation with proper cleanup and immediate UI update
  const toggleGroupMembershipMutation = useMutation({
    mutationFn: async (isJoined: boolean) => {
      if (!user || !groupId) throw new Error('Missing required data');
      
      console.log('GroupDetail toggleMembershipMutation: Starting with:', { groupId, isJoined, userId: user.id });
      
      if (isJoined) {
        console.log('Leaving group:', groupId);
        
        // First, clean up any pending join requests for this user and group
        const { error: requestCleanupError } = await supabase
          .from('group_join_requests')
          .delete()
          .eq('group_id', groupId)
          .eq('user_id', user.id);
        
        console.log('Join request cleanup result:', requestCleanupError);
        
        // Then remove the membership
        const { error: memberError } = await supabase
          .from('group_members')
          .delete()
          .eq('group_id', groupId)
          .eq('user_id', user.id);
        
        if (memberError) {
          console.error('Error removing membership:', memberError);
          throw memberError;
        }
        
        console.log('Successfully left group');
        
      } else {
        console.log('Attempting to join group:', groupId);
        
        // Check if group requires invites only
        if (group?.invite_only) {
          throw new Error('This group is invite-only. Please ask for an invitation.');
        }
        
        // Check if there's already a pending request
        if (group?.hasPendingRequest) {
          throw new Error('You already have a pending request to join this group.');
        }
        
        // CRITICAL: Always clean up any existing requests first to prevent duplicates
        console.log('CLEANUP STEP 1: Removing any existing join requests');
        const { error: cleanupError } = await supabase
          .from('group_join_requests')
          .delete()
          .eq('group_id', groupId)
          .eq('user_id', user.id);
        
        console.log('Cleanup result:', cleanupError);
        
        if (cleanupError) {
          console.error('Cleanup failed:', cleanupError);
          throw new Error('Failed to cleanup existing requests: ' + cleanupError.message);
        }
        
        // ADDITIONAL CLEANUP: Remove any existing memberships too
        console.log('CLEANUP STEP 2: Removing any existing memberships');
        const { error: memberCleanupError } = await supabase
          .from('group_members')
          .delete()
          .eq('group_id', groupId)
          .eq('user_id', user.id);
        
        console.log('Member cleanup result:', memberCleanupError);
        
        // Small delay to ensure cleanup is complete
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Check if group is private and requires approval
        if (group?.is_private && !group?.auto_approve_requests) {
          console.log('Creating join request for private group');
          
          // Create join request with explicit error handling
          const { error: insertError, data: insertData } = await supabase
            .from('group_join_requests')
            .insert({
              group_id: groupId,
              user_id: user.id,
              status: 'pending',
              requested_at: new Date().toISOString()
            })
            .select();
          
          console.log('Insert join request result:', { insertError, insertData });
          
          if (insertError) {
            console.error('Error creating join request:', insertError);
            // Check if it's a duplicate key error and provide specific feedback
            if (insertError.code === '23505') {
              throw new Error('A join request already exists for this group. Please refresh the page and try again.');
            }
            throw insertError;
          }
          
          return { isRequest: true };
        } else {
          console.log('Direct join for public group with auto-approval');
          
          // Direct join
          const { error: joinError, data: joinData } = await supabase
            .from('group_members')
            .insert({
              group_id: groupId,
              user_id: user.id,
              joined_at: new Date().toISOString()
            })
            .select();
          
          console.log('Direct join result:', { joinError, joinData });
          
          if (joinError) {
            console.error('Error joining group:', joinError);
            throw joinError;
          }
          
          return { isRequest: false };
        }
      }
    },
    onSuccess: (result) => {
      console.log('GroupDetail toggleMembershipMutation: Success with result:', result);
      
      // CRITICAL: Invalidate queries to refresh the UI immediately
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['join-requests', groupId] });
      
      // Force refetch the current group data
      queryClient.refetchQueries({ queryKey: ['group', groupId] });
      
      if (result?.isRequest) {
        toast({
          title: "Request Sent",
          description: `Your request to join ${group?.name} has been sent.`,
        });
      }
    },
    onError: (error) => {
      console.error('GroupDetail toggleMembershipMutation: Error:', error);
      toast({
        title: "Error",
        description: error.message || "An error occurred. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleJoinGroup = () => {
    if (group) {
      toggleGroupMembershipMutation.mutate(group.isJoined);
      if (group.isJoined) {
        toast({
          title: "Left Group",
          description: `You left ${group.name}`,
        });
      }
    }
  };

  const handleAddToCart = () => {
    if (group?.product) {
      addToCartMutation.mutate(group.product.id);
    }
  };

  const isCreator = group?.creator_id === user?.id;
  const canViewMembers = !group?.is_private || group?.isJoined || isCreator;
  const canViewProduct = !group?.is_private || group?.isJoined || isCreator;

  // Debug logging for button state
  console.log('GroupDetail: Button state debug:', {
    isJoined: group?.isJoined,
    hasPendingRequest: group?.hasPendingRequest,
    inviteOnly: group?.invite_only,
    isCreator,
    userId: user?.id
  });

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

  if (error) {
    console.error('GroupDetail: Error state:', error);
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-b from-white to-pink-50">
          <div className="container mx-auto px-4 py-8">
            <div className="max-w-4xl mx-auto text-center">
              <Button
                variant="ghost"
                onClick={() => navigate('/groups')}
                className="mb-6 text-pink-600 hover:bg-pink-50"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Groups
              </Button>
              
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
                <h1 className="text-2xl font-bold mb-2 text-red-800">Error Loading Group</h1>
                <p className="text-red-600 mb-4">{error.message}</p>
                <p className="text-sm text-gray-600">Group ID: {groupId}</p>
              </div>
              
              <Button onClick={() => navigate('/groups')}>
                Back to Groups
              </Button>
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
              <Button
                variant="ghost"
                onClick={() => navigate('/groups')}
                className="mb-6 text-pink-600 hover:bg-pink-50"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Groups
              </Button>
              
              <h1 className="text-2xl font-bold mb-4">Group not found</h1>
              <p className="text-gray-600 mb-4">The group you're looking for doesn't exist or has been removed.</p>
              <p className="text-sm text-gray-500 mb-6">Group ID: {groupId}</p>
              
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
                    {group.is_private && (
                      <>
                        <Lock className="w-5 h-5 text-pink-500" />
                        <span className="text-sm text-gray-500">Private Group</span>
                      </>
                    )}
                    {group.invite_only && (
                      <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">
                        Invite Only
                      </span>
                    )}
                    {group.isJoined && (
                      <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                        Joined
                      </span>
                    )}
                    {group.hasPendingRequest && (
                      <span className="bg-yellow-500 text-white text-xs px-2 py-1 rounded-full">
                        Requested
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
                    {isCreator && (
                      <p className="text-sm text-pink-600 font-medium">You created this group</p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {!group.isJoined && !group.invite_only && !group.hasPendingRequest && (
                      <Button 
                        onClick={handleJoinGroup}
                        disabled={toggleGroupMembershipMutation.isPending}
                        className="social-button bg-gradient-to-r from-pink-500 to-rose-400 hover:from-pink-600 hover:to-rose-500"
                      >
                        {toggleGroupMembershipMutation.isPending ? "Processing..." : (group.is_private && !group.auto_approve_requests ? "Request to Join" : "Join Group")}
                      </Button>
                    )}
                    
                    {group.hasPendingRequest && (
                      <Button 
                        disabled
                        className="bg-yellow-500 text-white cursor-not-allowed"
                      >
                        Requested
                      </Button>
                    )}
                    
                    {group.isJoined && !isCreator && (
                      <Button 
                        onClick={handleJoinGroup}
                        disabled={toggleGroupMembershipMutation.isPending}
                        variant="outline"
                        className="border-pink-200 text-pink-600 hover:bg-pink-50"
                      >
                        Leave Group
                      </Button>
                    )}

                    {group.invite_only && !group.isJoined && !isCreator && !group.hasPendingRequest && (
                      <div className="text-center">
                        <p className="text-gray-600 mb-2">This is an invite-only group</p>
                        <p className="text-sm text-gray-500">Contact the group creator for an invitation</p>
                      </div>
                    )}

                    {isCreator && (
                      <>
                        <Button 
                          onClick={() => setShowInviteDialog(true)}
                          variant="outline"
                          className="border-pink-200 text-pink-600 hover:bg-pink-50"
                        >
                          <UserPlus className="w-4 h-4 mr-2" />
                          Invite Members
                        </Button>
                        <Button 
                          onClick={() => setShowJoinRequests(true)}
                          variant="outline"
                          className="border-pink-200 text-pink-600 hover:bg-pink-50"
                        >
                          <Settings className="w-4 h-4 mr-2" />
                          Manage Requests
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Product Section */}
            {canViewProduct && group.product && (
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
                      By {group.product.vendor_profile?.full_name || group.product.vendor_profile?.email || 'Unknown Vendor'}
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

            {!canViewProduct && (
              <div className="smooth-card p-6 mb-8 text-center">
                <Lock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">Private Group Content</h3>
                <p className="text-gray-500">Join the group to see the featured product and other exclusive content.</p>
              </div>
            )}

            {/* Members Section */}
            <div className="smooth-card p-6">
              <h2 className="text-2xl font-semibold mb-4">
                Members ({canViewMembers ? group.members.length : '?'})
              </h2>
              
              {canViewMembers ? (
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
                          {member.user_id === group.creator_id && (
                            <span className="ml-2 text-xs bg-pink-100 text-pink-800 px-2 py-1 rounded-full">
                              Creator
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-gray-500">
                          Joined {new Date(member.joined_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Lock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Member list is private. Join the group to see who's in it!</p>
                </div>
              )}
              
              {canViewMembers && group.members.length === 0 && (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No members yet. Be the first to join!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      {isCreator && (
        <>
          <JoinRequestsDialog
            groupId={groupId!}
            groupName={group.name}
            open={showJoinRequests}
            onOpenChange={setShowJoinRequests}
          />
          <InviteMembersDialog
            groupId={groupId!}
            groupName={group.name}
            open={showInviteDialog}
            onOpenChange={setShowInviteDialog}
          />
        </>
      )}
    </Layout>
  );
};

export default GroupDetail;
