import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, X, Clock, Mail } from "lucide-react";

interface JoinRequestsDialogProps {
  groupId: string;
  groupName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const JoinRequestsDialog = ({ groupId, groupName, open, onOpenChange }: JoinRequestsDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: requests = [], isLoading, error } = useQuery({
    queryKey: ['join-requests', groupId],
    queryFn: async () => {
      console.log('=== JoinRequestsDialog DEBUG START ===');
      console.log('JoinRequestsDialog: Fetching for group:', groupId);
      console.log('JoinRequestsDialog: Dialog open state:', open);
      
      if (!groupId) {
        console.log('JoinRequestsDialog: No groupId provided');
        throw new Error('Group ID is required');
      }

      try {
        // Step 1: Get ALL join requests for this group (don't filter by status yet)
        console.log('JoinRequestsDialog: Step 1 - Fetching ALL join requests');
        const { data: allRequests, error: requestsError } = await supabase
          .from('group_join_requests')
          .select('*')
          .eq('group_id', groupId);
        
        console.log('JoinRequestsDialog: All requests result:', { 
          allRequests, 
          requestsError,
          count: allRequests?.length || 0 
        });
        
        if (requestsError) {
          console.error('JoinRequestsDialog: Error fetching requests:', requestsError);
          throw requestsError;
        }

        // Step 2: Filter for pending requests
        const pendingRequests = (allRequests || []).filter(req => req.status === 'pending');
        console.log('JoinRequestsDialog: Pending requests:', {
          total: allRequests?.length || 0,
          pending: pendingRequests.length,
          pendingRequests
        });

        if (pendingRequests.length === 0) {
          console.log('JoinRequestsDialog: No pending requests found');
          console.log('=== JoinRequestsDialog DEBUG END (no pending) ===');
          return [];
        }

        // Step 3: Get user profiles for pending requests
        const userIds = pendingRequests.map(req => req.user_id);
        console.log('JoinRequestsDialog: Step 3 - Fetching profiles for user IDs:', userIds);
        
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, email, avatar_url')
          .in('id', userIds);
        
        console.log('JoinRequestsDialog: Profiles result:', { 
          profiles, 
          profilesError,
          profileCount: profiles?.length || 0 
        });
        
        if (profilesError) {
          console.error('JoinRequestsDialog: Error fetching profiles:', profilesError);
          // Continue without profiles if there's an error
        }

        // Step 4: Combine requests with profiles
        const requestsWithProfiles = pendingRequests.map(request => {
          const profile = profiles?.find(p => p.id === request.user_id);
          console.log('JoinRequestsDialog: Mapping request:', {
            requestId: request.id,
            userId: request.user_id,
            foundProfile: !!profile,
            profileName: profile?.full_name || profile?.email
          });
          
          return {
            ...request,
            type: 'request' as const,
            user_profile: profile
          };
        });

        console.log('JoinRequestsDialog: Final requests with profiles:', requestsWithProfiles);

        // Step 5: Get pending invites
        console.log('JoinRequestsDialog: Step 5 - Fetching pending invites');
        const { data: invites, error: invitesError } = await supabase
          .from('group_invites')
          .select('*')
          .eq('group_id', groupId)
          .eq('status', 'pending')
          .gt('expires_at', new Date().toISOString());
        
        console.log('JoinRequestsDialog: Invites result:', { 
          invites, 
          invitesError,
          inviteCount: invites?.length || 0 
        });
        
        if (invitesError) {
          console.error('JoinRequestsDialog: Error fetching invites:', invitesError);
          // Continue without invites if there's an error
        }

        // Step 6: Process invites
        const processedInvites = (invites || []).map(invite => ({
          ...invite,
          type: 'invite' as const
        }));

        const finalResult = [...requestsWithProfiles, ...processedInvites];
        
        console.log('JoinRequestsDialog: Final combined result:', {
          requestsCount: requestsWithProfiles.length,
          invitesCount: processedInvites.length,
          totalItems: finalResult.length,
          finalResult
        });
        console.log('=== JoinRequestsDialog DEBUG END ===');
        
        return finalResult;
        
      } catch (error) {
        console.error('JoinRequestsDialog: Query function error:', error);
        console.log('=== JoinRequestsDialog DEBUG END (error) ===');
        throw error;
      }
    },
    enabled: open && !!groupId,
    refetchOnWindowFocus: false,
    staleTime: 0 // Always fetch fresh data
  });

