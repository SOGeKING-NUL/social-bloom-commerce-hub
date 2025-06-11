
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Heart, MessageCircle, Share2, Users, Package, ArrowLeft, Edit, Camera } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const Profile = () => {
  const navigate = useNavigate();
  const { user, profile, updateProfile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    full_name: profile?.full_name || '',
    avatar_url: profile?.avatar_url || '',
  });

  // Fetch user's posts with metrics
  const { data: posts = [] } = useQuery({
    queryKey: ['user-posts', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch user's groups
  const { data: userGroups = [] } = useQuery({
    queryKey: ['user-groups', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('groups')
        .select(`
          *,
          product:products!product_id (
            name,
            image_url
          ),
          group_members (
            user_id
          )
        `)
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch user's orders
  const { data: orders = [] } = useQuery({
    queryKey: ['user-orders', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            products (
              name,
              image_url
            )
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      const { error } = await updateProfile(profileForm);
      if (error) throw error;
    },
    onSuccess: () => {
      setEditingProfile(false);
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast({ title: "Profile updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Get post metrics
  const getTopPosts = () => {
    return [...posts]
      .sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0))
      .slice(0, 3);
  };

  const getMostViewedPosts = () => {
    return [...posts]
      .sort((a, b) => (b.views_count || 0) - (a.views_count || 0))
      .slice(0, 3);
  };

  const totalLikes = posts.reduce((sum, post) => sum + (post.likes_count || 0), 0);
  const totalViews = posts.reduce((sum, post) => sum + (post.views_count || 0), 0);
  const totalComments = posts.reduce((sum, post) => sum + (post.comments_count || 0), 0);

  return (
    <div className="min-h-screen">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center mb-6">
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
              className="mr-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <h1 className="text-3xl font-bold">My Profile</h1>
          </div>

          {/* Profile Header */}
          <Card className="mb-8">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-start md:items-center space-y-4 md:space-y-0 md:space-x-6">
                <div className="relative">
                  <Avatar className="w-24 h-24">
                    <AvatarImage src={profile?.avatar_url} />
                    <AvatarFallback className="text-2xl">
                      {profile?.full_name?.charAt(0) || profile?.email?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  {editingProfile && (
                    <Button
                      size="sm"
                      className="absolute -bottom-2 -right-2 rounded-full"
                    >
                      <Camera className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                <div className="flex-1">
                  {editingProfile ? (
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="full_name">Full Name</Label>
                        <Input
                          id="full_name"
                          value={profileForm.full_name}
                          onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={() => updateProfileMutation.mutate()}>
                          Save Changes
                        </Button>
                        <Button variant="outline" onClick={() => setEditingProfile(false)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <h2 className="text-2xl font-bold">{profile?.full_name || 'User'}</h2>
                      <p className="text-gray-600">{profile?.email}</p>
                      <p className="text-sm text-gray-500 capitalize">{profile?.role}</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingProfile(true)}
                        className="mt-2"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Profile
                      </Button>
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-pink-600">{posts.length}</div>
                    <div className="text-sm text-gray-600">Posts</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-pink-600">{userGroups.length}</div>
                    <div className="text-sm text-gray-600">Groups</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-pink-600">{orders.length}</div>
                    <div className="text-sm text-gray-600">Orders</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Content Tabs */}
          <Tabs defaultValue="posts" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="posts">My Posts</TabsTrigger>
              <TabsTrigger value="groups">My Groups</TabsTrigger>
              <TabsTrigger value="orders">My Orders</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="posts">
              <Card>
                <CardHeader>
                  <CardTitle>My Posts ({posts.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {posts.map((post) => (
                      <div key={post.id} className="border rounded-lg p-4">
                        <p className="mb-3">{post.content}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Heart className="w-4 h-4" />
                            {post.likes_count || 0}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageCircle className="w-4 h-4" />
                            {post.comments_count || 0}
                          </span>
                          <span className="flex items-center gap-1">
                            <Share2 className="w-4 h-4" />
                            {post.shares_count || 0}
                          </span>
                          <span>👁 {post.views_count || 0} views</span>
                          <span className="ml-auto">
                            {new Date(post.created_at!).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))}
                    {posts.length === 0 && (
                      <p className="text-center text-gray-500 py-8">No posts yet. Start sharing!</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="groups">
              <Card>
                <CardHeader>
                  <CardTitle>Groups I Created ({userGroups.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {userGroups.map((group) => (
                      <div key={group.id} className="border rounded-lg p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <img 
                            src={group.product?.image_url || "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=80&h=80&fit=crop"}
                            alt={group.product?.name}
                            className="w-12 h-12 rounded object-cover"
                          />
                          <div>
                            <h4 className="font-medium">{group.name}</h4>
                            <p className="text-sm text-gray-600">{group.product?.name}</p>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mb-2 line-clamp-2">{group.description}</p>
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            {group.group_members?.length || 0} members
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/groups/${group.id}`)}
                          >
                            View
                          </Button>
                        </div>
                      </div>
                    ))}
                    {userGroups.length === 0 && (
                      <p className="text-center text-gray-500 py-8 col-span-full">No groups created yet</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="orders">
              <Card>
                <CardHeader>
                  <CardTitle>Order History ({orders.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {orders.map((order) => (
                      <div key={order.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-medium">Order #{order.id.slice(0, 8)}</h4>
                            <p className="text-sm text-gray-600">Status: {order.status}</p>
                            <p className="text-sm text-gray-600">
                              Date: {new Date(order.created_at!).toLocaleDateString()}
                            </p>
                          </div>
                          <p className="text-lg font-semibold">${order.total_amount}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {order.order_items?.map((item: any) => (
                            <div key={item.id} className="flex items-center gap-2 bg-gray-50 rounded p-2">
                              <img 
                                src={item.products?.image_url || "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=40&h=40&fit=crop"}
                                alt={item.products?.name}
                                className="w-8 h-8 rounded object-cover"
                              />
                              <span className="text-sm">{item.products?.name} x{item.quantity}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    {orders.length === 0 && (
                      <p className="text-center text-gray-500 py-8">No orders yet</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analytics">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Overall stats */}
                <Card>
                  <CardHeader>
                    <CardTitle>Overall Stats</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span>Total Likes:</span>
                      <span className="font-bold text-pink-600">{totalLikes}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Views:</span>
                      <span className="font-bold text-pink-600">{totalViews}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Comments:</span>
                      <span className="font-bold text-pink-600">{totalComments}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Top posts */}
                <Card>
                  <CardHeader>
                    <CardTitle>Most Liked Posts</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {getTopPosts().map((post, index) => (
                        <div key={post.id} className="flex items-center gap-2">
                          <span className="text-sm font-bold text-pink-600">#{index + 1}</span>
                          <span className="text-sm truncate">{post.content}</span>
                          <span className="text-xs text-gray-500 ml-auto">{post.likes_count} ❤️</span>
                        </div>
                      ))}
                      {getTopPosts().length === 0 && (
                        <p className="text-sm text-gray-500">No posts yet</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Most viewed posts */}
                <Card>
                  <CardHeader>
                    <CardTitle>Most Viewed Posts</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {getMostViewedPosts().map((post, index) => (
                        <div key={post.id} className="flex items-center gap-2">
                          <span className="text-sm font-bold text-pink-600">#{index + 1}</span>
                          <span className="text-sm truncate">{post.content}</span>
                          <span className="text-xs text-gray-500 ml-auto">{post.views_count} 👁</span>
                        </div>
                      ))}
                      {getMostViewedPosts().length === 0 && (
                        <p className="text-sm text-gray-500">No posts yet</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Profile;
