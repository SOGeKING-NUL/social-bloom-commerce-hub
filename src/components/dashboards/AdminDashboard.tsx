
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, 
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, 
  AlertDialogAction } from '@/components/ui/alert-dialog';
import { Check, Clock, X, AlertCircle, UsersRound, Package, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const AdminDashboard = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedKYC, setSelectedKYC] = useState<any>(null);
  const [openRejectDialog, setOpenRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  // Fetch pending KYCs
  const { data: pendingKYCs } = useQuery({
    queryKey: ['pending-kycs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendor_kyc')
        .select(`
          *,
          profiles:vendor_id (
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
          profiles:vendor_id (
            email,
            full_name
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
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
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="kyc">KYC Verification</TabsTrigger>
            <TabsTrigger value="users">User Management</TabsTrigger>
            <TabsTrigger value="products">Product Management</TabsTrigger>
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
                              {kyc.profiles?.full_name || kyc.profiles?.email}
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
                        </tr>
                      </thead>
                      <tbody>
                        {users?.map((user) => (
                          <tr key={user.id} className="border-b hover:bg-gray-50">
                            <td className="p-2">{user.full_name || 'N/A'}</td>
                            <td className="p-2">{user.email}</td>
                            <td className="p-2">
                              <Badge 
                                className={
                                  user.role === 'admin' ? 'bg-red-500' : 
                                  user.role === 'vendor' ? 'bg-blue-500' : 'bg-gray-500'
                                }
                              >
                                {user.role}
                              </Badge>
                            </td>
                            <td className="p-2">
                              {new Date(user.created_at!).toLocaleDateString()}
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
                            <td className="p-2">{product.profiles?.full_name || product.profiles?.email}</td>
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
        </Tabs>
      </div>

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
                      <p>{selectedKYC.profiles?.full_name || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Email:</span>
                      <p>{selectedKYC.profiles?.email}</p>
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
  );
};

export default AdminDashboard;