  const handleRequestMutation = useMutation({
    mutationFn: async ({ requestId, status, userId }: { requestId: string; status: 'approved' | 'rejected'; userId: string }) => {
      console.log('JoinRequestsDialog: Processing request:', { requestId, status, userId });
      
      // Update the join request status
      const { error: requestError } = await supabase
        .from('group_join_requests')
        .update({
          status,
          reviewed_at: new Date().toISOString(),
          reviewed_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', requestId);
      
      if (requestError) {
        console.error('JoinRequestsDialog: Error updating request:', requestError);
        throw requestError;
      }
      
      // If approved, add user to group
      if (status === 'approved') {
        const { error: memberError } = await supabase
          .from('group_members')
          .insert({
            group_id: groupId,
            user_id: userId
          });
        
        if (memberError) {
          console.error('JoinRequestsDialog: Error adding member:', memberError);
          throw memberError;
        }
      }
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['join-requests', groupId] });
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      toast({
        title: status === 'approved' ? "Request Approved" : "Request Rejected",
        description: `Join request has been ${status}.`,
      });
    },
    onError: (error: any) => {
      console.error('JoinRequestsDialog: Error processing request:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const cancelInviteMutation = useMutation({
    mutationFn: async (inviteId: string) => {
      const { error } = await supabase
        .from('group_invites')
        .update({ status: 'expired' })
        .eq('id', inviteId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['join-requests', groupId] });
      toast({
        title: "Invite Cancelled",
        description: "The invite has been cancelled.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleApprove = (requestId: string, userId: string) => {
    handleRequestMutation.mutate({ requestId, status: 'approved', userId });
  };

  const handleReject = (requestId: string, userId: string) => {
    handleRequestMutation.mutate({ requestId, status: 'rejected', userId });
  };

  const handleCancelInvite = (inviteId: string) => {
    cancelInviteMutation.mutate(inviteId);
  };

  console.log('JoinRequestsDialog: Rendering with state:', { 
    open,
    groupId,
    requestsLength: requests.length, 
    isLoading,
    error: error?.message
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage {groupName} Requests & Invites</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Debug info */}
          <div className="text-xs text-gray-400 p-2 bg-gray-50 rounded">
            Debug: Group ID: {groupId} | Requests: {requests.length} | Loading: {isLoading ? 'Yes' : 'No'}
            {error && <div className="text-red-500">Error: {error.message}</div>}
          </div>
          
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500 mx-auto"></div>
              <p className="mt-2 text-gray-500">Loading...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="text-red-500 mb-4">Error loading requests</div>
              <p className="text-sm text-gray-500">{error.message}</p>
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-8">
              <Mail className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No pending requests or invites</p>
              <p className="text-xs text-gray-400 mt-2">Group ID: {groupId}</p>
            </div>
          ) : (
            requests.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                <div className="flex items-center space-x-3 flex-1">
                  {item.type === 'request' ? (
                    <>
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={(item as any).user_profile?.avatar_url} />
                        <AvatarFallback className="bg-gradient-to-r from-pink-500 to-rose-400 text-white">
                          {(item as any).user_profile?.full_name?.charAt(0) || (item as any).user_profile?.email?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">
                            {(item as any).user_profile?.full_name || (item as any).user_profile?.email?.split('@')[0] || 'User'}
                          </p>
                          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                            Request
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500 flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {new Date((item as any).requested_at).toLocaleDateString()}
                        </p>
                        {(item as any).message && (
                          <p className="text-sm text-gray-600 mt-1 italic">"{(item as any).message}"</p>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-12 h-12 rounded-full bg-gradient-to-r from-green-500 to-emerald-400 flex items-center justify-center">
                        <Mail className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{(item as any).invited_email}</p>
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            Invite
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500">
                          Expires: {new Date((item as any).expires_at).toLocaleDateString()}
                        </p>
                      </div>
                    </>
                  )}
                </div>
                
                <div className="flex space-x-2">
                  {item.type === 'request' ? (
                    <>
                      <Button
                        size="sm"
                        onClick={() => handleApprove(item.id, (item as any).user_id)}
                        disabled={handleRequestMutation.isPending}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleReject(item.id, (item as any).user_id)}
                        disabled={handleRequestMutation.isPending}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCancelInvite(item.id)}
                      disabled={cancelInviteMutation.isPending}
                      className="text-red-600 border-red-200 hover:bg-red-50"
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default JoinRequestsDialog;
