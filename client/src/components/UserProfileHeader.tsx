
import { useState } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Globe, Calendar, UserPlus, UserMinus, Edit, Settings, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import FollowersDialog from "./FollowersDialog";

interface UserProfileHeaderProps {
  profileUserId: string;
  profile: any;
  isOwnProfile: boolean;
  onEditProfile?: () => void;
}

const UserProfileHeader = ({ profileUserId, profile, isOwnProfile, onEditProfile }: UserProfileHeaderProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [showFollowersDialog, setShowFollowersDialog] = useState(false);
  const [followersDialogTab, setFollowersDialogTab] = useState<'followers' | 'following'>('followers');

  // Check if current user is following this profile
  const { data: isFollowing = false } = useQuery({
    queryKey: ['is-following', profileUserId],
    queryFn: async () => {
      if (!user || isOwnProfile) return false;
      
      const { data, error } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', profileUserId)
        .single();
      
      return !!data;
    },
    enabled: !!user && !isOwnProfile,
  });

  // Follow/unfollow mutation
  const followMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      
      if (isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', profileUserId);
        
        if (error) throw error;
      } else {
        // Follow
        const { error } = await supabase
          .from('follows')
          .insert({
            follower_id: user.id,
            following_id: profileUserId
          });
        
        if (error) throw error;
      }
    },
    onSuccess: async () => {
      console.log('Follow mutation succeeded, invalidating cache for profile:', profileUserId);
      
      // Clear all related cache entries completely
      queryClient.removeQueries({ queryKey: ['is-following'] });
      queryClient.removeQueries({ queryKey: ['user-profile'] });
      queryClient.removeQueries({ queryKey: ['followers'] });
      queryClient.removeQueries({ queryKey: ['following'] });
      
      // Force immediate refetch
      await queryClient.refetchQueries({ queryKey: ['user-profile', profileUserId] });
      await queryClient.refetchQueries({ queryKey: ['user-profile', user?.id] });
      
      console.log('Cache invalidated and refetched');
      
      toast({
        title: isFollowing ? "Unfollowed" : "Following",
        description: isFollowing 
          ? `You unfollowed ${profile?.full_name || 'this user'}` 
          : `You are now following ${profile?.full_name || 'this user'}`,
      });
    },
    onError: (error: any) => {
      console.error('Follow mutation error:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Fetch user's groups for invitation
  const { data: userGroups = [] } = useQuery({
    queryKey: ['user-admin-groups', user?.id],
    queryFn: async () => {
      if (!user || isOwnProfile) return [];
      
      const { data, error } = await supabase
        .from('groups')
        .select('id, name, description')
        .eq('creator_id', user.id);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && !isOwnProfile,
  });

  // Invite to group mutation
  const inviteToGroupMutation = useMutation({
    mutationFn: async (groupId: string) => {
      if (!user || !profile?.email) throw new Error('Missing required data');
      
      const { error } = await supabase
        .from('group_invites')
        .insert({
          group_id: groupId,
          invited_by: user.id,
          invited_email: profile.email
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Invitation sent",
        description: `${profile?.full_name || 'User'} has been invited to the group`,
      });
      setShowInviteDialog(false);
      setSelectedGroupId("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleFollow = () => {
    followMutation.mutate();
  };

  const handleInviteToGroup = () => {
    if (selectedGroupId) {
      inviteToGroupMutation.mutate(selectedGroupId);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          {/* Avatar */}
          <div className="relative">
            {profile?.avatar_url ? (
              <Avatar className="w-32 h-32 border-4 border-white dark:border-gray-800 shadow-lg">
                <AvatarImage src={profile.avatar_url} />
                <AvatarFallback className="text-3xl bg-gradient-to-br from-pink-400 to-purple-500 text-white">
                  {profile?.full_name?.charAt(0) || profile?.email?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
            ) : (
              <div className="w-32 h-32 border-4 border-white dark:border-gray-800 shadow-lg rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white text-4xl font-bold">
                {profile?.full_name?.charAt(0) || profile?.email?.charAt(0) || 'U'}
              </div>
            )}
          </div>

          {/* Profile Info */}
          <div className="flex-1 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {profile?.full_name || 'Unknown User'}
                </h1>
                <p className="text-gray-600 dark:text-gray-300">
                  @{profile?.email?.split('@')[0] || 'user'}
                </p>
                <Badge variant="secondary" className="mt-1 capitalize">
                  {profile?.role || 'user'}
                </Badge>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                {isOwnProfile ? (
                  <>
                    <Button onClick={onEditProfile} variant="outline" size="sm">
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Profile
                    </Button>
                    <Button variant="outline" size="sm">
                      <Settings className="w-4 h-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Button 
                      onClick={handleFollow}
                      disabled={followMutation.isPending}
                      variant={isFollowing ? "outline" : "default"}
                      size="sm"
                      className={isFollowing ? "" : "bg-pink-500 hover:bg-pink-600"}
                    >
                      {isFollowing ? (
                        <>
                          <UserMinus className="w-4 h-4 mr-2" />
                          Unfollow
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4 mr-2" />
                          Follow
                        </>
                      )}
                    </Button>
                    {userGroups.length > 0 && (
                      <Button 
                        onClick={() => setShowInviteDialog(true)}
                        variant="outline"
                        size="sm"
                      >
                        <Users className="w-4 h-4 mr-2" />
                        Invite to Group
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="flex gap-6 text-sm">
              <div className="text-center">
                <div className="font-bold text-lg text-gray-900 dark:text-white">
                  {profile?.posts_count || 0}
                </div>
                <div className="text-gray-600 dark:text-gray-300">Posts</div>
              </div>
              <div 
                className="text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 p-2 rounded-lg transition-colors"
                onClick={() => {
                  setFollowersDialogTab('followers');
                  setShowFollowersDialog(true);
                }}
              >
                <div className="font-bold text-lg text-gray-900 dark:text-white">
                  {profile?.followers_count || 0}
                </div>
                <div className="text-gray-600 dark:text-gray-300">Followers</div>
              </div>
              <div 
                className="text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 p-2 rounded-lg transition-colors"
                onClick={() => {
                  setFollowersDialogTab('following');
                  setShowFollowersDialog(true);
                }}
              >
                <div className="font-bold text-lg text-gray-900 dark:text-white">
                  {profile?.following_count || 0}
                </div>
                <div className="text-gray-600 dark:text-gray-300">Following</div>
              </div>
            </div>

            {/* Bio and Details */}
            {profile?.bio && (
              <p className="text-gray-700 dark:text-gray-300 max-w-md">
                {profile.bio}
              </p>
            )}

            <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-300">
              {profile?.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {profile.location}
                </div>
              )}
              {profile?.website && (
                <div className="flex items-center gap-1">
                  <Globe className="w-4 h-4" />
                  <a 
                    href={profile.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-pink-500 hover:underline"
                  >
                    {profile.website}
                  </a>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Joined {new Date(profile?.created_at).toLocaleDateString('en-US', { 
                  month: 'long', 
                  year: 'numeric' 
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Invite to Group Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite {profile?.full_name || 'User'} to Group</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Select a group to invite this user to:
            </p>
            <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a group" />
              </SelectTrigger>
              <SelectContent>
                {userGroups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowInviteDialog(false)}
                disabled={inviteToGroupMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleInviteToGroup}
                disabled={!selectedGroupId || inviteToGroupMutation.isPending}
                className="bg-pink-500 hover:bg-pink-600"
              >
                Send Invite
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Followers Dialog */}
      <FollowersDialog
        isOpen={showFollowersDialog}
        onOpenChange={setShowFollowersDialog}
        profileUserId={profileUserId}
        profileName={profile?.full_name || 'User'}
        initialTab={followersDialogTab}
      />
    </div>
  );
};

export default UserProfileHeader;
