import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CaretLeft } from "@phosphor-icons/react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import UserProfileHeader from "@/components/UserProfileHeader";
import SocialProfileTabs from "@/components/SocialProfileTabs";

const UserProfile = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user, profile: currentUserProfile, updateProfile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    bio: '',
    website: '',
    location: '',
    avatar_url: '',
  });

  const isOwnProfile = userId === user?.id || !userId;
  const profileUserId = userId || user?.id || '';

  // Fetch user profile
  const { data: profile, isLoading } = useQuery({
    queryKey: ['user-profile', profileUserId],
    queryFn: async () => {
      if (!profileUserId) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profileUserId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!profileUserId,
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      const { error } = await updateProfile(profileForm);
      if (error) throw error;
    },
    onSuccess: () => {
      setEditingProfile(false);
      queryClient.invalidateQueries({ queryKey: ['user-profile', profileUserId] });
      toast({ title: "Profile updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleEditProfile = () => {
    setProfileForm({
      full_name: profile?.full_name || '',
      bio: profile?.bio || '',
      website: profile?.website || '',
      location: profile?.location || '',
      avatar_url: profile?.avatar_url || '',
    });
    setEditingProfile(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen ">
        <Header />
        <motion.div
          className="max-w-4xl md:max-w-5xl mx-auto px-4 py-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        >
          <div className="animate-pulse space-y-6">
            <div className="flex items-center gap-6">
              <div className="w-32 h-32 bg-gray-200 rounded-full"></div>
              <div className="space-y-3">
                <div className="h-6 bg-gray-200 rounded w-48"></div>
                <div className="h-4 bg-gray-200 rounded w-32"></div>
                <div className="h-4 bg-gray-200 rounded w-64"></div>
              </div>
            </div>
          </div>
        </motion.div>
        <Footer />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen">
        <Header />
        <motion.div
          className="max-w-4xl md:max-w-5xl mx-auto px-4 py-12 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-3xl font-bold text-gray-900 mb-6">User not found</h1>
          <Button
            onClick={() => navigate(-1)}
            variant="outline"
            className="flex items-center gap-2 px-6 py-3 rounded-xl border-2 border-pink-500 text-pink-500 hover:bg-pink-50 transition-all duration-300"
          >
            <CaretLeft size={20} />
            Go Back
          </Button>
        </motion.div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen ">
      <Header />
      <motion.div
        className="mt-8 mx-auto px-4 py-12"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        <UserProfileHeader
          profileUserId={profileUserId}
          profile={profile}
          isOwnProfile={isOwnProfile}
          onEditProfile={handleEditProfile}
        />
        <motion.div
          className="py-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <SocialProfileTabs profileUserId={profileUserId} isOwnProfile={isOwnProfile} />
        </motion.div>

        {/* Edit Profile Dialog */}
        <Dialog open={editingProfile} onOpenChange={setEditingProfile}>
          <DialogContent className="max-w-md md:max-w-lg rounded-2xl p-6 bg-white shadow-lg border border-pink-100">
            <DialogHeader>
              <DialogTitle className="text-2xl font-extrabold text-gray-900">Edit Profile</DialogTitle>
            </DialogHeader>
            <motion.div
              className="space-y-5"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div>
                <Label htmlFor="full_name" className="text-gray-700 font-medium">
                  Full Name
                </Label>
                <Input
                  id="full_name"
                  value={profileForm.full_name}
                  onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                  className="mt-2 p-3 rounded-xl border-2 border-pink-200 focus:border-pink-500 focus:ring-2 focus:ring-pink-200 transition-all duration-300"
                />
              </div>
              <div>
                <Label htmlFor="bio" className="text-gray-700 font-medium">
                  Bio
                </Label>
                <Textarea
                  id="bio"
                  value={profileForm.bio}
                  onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                  placeholder="Tell us about yourself..."
                  rows={4}
                  className="mt-2 p-3 rounded-xl border-2 border-pink-200 focus:border-pink-500 focus:ring-2 focus:ring-pink-200 transition-all duration-300"
                />
              </div>
              <div>
                <Label htmlFor="website" className="text-gray-700 font-medium">
                  Website
                </Label>
                <Input
                  id="website"
                  type="url"
                  value={profileForm.website}
                  onChange={(e) => setProfileForm({ ...profileForm, website: e.target.value })}
                  placeholder="https://yourwebsite.com"
                  className="mt-2 p-3 rounded-xl border-2 border-pink-200 focus:border-pink-500 focus:ring-2 focus:ring-pink-200 transition-all duration-300"
                />
              </div>
              <div>
                <Label htmlFor="location" className="text-gray-700 font-medium">
                  Location
                </Label>
                <Input
                  id="location"
                  value={profileForm.location}
                  onChange={(e) => setProfileForm({ ...profileForm, location: e.target.value })}
                  placeholder="City, Country"
                  className="mt-2 p-3 rounded-xl border-2 border-pink-200 focus:border-pink-500 focus:ring-2 focus:ring-pink-200 transition-all duration-300"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={() => updateProfileMutation.mutate()}
                  disabled={updateProfileMutation.isPending}
                  className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white font-semibold hover:from-pink-600 hover:to-rose-600 transition-all duration-300"
                >
                  {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setEditingProfile(false)}
                  className="flex-1 px-6 py-3 rounded-xl border-2 border-pink-500 text-pink-500 hover:bg-pink-50 transition-all duration-300"
                >
                  Cancel
                </Button>
              </div>
            </motion.div>
          </DialogContent>
        </Dialog>
      </motion.div>
      <Footer />
    </div>
  );
};

export default UserProfile;