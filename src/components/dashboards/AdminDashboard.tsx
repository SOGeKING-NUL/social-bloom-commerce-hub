import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, 
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, 
  AlertDialogAction } from '@/components/ui/alert-dialog';
import { Check, Clock, X, AlertCircle, UsersRound, Package, FileText, Trash2, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Layout from '@/components/Layout';

const AdminDashboard = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedKYC, setSelectedKYC] = useState<any>(null);
  const [openRejectDialog, setOpenRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');

  // Fetch pending KYCs
  const { data: pendingKYCs } = useQuery({
    queryKey: ['pending-kycs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendor_kyc')
        .select(`
          *,
          vendor_profile:profiles!vendor_id (
            email, 
            full_name
          )
        `)
        .eq('status', 'pending')
        .order('submitted_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch all users
  const { data: users } = useQuery({
    queryKey: ['all-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch all products
  const { data: products } = useQuery({
    queryKey: ['all-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          vendor_profile:profiles!vendor_id (
            email,
            full_name
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch all posts
  const { data: posts } = useQuery({
    queryKey: ['all-posts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          user_profile:profiles!user_id (
            email,
            full_name
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch all groups
  const { data: groups } = useQuery({
    queryKey: ['all-groups'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('groups')
        .select(`
          *,
          creator_profile:profiles!creator_id (
            email,
            full_name
          ),
          product:products!product_id (
            name
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // Create post mutation
  const createPostMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!profile) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('posts')
        .insert({
          user_id: profile.id,
          content,
          post_type: 'text'
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-posts'] });
      setNewPostContent('');
      setShowCreatePost(false);
      toast({
        title: 'Post Created',
        description: 'Admin post has been created successfully',
      });
    },
  });

  // Delete post mutation
  const deletePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-posts'] });
      toast({
        title: 'Post Deleted',
        description: 'Post has been deleted successfully',
      });
    },
  });

  // Delete group mutation
  const deleteGroupMutation = useMutation({
    mutationFn: async (groupId: string) => {
      const { error } = await supabase
        .from('groups')
        .delete()
        .eq('id', groupId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-groups'] });
      toast({
        title: 'Group Deleted',
        description: 'Group has been deleted successfully',
      });
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      toast({
        title: 'User Deleted',
        description: 'User has been deleted successfully',
      });
    },
  });

  // Update user role mutation
  const updateUserRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string, role: string }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ role })
        .eq('id', userId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      toast({
        title: 'User Role Updated',
        description: 'User role has been updated successfully',
      });
    },
  });

  // Approve KYC
  const approveKYCMutation = useMutation({
    mutationFn: async (kycId: string) => {
      const { error } = await supabase
        .from('vendor_kyc')
        .update({ 
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: profile?.id
        })
        .eq('id', kycId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-kycs'] });
      toast({
        title: 'KYC Approved',
        description: 'Vendor can now start selling products',
      });
      setSelectedKYC(null);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to approve KYC',
        variant: 'destructive',
      });
    },
  });

  // Reject KYC
  const rejectKYCMutation = useMutation({
    mutationFn: async ({ kycId, reason }: { kycId: string; reason: string }) => {
      const { error } = await supabase
        .from('vendor_kyc')
        .update({ 
          status: 'rejected',
          rejection_reason: reason,
          reviewed_at: new Date().toISOString(),
          reviewed_by: profile?.id
        })
        .eq('id', kycId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-kycs'] });
      toast({
        title: 'KYC Rejected',
        description: 'Vendor has been notified',
      });
      setSelectedKYC(null);
      setOpenRejectDialog(false);
      setRejectionReason('');
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to reject KYC',
        variant: 'destructive',
      });
    },
  });

  // Update product status mutation
  const updateProductStatusMutation = useMutation({
    mutationFn: async ({ productId, isActive }: { productId: string, isActive: boolean }) => {
      const { error } = await supabase
        .from('products')
        .update({ is_active: isActive })
        .eq('id', productId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-products'] });
      toast({
        title: 'Product Updated',
        description: 'Product status has been updated',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update product status',
        variant: 'destructive',
      });
    },
  });

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <Button
              onClick={() => setShowCreatePost(true)}
              className="social-button bg-gradient-to-r from-pink-500 to-rose-400 hover:from-pink-600 hover:to-rose-500"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Post
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <UsersRound className="w-5 h-5 mr-2" />
                  Total Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{users?.length || 0}</p>
                <div className="text-sm text-gray-600 mt-2">
                  <span className="mr-4">Users: {users?.filter(u => u.role === 'user').length || 0}</span>
                  <span className="mr-4">Vendors: {users?.filter(u => u.role === 'vendor').length || 0}</span>
                  <span>Admins: {users?.filter(u => u.role === 'admin').length || 0}</span>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <Package className="w-5 h-5 mr-2" />
                  Total Products
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{products?.length || 0}</p>
                <div className="text-sm text-gray-600 mt-2">
                  <span className="mr-4">Active: {products?.filter(p => p.is_active).length || 0}</span>
                  <span>Inactive: {products?.filter(p => !p.is_active).length || 0}</span>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <FileText className="w-5 h-5 mr-2" />
                  Posts & Groups
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{(posts?.length || 0) + (groups?.length || 0)}</p>
                <div className="text-sm text-gray-600 mt-2">
                  <span className="mr-4">Posts: {posts?.length || 0}</span>
                  <span>Groups: {groups?.length || 0}</span>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <Clock className="w-5 h-5 mr-2" />
                  Pending KYC
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{pendingKYCs?.length || 0}</p>
                <p className="text-sm text-gray-600 mt-2">
                  {pendingKYCs && pendingKYCs.length > 0 ? 
                    `${pendingKYCs.length} verification${pendingKYCs.length > 1 ? 's' : ''} waiting for review` :
                    'No pending verifications'
                  }
                </p>
              </CardContent>
            </Card>
          </div>
          
          <Tabs defaultValue="kyc" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="kyc">KYC Verification</TabsTrigger>
              <TabsTrigger value="users">User Management</TabsTrigger>
              <TabsTrigger value="products">Product Management</TabsTrigger>
              <TabsTrigger value="posts">Post Management</TabsTrigger>
              <TabsTrigger value="groups">Group Management</TabsTrigger>
            </TabsList>

            <TabsContent value="kyc">
              <Card>
                <CardHeader>
                  <CardTitle>
                    KYC Verification Requests ({pendingKYCs?.length || 0})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {pendingKYCs?.length === 0 ? (
                    <p className="text-center text-gray-500 py-6">No pending KYC verification requests</p>
                  ) : (
                    <div className="space-y-4">
                      {pendingKYCs?.map((kyc) => (
                        <div key={kyc.id} className="border p-4 rounded-lg">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium">
                                {kyc.vendor_profile?.full_name || kyc.vendor_profile?.email}
                              </h4>
                              <p className="text-sm text-gray-600">Business: {kyc.business_name}</p>
                              <p className="text-sm text-gray-600">
                                Submitted: {new Date(kyc.submitted_at!).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => setSelectedKYC(kyc)}
                              >
                                Review
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="users">
              <Card>
                <CardHeader>
                  <CardTitle>
                    User Management ({users?.length || 0} users)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2">User</th>
                            <th className="text-left p-2">Email</th>
                            <th className="text-left p-2">Role</th>
                            <th className="text-left p-2">Joined</th>
                            <th className="text-left p-2">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {users?.map((user) => (
                            <tr key={user.id} className="border-b hover:bg-gray-50">
                              <td className="p-2">{user.full_name || 'N/A'}</td>
                              <td className="p-2">{user.email}</td>
                              <td className="p-2">
                                <Select
                                  value={user.role}
                                  onValueChange={(role) => updateUserRoleMutation.mutate({ userId: user.id, role })}
                                >
                                  <SelectTrigger className="w-32">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="user">User</SelectItem>
                                    <SelectItem value="vendor">Vendor</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                  </SelectContent>
                                </Select>
                              </td>
                              <td className="p-2">
                                {new Date(user.created_at!).toLocaleDateString()}
                              </td>
                              <td className="p-2">
                                {user.id !== profile?.id && (
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => deleteUserMutation.mutate(user.id)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="products">
              <Card>
                <CardHeader>
                  <CardTitle>
                    Product Management ({products?.length || 0} products)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2">Product</th>
                            <th className="text-left p-2">Vendor</th>
                            <th className="text-left p-2">Price</th>
                            <th className="text-left p-2">Status</th>
                            <th className="text-left p-2">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {products?.map((product) => (
                            <tr key={product.id} className="border-b hover:bg-gray-50">
                              <td className="p-2">{product.name}</td>
                              <td className="p-2">{product.vendor_profile?.full_name || product.vendor_profile?.email}</td>
                              <td className="p-2">${product.price}</td>
                              <td className="p-2">
                                <Badge 
                                  variant={product.is_active ? "default" : "secondary"}
                                >
                                  {product.is_active ? "Active" : "Inactive"}
                                </Badge>
                              </td>
                              <td className="p-2">
                                <Button
                                  variant={product.is_active ? "destructive" : "default"}
                                  size="sm"
                                  onClick={() => updateProductStatusMutation.mutate({
                                    productId: product.id,
                                    isActive: !product.is_active
                                  })}
                                >
                                  {product.is_active ? "Deactivate" : "Activate"}
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="posts">
              <Card>
                <CardHeader>
                  <CardTitle>
                    Post Management ({posts?.length || 0} posts)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {posts?.map((post) => (
                      <div key={post.id} className="border p-4 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-medium">
                                {post.user_profile?.full_name || post.user_profile?.email}
                              </span>
                              <span className="text-sm text-gray-500">
                                {new Date(post.created_at!).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-gray-700">{post.content}</p>
                            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                              <span>{post.likes_count || 0} likes</span>
                              <span>{post.comments_count || 0} comments</span>
                              <span>{post.shares_count || 0} shares</span>
                            </div>
                          </div>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deletePostMutation.mutate(post.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    
                    {posts?.length === 0 && (
                      <div className="text-center py-8">
                        <p className="text-gray-500">No posts found</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="groups">
              <Card>
                <CardHeader>
                  <CardTitle>
                    Group Management ({groups?.length || 0} groups)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {groups?.map((group) => (
                      <div key={group.id} className="border p-4 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-medium">{group.name}</span>
                              <span className="text-sm text-gray-500">
                                Created {new Date(group.created_at!).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-gray-600 mb-2">{group.description}</p>
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              <span>Creator: {group.creator_profile?.full_name || group.creator_profile?.email}</span>
                              <span>Product: {group.product?.name}</span>
                            </div>
                          </div>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deleteGroupMutation.mutate(group.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    
                    {groups?.length === 0 && (
                      <div className="text-center py-8">
                        <p className="text-gray-500">No groups found</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Create Post Dialog */}
        <Sheet open={showCreatePost} onOpenChange={setShowCreatePost}>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Create Admin Post</SheetTitle>
            </SheetHeader>
            <div className="mt-6 space-y-4">
              <Textarea
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                placeholder="What would you like to share?"
                className="min-h-32"
              />
              <div className="flex gap-2">
                <Button
                  onClick={() => createPostMutation.mutate(newPostContent)}
                  disabled={createPostMutation.isPending || !newPostContent.trim()}
                  className="social-button bg-gradient-to-r from-pink-500 to-rose-400 hover:from-pink-600 hover:to-rose-500 flex-1"
                >
                  {createPostMutation.isPending ? 'Creating...' : 'Create Post'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowCreatePost(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* KYC Review Sheet */}
        <Sheet open={!!selectedKYC} onOpenChange={() => setSelectedKYC(null)}>
          <SheetContent className="w-full md:max-w-md">
            <SheetHeader>
              <SheetTitle>Review KYC Application</SheetTitle>
            </SheetHeader>
            <div className="mt-6 space-y-6">
              {selectedKYC && (
                <>
                  <div>
                    <h3 className="font-medium mb-1">Business Details</h3>
                    <div className="space-y-2">
                      <div>
                        <span className="text-sm text-gray-500">Business Name:</span>
                        <p>{selectedKYC.business_name}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500">Business Address:</span>
                        <p>{selectedKYC.business_address}</p>
                      </div>
                      {selectedKYC.gst_number && (
                        <div>
                          <span className="text-sm text-gray-500">GST Number:</span>
                          <p>{selectedKYC.gst_number}</p>
                        </div>
                      )}
                      {selectedKYC.aadhar_number && (
                        <div>
                          <span className="text-sm text-gray-500">Aadhar Number:</span>
                          <p>{selectedKYC.aadhar_number}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium mb-1">Vendor Details</h3>
                    <div className="space-y-2">
                      <div>
                        <span className="text-sm text-gray-500">Name:</span>
                        <p>{selectedKYC.vendor_profile?.full_name || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500">Email:</span>
                        <p>{selectedKYC.vendor_profile?.email}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500">Submitted At:</span>
                        <p>{new Date(selectedKYC.submitted_at!).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setOpenRejectDialog(true)}
                    >
                      <X className="w-4 h-4 mr-2" /> Reject
                    </Button>
                    <Button
                      onClick={() => approveKYCMutation.mutate(selectedKYC.id)}
                    >
                      <Check className="w-4 h-4 mr-2" /> Approve
                    </Button>
                  </div>
                </>
              )}
            </div>
          </SheetContent>
        </Sheet>

        {/* Rejection Dialog */}
        <AlertDialog open={openRejectDialog} onOpenChange={setOpenRejectDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reject KYC Application</AlertDialogTitle>
              <AlertDialogDescription>
                Please provide a reason for rejection. This will be visible to the vendor.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Rejection reason..."
                className="min-h-24"
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setOpenRejectDialog(false)}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => rejectKYCMutation.mutate({ kycId: selectedKYC.id, reason: rejectionReason })}
                className="bg-red-600 hover:bg-red-700"
              >
                <X className="w-4 h-4 mr-2" />
                Reject Application
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
};

export default AdminDashboard;
