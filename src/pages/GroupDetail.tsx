import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Users, Lock, ArrowLeft, ShoppingBag, UserPlus, Settings, Key, Copy } from "lucide-react";
import Layout from "@/components/Layout";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import InviteMembersDialog from "@/components/InviteMembersDialog";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const GroupDetail = () => {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [accessCode, setAccessCode] = useState("");

  console.log('GroupDetail: Component loading with groupId:', groupId, 'user:', user?.id);

  // Fetch group details with proper error handling and separate queries
  const { data: group, isLoading, error } = useQuery({
    queryKey: ['group', groupId],
    queryFn: async () => {
      console.log('GroupDetail: Fetching group details for:', groupId);
      
      if (!groupId) {
        throw new Error('Group ID is required');
      }
      
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
      
      // Get related data in parallel
      const [creatorResult, productResult, membersResult] = await Promise.allSettled([
        // Creator profile
        supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', groupData.creator_id)
          .single(),
        
        // Product details
        groupData.product_id ? supabase
          .from('products')
          .select('*')
          .eq('id', groupData.product_id)
          .single() : Promise.resolve({ data: null }),
        
        // Group members
        supabase
          .from('group_members')
          .select('user_id, joined_at')
          .eq('group_id', groupId)
      ]);
      
      console.log('GroupDetail: Parallel queries results:', {
        creatorResult,
        productResult,
        membersResult
      });
      
      let creatorProfile = null;
      let product = null;
      let members = [];
      
      if (creatorResult.status === 'fulfilled' && creatorResult.value.data) {
        creatorProfile = creatorResult.value.data;
      }
      
      if (productResult.status === 'fulfilled' && productResult.value.data) {
        product = productResult.value.data;
      }
      
      if (membersResult.status === 'fulfilled' && membersResult.value.data) {
        members = membersResult.value.data;
      }
      
      // Check if current user is a member
      const isMember = user?.id ? members.some(member => member.user_id === user.id) : false;
      
      return {
        ...groupData,
        creator_profile: creatorProfile,
        product,
        members,
        is_member: isMember
      };
    },
    enabled: !!groupId && !!user
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

  // Join group mutation
  const joinGroupMutation = useMutation({
    mutationFn: async (accessCode: string) => {
      if (!user || !groupId) {
        throw new Error('Missing required data');
      }
      
      console.log('=== JOIN GROUP MUTATION START ===');
      console.log('Group:', groupId, 'User:', user.id, 'Access Code:', accessCode);
      
      // Verify access code
      if (group?.access_code !== accessCode) {
        throw new Error('Invalid access code. Please check and try again.');
      }
      
      // Check if already a member
      if (group?.is_member) {
        throw new Error('You are already a member of this group.');
      }
      
      // Join the group
      const { error: joinError } = await supabase
        .from('group_members')
        .insert({
          group_id: groupId,
          user_id: user.id,
          joined_at: new Date().toISOString()
        });
      
      if (joinError) {
        console.error('Join error:', joinError);
        if (joinError.code === '23505') {
          throw new Error('You are already a member of this group.');
        }
        throw joinError;
      }
      
      console.log('Successfully joined group');
      return { action: 'joined' };
    },
    onSuccess: (result) => {
      console.log('Join mutation success:', result);
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      
      // Show success message
      toast({
        title: "Joined Group!",
        description: `Welcome to ${group?.name}!`,
      });
      
      // Close dialog and reset
      setShowJoinDialog(false);
      setAccessCode("");
    },
    onError: (error) => {
      console.error('Join mutation error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to join group. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Leave group mutation
  const leaveGroupMutation = useMutation({
    mutationFn: async () => {
      if (!user || !groupId) {
        throw new Error('Missing required data');
      }
      
      console.log('=== LEAVE GROUP MUTATION START ===');
      console.log('Group:', groupId, 'User:', user.id);
      
      // Remove membership
      const { error: memberError } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', user.id);
      
      if (memberError) {
        console.error('Leave error:', memberError);
        throw memberError;
      }
      
      console.log('Successfully left group');
      return { action: 'left' };
    },
    onSuccess: (result) => {
      console.log('Leave mutation success:', result);
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      
      // Show success message
      toast({
        title: "Left Group",
        description: `You left ${group?.name}`,
      });
    },
    onError: (error) => {
      console.error('Leave mutation error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to leave group. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleJoinGroup = () => {
    if (!group?.is_private) {
      // Public group - join directly
      joinGroupMutation.mutate("");
    } else {
      // Private group - show access code dialog
      setShowJoinDialog(true);
    }
  };

  const handleJoinWithCode = () => {
    if (accessCode.trim()) {
      joinGroupMutation.mutate(accessCode.trim());
    }
  };

  const handleLeaveGroup = () => {
    leaveGroupMutation.mutate();
  };

  const handleCopyAccessCode = async () => {
    if (!group?.access_code) return;

    try {
      await navigator.clipboard.writeText(group.access_code);
      toast({
        title: "Access code copied!",
        description: "The access code has been copied to your clipboard.",
      });
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Please copy the access code manually.",
        variant: "destructive",
      });
    }
  };

  const handleAddToCart = () => {
    if (group?.product) {
      addToCartMutation.mutate(group.product.id);
    }
  };

  const isCreator = group?.creator_id === user?.id;
  const canViewMembers = !group?.is_private || group?.is_member || isCreator;
  const canViewProduct = !group?.is_private || group?.is_member || isCreator;

  console.log('GroupDetail: Current render state:', {
    groupLoaded: !!group,
    isJoined: group?.is_member,
    hasPendingRequest: false, // No longer applicable
    inviteOnly: group?.invite_only,
    isCreator,
    mutationPending: false // No longer applicable
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

            {/* Debug Info Panel */}
            <div className="bg-gray-100 p-4 mb-6 rounded-lg text-xs font-mono">
              <div className="font-bold mb-2">DEBUG INFO:</div>
              <div>User ID: {user?.id}</div>
              <div>Group ID: {groupId}</div>
              <div>Is Joined: {String(group.is_member)}</div>
              <div>Has Pending Request: {String(false)}</div>
              <div>Latest Join Request: {group.latestJoinRequest ? JSON.stringify(group.latestJoinRequest) : 'None'}</div>
              <div>Invite Only: {String(group.invite_only)}</div>
              <div>Is Private: {String(group.is_private)}</div>
              <div>Auto Approve: {String(group.auto_approve_requests)}</div>
              <div>Is Creator: {String(isCreator)}</div>
              <div>Mutation Pending: {String(false)}</div>
            </div>

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
                    {group.is_member && (
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
                    {/* Show appropriate button based on state */}
                    {!group.is_member && !group.invite_only && !group.hasPendingRequest && (
                      <Button 
                        onClick={handleJoinGroup}
                        disabled={joinGroupMutation.isPending}
                        className="social-button bg-gradient-to-r from-pink-500 to-rose-400 hover:from-pink-600 hover:to-rose-500"
                      >
                        {joinGroupMutation.isPending ? "Processing..." : (group.is_private && !group.auto_approve_requests ? "Request to Join" : "Join Group")}
                      </Button>
                    )}
                    
                    {group.hasPendingRequest && (
                      <Button 
                        disabled
                        className="bg-yellow-500 text-white cursor-not-allowed opacity-75"
                      >
                        Request Pending
                      </Button>
                    )}
                    
                    {group.is_member && !isCreator && (
                      <Button 
                        onClick={handleLeaveGroup}
                        disabled={leaveGroupMutation.isPending}
                        variant="outline"
                        className="border-pink-200 text-pink-600 hover:bg-pink-50"
                      >
                        {leaveGroupMutation.isPending ? "Leaving..." : "Leave Group"}
                      </Button>
                    )}

                    {group.invite_only && !group.is_member && !isCreator && !group.hasPendingRequest && (
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
                    <p className="text-2xl font-bold text-pink-600 mb-4">₹{group.product.price}</p>
                    <p className="text-sm text-gray-500 mb-4">
                      By {group.product.vendor_profile?.full_name || group.product.vendor_profile?.email || 'Unknown Vendor'}
                    </p>
                    
                    {group.is_member && (
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
      {/* Access Code Join Dialog */}
      <Dialog open={showJoinDialog} onOpenChange={setShowJoinDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="w-5 h-5 text-pink-500" />
              Join Private Group
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="accessCode">Access Code</Label>
              <Input
                id="accessCode"
                type="text"
                placeholder="Enter 8-digit access code"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                className="mt-1"
                maxLength={8}
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleJoinWithCode}
                disabled={!accessCode.trim() || joinGroupMutation.isPending}
                className="flex-1 bg-gradient-to-r from-pink-500 to-rose-400 hover:from-pink-600 hover:to-rose-500"
              >
                {joinGroupMutation.isPending ? "Joining..." : "Join Group"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowJoinDialog(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invite Members Dialog - Only for group creator */}
      {isCreator && (
        <InviteMembersDialog
          groupId={groupId!}
          groupName={group?.name || ""}
          open={showInviteDialog}
          onOpenChange={setShowInviteDialog}
        />
      )}
    </Layout>
  );
};

export default GroupDetail;
