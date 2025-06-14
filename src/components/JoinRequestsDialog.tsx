
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, X, Clock } from "lucide-react";

interface JoinRequestsDialogProps {
  groupId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const JoinRequestsDialog = ({ groupId, open, onOpenChange }: JoinRequestsDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: joinRequests = [], isLoading } = useQuery({
    queryKey: ['join-requests', groupId],
    queryFn: async () => {
      const { data: requests, error } = await supabase
        .from('group_join_requests')
        .select('*')
        .eq('group_id', groupId)
        .eq('status', 'pending')
        .order('requested_at', { ascending: false });
      
      if (error) throw error;
      
      if (!requests || requests.length === 0) return [];
      
      // Get user profiles for the requests
      const userIds = requests.map(r => r.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', userIds);
      
      return requests.map(request => ({
        ...request,
        user_profile: profiles?.find(p => p.id === request.user_id)
      }));
    },
    enabled: open && !!groupId
  });

  const handleRequestMutation = useMutation({
    mutationFn: async ({ requestId, status, userId }: { requestId: string; status: 'approved' | 'rejected'; userId: string }) => {
      // Update the join request status
      const { error: requestError } = await supabase
        .from('group_join_requests')
        .update({
          status,
          reviewed_at: new Date().toISOString(),
          reviewed_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', requestId);
      
      if (requestError) throw requestError;
      
      // If approved, add user to group
      if (status === 'approved') {
        const { error: memberError } = await supabase
          .from('group_members')
          .insert({
            group_id: groupId,
            user_id: userId
          });
        
        if (memberError) throw memberError;
      }
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['join-requests', groupId] });
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
      toast({
        title: status === 'approved' ? "Request Approved" : "Request Rejected",
        description: `Join request has been ${status}.`,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Join Requests</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {isLoading ? (
            <p className="text-center text-gray-500">Loading requests...</p>
          ) : joinRequests.length === 0 ? (
            <p className="text-center text-gray-500">No pending requests</p>
          ) : (
            joinRequests.map((request) => (
              <div key={request.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={request.user_profile?.avatar_url} />
                    <AvatarFallback>
                      {request.user_profile?.full_name?.charAt(0) || request.user_profile?.email?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">
                      {request.user_profile?.full_name || request.user_profile?.email?.split('@')[0] || 'User'}
                    </p>
                    <p className="text-sm text-gray-500 flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      {new Date(request.requested_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    onClick={() => handleApprove(request.id, request.user_id)}
                    disabled={handleRequestMutation.isPending}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleReject(request.id, request.user_id)}
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
