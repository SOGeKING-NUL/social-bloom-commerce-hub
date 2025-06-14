import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Users, Lock, Plus, Search, ShoppingBag, ArrowRight } from "lucide-react";
import Layout from "@/components/Layout";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

const Groups = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDescription, setNewGroupDescription] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");

  // Fetch groups from database
  const { data: groups = [], isLoading, error } = useQuery({
    queryKey: ['groups'],
    queryFn: async () => {
      console.log('Fetching groups for user:', user?.id);
      
      const { data, error } = await supabase
        .from('groups')
        .select(`
          *,
          creator_profile:profiles!groups_creator_id_fkey (
            full_name,
            email
          ),
          product:products!product_id (
            name,
            image_url,
            price
          ),
          group_members (
            user_id
          )
        `)
        .order('created_at', { ascending: false });
      
      console.log('Groups query result:', { data, error });
      
      if (error) {
        console.error('Groups query error:', error);
        throw error;
      }
      
      const processedGroups = data.map(group => ({
        ...group,
        members: group.group_members?.length || 0,
        isJoined: group.group_members?.some(member => member.user_id === user?.id) || false,
        image: group.product?.image_url || "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=300&h=200&fit=crop"
      }));
      
      console.log('Processed groups:', processedGroups);
      return processedGroups;
    },
    enabled: !!user
  });

  // Log any query errors
  useEffect(() => {
    if (error) {
      console.error('Groups query error:', error);
    }
  }, [error]);

  // Fetch products for group creation
  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  // Create group mutation
  const createGroupMutation = useMutation({
    mutationFn: async ({ name, description, productId }: { name: string; description: string; productId: string }) => {
      if (!user) throw new Error('Not authenticated');
      
      console.log('Creating group with:', { name, description, productId, userId: user.id });
      
      const { data: group, error } = await supabase
        .from('groups')
        .insert({
          creator_id: user.id,
          product_id: productId,
          name,
          description
        })
        .select()
        .single();
      
      console.log('Group creation result:', { group, error });
      
      if (error) throw error;
      
      // Auto-join the creator to the group
      const { error: memberError } = await supabase
        .from('group_members')
        .insert({
          group_id: group.id,
          user_id: user.id
        });
      
      console.log('Group member creation result:', { memberError });
      
      if (memberError) throw memberError;
      
      return group;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      setNewGroupName("");
      setNewGroupDescription("");
      setSelectedProductId("");
      setShowCreateForm(false);
      toast({
        title: "Group Created!",
        description: "Your group has been created successfully.",
      });
    },
    onError: (error) => {
      console.error('Error creating group:', error);
      toast({
        title: "Error",
        description: "Failed to create group. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Join/Leave group mutation
  const toggleGroupMembershipMutation = useMutation({
    mutationFn: async ({ groupId, isJoined }: { groupId: string; isJoined: boolean }) => {
      if (!user) throw new Error('Not authenticated');
      
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
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
    onError: (error) => {
      console.error('Error toggling group membership:', error);
      toast({
        title: "Error",
        description: "Failed to update group membership. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleJoinGroup = (groupId: string, isJoined: boolean, groupName: string) => {
    toggleGroupMembershipMutation.mutate({ groupId, isJoined });
    
    toast({
      title: isJoined ? "Left Group" : "Joined Group!",
      description: isJoined 
        ? `You left ${groupName}` 
        : `Welcome to ${groupName}!`,
    });
  };

  const handleCreateGroup = () => {
    if (newGroupName.trim() && selectedProductId) {
      createGroupMutation.mutate({
        name: newGroupName,
        description: newGroupDescription,
        productId: selectedProductId
      });
    }
  };

  const handleGroupClick = (groupId: string) => {
    navigate(`/groups/${groupId}`);
  };

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    group.product?.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Add logging for render
  console.log('Groups component rendering with:', { 
    user: user?.id, 
    groupsCount: groups.length, 
    filteredGroupsCount: filteredGroups.length,
    isLoading,
    error 
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-b from-white to-pink-50">
          <div className="container mx-auto px-4 py-8">
            <div className="max-w-6xl mx-auto">
              <div className="animate-pulse space-y-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="smooth-card p-6">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
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
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold mb-4">Shopping Groups</h1>
              <p className="text-xl text-gray-600">Join exclusive groups and shop with your community</p>
            </div>

            {/* Search and Create */}
            <div className="flex flex-col md:flex-row gap-4 mb-8">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search groups or products..."
                  className="pl-10 border-pink-200 focus:ring-pink-300"
                />
              </div>
              <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
                <DialogTrigger asChild>
                  <Button className="social-button bg-gradient-to-r from-pink-500 to-rose-400 hover:from-pink-600 hover:to-rose-500">
                    <Plus className="w-5 h-5 mr-2" />
                    Create Group
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Group</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Input
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      placeholder="Group name"
                      className="border-pink-200 focus:ring-pink-300"
                    />
                    <Input
                      value={newGroupDescription}
                      onChange={(e) => setNewGroupDescription(e.target.value)}
                      placeholder="Group description"
                      className="border-pink-200 focus:ring-pink-300"
                    />
                    <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a product for this group" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name} - ${product.price}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex gap-4">
                      <Button
                        onClick={handleCreateGroup}
                        disabled={createGroupMutation.isPending || !newGroupName.trim() || !selectedProductId}
                        className="social-button bg-gradient-to-r from-pink-500 to-rose-400 hover:from-pink-600 hover:to-rose-500 flex-1"
                      >
                        {createGroupMutation.isPending ? 'Creating...' : 'Create Group'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setShowCreateForm(false)}
                        className="border-pink-200 text-pink-600 hover:bg-pink-50"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Debug info */}
            <div className="mb-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-600">
                Debug: Found {groups.length} total groups, {filteredGroups.length} after filtering
              </p>
              {error && (
                <p className="text-sm text-red-600">Error: {error.message}</p>
              )}
            </div>

            {/* Groups Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredGroups.map((group) => (
                <div key={group.id} className="smooth-card overflow-hidden floating-card animate-fade-in">
                  <div className="relative">
                    <img 
                      src={group.image} 
                      alt={group.name}
                      className="w-full h-48 object-cover cursor-pointer hover:scale-105 transition-transform duration-300"
                      onClick={() => handleGroupClick(group.id)}
                    />
                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-full p-2">
                      <Lock className="w-4 h-4 text-pink-500" />
                    </div>
                    {group.isJoined && (
                      <div className="absolute top-4 left-4 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                        Joined
                      </div>
                    )}
                  </div>
                  
                  <div className="p-6">
                    <h3 className="text-xl font-semibold mb-2">{group.name}</h3>
                    <p className="text-pink-600 font-medium mb-2">{group.product?.name}</p>
                    <p className="text-gray-600 text-sm mb-4">{group.description || "A shopping group for exclusive products"}</p>
                    
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center text-gray-500">
                        <Users className="w-4 h-4 mr-1" />
                        <span className="text-sm">{group.members} members</span>
                      </div>
                      <Button 
                        size="sm" 
                        onClick={() => handleJoinGroup(group.id, group.isJoined, group.name)}
                        disabled={toggleGroupMembershipMutation.isPending}
                        variant={group.isJoined ? "outline" : "default"}
                        className={group.isJoined 
                          ? "border-pink-200 text-pink-600 hover:bg-pink-50" 
                          : "social-button bg-gradient-to-r from-pink-500 to-rose-400 hover:from-pink-600 hover:to-rose-500"
                        }
                      >
                        {group.isJoined ? "Leave" : "Join Group"}
                      </Button>
                    </div>
                    
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => handleGroupClick(group.id)}
                      className="w-full text-pink-600 hover:bg-pink-50"
                    >
                      <ArrowRight className="w-4 h-4 mr-2" />
                      View Group
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {filteredGroups.length === 0 && (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">No groups found</h3>
                <p className="text-gray-500">Try searching with different keywords or create a new group.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Groups;
