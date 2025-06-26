import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Users, 
  Search, 
  MessageCircle, 
  TrendingUp, 
  UserPlus,
  Crown,
  MoreVertical
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

const Groups = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("recent");
  const [filterBy, setFilterBy] = useState("all");

  // Fetch user's groups - both created and joined
  const { data: userGroups = [], isLoading } = useQuery({
    queryKey: ['user-groups-all', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      // Get groups created by user
      const { data: createdGroups, error: createdError } = await supabase
        .from('groups')
        .select('*')
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false });
      
      if (createdError) throw createdError;
      
      // Get groups user is a member of (via group_members table)
      const { data: membershipData, error: memberError } = await supabase
        .from('group_members')
        .select('group_id, joined_at')
        .eq('user_id', user.id);
      
      let joinedGroups: any[] = [];
      if (membershipData && membershipData.length > 0) {
        const memberGroupIds = membershipData.map(m => m.group_id);
        const { data: joinedGroupsData, error: joinedGroupsError } = await supabase
          .from('groups')
          .select('*')
          .in('id', memberGroupIds)
          .order('created_at', { ascending: false });
        
        if (joinedGroupsError) throw joinedGroupsError;
        joinedGroups = joinedGroupsData || [];
      }
      
      if (memberError) throw memberError;
      
      // Combine created groups and member groups
      const allGroups: any[] = [];
      
      // Add created groups (user is admin)
      if (createdGroups) {
        createdGroups.forEach(group => {
          allGroups.push({
            id: group.id,
            groups: group,
            created_at: group.created_at,
            status: 'admin',
            role: 'admin'
          });
        });
      }
      
      // Add member groups (user is member)
      if (joinedGroups) {
        joinedGroups.forEach(group => {
          // Don't duplicate if user is already listed as creator
          const isAlreadyListed = allGroups.some(g => g.groups.id === group.id);
          if (!isAlreadyListed) {
            const membershipInfo = membershipData?.find(m => m.group_id === group.id);
            allGroups.push({
              id: group.id,
              groups: group,
              created_at: membershipInfo?.joined_at || group.created_at,
              status: 'member',
              role: 'member'
            });
          }
        });
      }
      
      return allGroups;
    },
    enabled: !!user?.id
  });

  // Simple analytics with placeholder data
  const analytics = useMemo(() => {
    const postsCounts: any = {};
    const recentCounts: any = {};
    
    userGroups.forEach(ug => {
      postsCounts[ug.groups.id] = Math.floor(Math.random() * 20) + 1;
      recentCounts[ug.groups.id] = Math.floor(Math.random() * 5);
    });
    
    return { postsCounts, recentCounts };
  }, [userGroups]);

  // Filter and sort groups
  const filteredAndSortedGroups = useMemo(() => {
    let filtered = userGroups.filter(ug => {
      const group = ug.groups;
      const matchesSearch = group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           group.description?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesFilter = filterBy === "all" || 
                           (filterBy === "admin" && ug.status === "admin") ||
                           (filterBy === "member" && ug.status === "member") ||
                           (filterBy === "private" && group.is_private === true) ||
                           (filterBy === "public" && group.is_private === false);
      
      return matchesSearch && matchesFilter;
    });

    // Sort groups
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "recent":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "name":
          return a.groups.name.localeCompare(b.groups.name);
        case "members":
          return (b.groups.max_members || 0) - (a.groups.max_members || 0);
        case "activity":
          const aActivity = analytics.recentCounts?.[a.groups.id] || 0;
          const bActivity = analytics.recentCounts?.[b.groups.id] || 0;
          return bActivity - aActivity;
        default:
          return 0;
      }
    });

    return filtered;
  }, [userGroups, searchTerm, sortBy, filterBy, analytics]);

  // Calculate overall analytics
  const overallStats = useMemo(() => {
    const totalGroups = userGroups.length;
    const adminGroups = userGroups.filter(ug => ug.status === "admin").length;
    const totalMembers = userGroups.reduce((sum, ug) => sum + (ug.groups.max_members || 0), 0);
    const totalPosts = Object.values(analytics.postsCounts || {}).reduce((sum: number, count: any) => sum + count, 0);
    
    return { totalGroups, adminGroups, totalMembers, totalPosts };
  }, [userGroups, analytics]);

  const handleGroupClick = (groupId: string) => {
    navigate(`/groups/${groupId}`);
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg h-48"></div>
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-white to-pink-50 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">My Groups</h1>
            <p className="text-gray-600 dark:text-gray-300">Manage and explore your community groups</p>
          </div>

          {/* Analytics Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card className="smooth-card dark:bg-gray-800 dark:border-gray-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Total Groups</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{overallStats.totalGroups}</p>
                  </div>
                  <Users className="w-8 h-8 text-pink-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="smooth-card dark:bg-gray-800 dark:border-gray-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Admin Roles</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{overallStats.adminGroups}</p>
                  </div>
                  <Crown className="w-8 h-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="smooth-card dark:bg-gray-800 dark:border-gray-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Total Members</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{overallStats.totalMembers}</p>
                  </div>
                  <UserPlus className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="smooth-card dark:bg-gray-800 dark:border-gray-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Total Posts</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{overallStats.totalPosts}</p>
                  </div>
                  <MessageCircle className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters and Search */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search groups..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 smooth-card dark:bg-gray-700 dark:border-gray-600"
              />
            </div>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full md:w-48 smooth-card dark:bg-gray-700 dark:border-gray-600">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Recently Created</SelectItem>
                <SelectItem value="name">Name A-Z</SelectItem>
                <SelectItem value="members">Most Members</SelectItem>
                <SelectItem value="activity">Most Active</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterBy} onValueChange={setFilterBy}>
              <SelectTrigger className="w-full md:w-48 smooth-card dark:bg-gray-700 dark:border-gray-600">
                <SelectValue placeholder="Filter by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Groups</SelectItem>
                <SelectItem value="admin">Admin Role</SelectItem>
                <SelectItem value="member">Member Role</SelectItem>
                <SelectItem value="public">Public Groups</SelectItem>
                <SelectItem value="private">Private Groups</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Groups Grid */}
          {filteredAndSortedGroups.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-300 mb-2">
                {searchTerm ? "No groups found" : "No groups yet"}
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                {searchTerm ? "Try adjusting your search or filters" : "Create or join some groups to get started!"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAndSortedGroups.map((userGroup) => {
                const group = userGroup.groups;
                const postsCount = analytics.postsCounts?.[group.id] || 0;
                const recentActivity = analytics.recentCounts?.[group.id] || 0;

                return (
                  <Card
                    key={userGroup.id}
                    className="smooth-card hover:shadow-lg transition-all duration-300 cursor-pointer dark:bg-gray-800 dark:border-gray-700"
                    onClick={() => handleGroupClick(group.id)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          {group.image_url ? (
                            <Avatar className="w-12 h-12">
                              <AvatarImage src={group.image_url} />
                              <AvatarFallback>{group.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                          ) : (
                            <div className="w-12 h-12 bg-gradient-to-br from-pink-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                              {group.name.charAt(0)}
                            </div>
                          )}
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 dark:text-white truncate">{group.name}</h3>
                            <div className="flex items-center space-x-2">
                              <Badge
                                variant={userGroup.status === "admin" ? "default" : "secondary"}
                                className="text-xs"
                              >
                                {userGroup.status === "admin" ? "Admin" : "Member"}
                              </Badge>
                              <Badge
                                variant={group.is_private ? "outline" : "secondary"}
                                className="text-xs"
                              >
                                {group.is_private ? "Private" : "Public"}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" className="text-gray-400">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardHeader>

                    <CardContent className="pt-0">
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 line-clamp-2">
                        {group.description || "No description available"}
                      </p>

                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-lg font-semibold text-gray-900 dark:text-white">{group.max_members || 0}</p>
                          <p className="text-xs text-gray-500">Max Members</p>
                        </div>
                        <div>
                          <p className="text-lg font-semibold text-gray-900 dark:text-white">{postsCount}</p>
                          <p className="text-xs text-gray-500">Posts</p>
                        </div>
                        <div>
                          <p className="text-lg font-semibold text-gray-900 dark:text-white">{recentActivity}</p>
                          <p className="text-xs text-gray-500">This Week</p>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                        <span>Created {new Date(userGroup.created_at).toLocaleDateString()}</span>
                        {recentActivity > 0 && (
                          <div className="flex items-center text-green-600">
                            <TrendingUp className="w-3 h-3 mr-1" />
                            Active
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Groups;