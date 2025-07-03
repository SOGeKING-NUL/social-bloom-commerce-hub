
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Check, X, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface JoinRequest {
  id: string;
  user_id: string;
  message: string | null;
  requested_at: string;
  status: string;
  user_profile?: {
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  };
}

interface JoinRequestsDialogProps {
  groupId: string;
  groupName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const JoinRequestsDialog = ({ groupId, groupName, open, onOpenChange }: JoinRequestsDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch join requests
  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['join-requests', groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('group_join_requests')
        .select(`
          *,
          user_profile:profiles!user_id (
            full_name,
            email,
            avatar_url
          )
        `)
        .eq('group_id', groupId)
        .eq('status', 'pending')
        .order('requested_at', { ascending: false });
      
      if (error) throw error;
      
      const requestsWithProfiles: JoinRequest[] = data?.map(request => ({
        ...request,
        user_profile: request.user_profile || undefined
      })) || [];
      
      return requestsWithProfiles;
    },
    enabled: open,
  });

  // Handle join request mutation
  const handleRequestMutation = useMutation({
    mutationFn: async ({ requestId, action, userId }: { requestId: string; action: 'approve' | 'reject'; userId: string }) => {
      console.log('Processing request:', { requestId, action, userId, groupId });
      
      if (action === 'approve') {
        // First, add user to group_members
        const { error: memberError } = await supabase
          .from('group_members')
          .insert({
            group_id: groupId,
            user_id: userId
          });
        
        if (memberError) {
          console.error('Error adding member:', memberError);
          throw memberError;
        }
        
        // Then update request status
        const { error: updateError } = await supabase
          .from('group_join_requests')
          .update({ 
            status: 'approved',
            reviewed_at: new Date().toISOString()
          })
          .eq('id', requestId);
        
        if (updateError) {
          console.error('Error updating request:', updateError);
          throw updateError;
        }
      } else {
        // Just update request status for rejection
        const { error } = await supabase
          .from('group_join_requests')
          .update({ 
            status: 'rejected',
            reviewed_at: new Date().toISOString()
          })
          .eq('id', requestId);
        
        if (error) throw error;
      }
    },
    onSuccess: (_, { action }) => {
      queryClient.invalidateQueries({ queryKey: ['join-requests', groupId] });
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      
      toast({
        title: action === 'approve' ? "Request Approved" : "Request Rejected",
        description: `The join request has been ${action}d.`,
      });
    },
    onError: (error) => {
      console.error('Error processing request:', error);
      toast({
        title: "Error",
        description: "Failed to process the request. Please try again.",
        variant: "destructive"
      });
    }
  });

  const requestsWithProfiles = requests as JoinRequest[];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Join Requests for {groupName}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="text-center py-8">Loading requests...</div>
          ) : requestsWithProfiles.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No pending join requests.
            </div>
          ) : (
            requestsWithProfiles.map((request) => (
              <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={request.user_profile?.avatar_url || undefined} />
                    <AvatarFallback>
                      {request.user_profile?.full_name?.charAt(0) || 
                       request.user_profile?.email?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">
                      {request.user_profile?.full_name || request.user_profile?.email || 'Unknown User'}
                    </p>
                    <p className="text-sm text-gray-500">
                      Requested {new Date(request.requested_at).toLocaleDateString()}
                    </p>
                    {request.message && (
                      <p className="text-sm text-gray-600 mt-1 italic">
                        "{request.message}"
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    onClick={() => handleRequestMutation.mutate({
                      requestId: request.id,
                      action: 'approve',
                      userId: request.user_id
                    })}
                    disabled={handleRequestMutation.isPending}
                    className="bg-green-500 hover:bg-green-600"
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleRequestMutation.mutate({
                      requestId: request.id,
                      action: 'reject',
                      userId: request.user_id
                    })}
                    disabled={handleRequestMutation.isPending}
                  >
                    <X className="w-4 h-4" />
                  </Button>
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
