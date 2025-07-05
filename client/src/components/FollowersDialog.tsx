import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { User } from "lucide-react";

interface FollowersDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  profileUserId: string;
  profileName: string;
  initialTab?: 'followers' | 'following';
}

const FollowersDialog = ({ 
  isOpen, 
  onOpenChange, 
  profileUserId, 
  profileName, 
  initialTab = 'followers' 
}: FollowersDialogProps) => {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  // Fetch followers
  const { data: followers = [], isLoading: followersLoading } = useQuery({
    queryKey: ['followers', profileUserId],
    queryFn: async () => {
      console.log('Fetching followers for:', profileUserId);
      
      // First get follow relationships
      const { data: followData, error: followError } = await supabase
        .from('follows')
        .select('follower_id, created_at')
        .eq('following_id', profileUserId)
        .order('created_at', { ascending: false });
      
      if (followError) {
        console.error('Follow relationships query error:', followError);
        throw followError;
      }
      
      console.log('Follow relationships:', followData);
      
      if (!followData || followData.length === 0) {
        return [];
      }
      
      // Then get profile data for each follower
      const followerIds = followData.map(f => f.follower_id);
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', followerIds);
      
      if (profileError) {
        console.error('Profiles query error:', profileError);
        throw profileError;
      }
      
      console.log('Follower profiles:', profileData);
      return profileData || [];
    },
    enabled: isOpen,
  });

  // Fetch following
  const { data: following = [], isLoading: followingLoading } = useQuery({
    queryKey: ['following', profileUserId],
    queryFn: async () => {
      console.log('Fetching following for:', profileUserId);
      
      // First get follow relationships
      const { data: followData, error: followError } = await supabase
        .from('follows')
        .select('following_id, created_at')
        .eq('follower_id', profileUserId)
        .order('created_at', { ascending: false });
      
      if (followError) {
        console.error('Follow relationships query error:', followError);
        throw followError;
      }
      
      console.log('Following relationships:', followData);
      
      if (!followData || followData.length === 0) {
        return [];
      }
      
      // Then get profile data for each following
      const followingIds = followData.map(f => f.following_id);
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', followingIds);
      
      if (profileError) {
        console.error('Profiles query error:', profileError);
        throw profileError;
      }
      
      console.log('Following profiles:', profileData);
      return profileData || [];
    },
    enabled: isOpen,
  });

  const handleUserClick = (userId: string) => {
    navigate(`/profile/${userId}`);
    onOpenChange(false);
  };

  const renderUserList = (users: any[], loading: boolean) => {
    if (loading) {
      return (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center space-x-3 p-3">
              <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-2/3" />
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (users.length === 0) {
      return (
        <div className="text-center py-12">
          <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2 dark:text-gray-400">
            No users found
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            {initialTab === 'followers' ? 'No followers yet' : 'Not following anyone yet'}
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {users.map((user) => (
          <div
            key={user.id}
            className="flex items-center space-x-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <Avatar className="w-12 h-12">
              <AvatarImage src={user.avatar_url || undefined} />
              <AvatarFallback>
                {user.full_name?.charAt(0) || user.email?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 dark:text-white truncate">
                {user.full_name || 'Unknown User'}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                {user.email}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleUserClick(user.id)}
              className="shrink-0"
            >
              View Profile
            </Button>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-center">
            {profileName}
          </DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue={initialTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="followers">
              Followers ({followers.length})
            </TabsTrigger>
            <TabsTrigger value="following">
              Following ({following.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="followers" className="mt-4 overflow-y-auto max-h-[50vh]">
            {renderUserList(followers, followersLoading)}
          </TabsContent>
          
          <TabsContent value="following" className="mt-4 overflow-y-auto max-h-[50vh]">
            {renderUserList(following, followingLoading)}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default FollowersDialog;