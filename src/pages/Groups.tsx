
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Lock, Plus, Search, ShoppingBag } from "lucide-react";
import Header from "@/components/Header";
import { useToast } from "@/hooks/use-toast";

const Groups = () => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupBrand, setNewGroupBrand] = useState("");

  const [groups, setGroups] = useState([
    {
      id: 1,
      name: "Premium Skincare Circle",
      brand: "GlowUp Beauty",
      members: 24,
      image: "https://images.unsplash.com/photo-1618160702438-9b02ab6515c9?w=300&h=200&fit=crop",
      description: "Exclusive access to premium skincare products and early releases",
      isJoined: false
    },
    {
      id: 2,
      name: "Home Decor Enthusiasts",
      brand: "Modern Living Co",
      members: 18,
      image: "https://images.unsplash.com/photo-1721322800607-8c38375eef04?w=300&h=200&fit=crop",
      description: "Curated home decor items for the modern lifestyle",
      isJoined: true
    },
    {
      id: 3,
      name: "Pet Parents United",
      brand: "PawPerfect",
      members: 32,
      image: "https://images.unsplash.com/photo-1582562124811-c09040d0a901?w=300&h=200&fit=crop",
      description: "Premium pet products for our furry family members",
      isJoined: false
    }
  ]);

  const handleJoinGroup = (groupId: number) => {
    setGroups(groups.map(group => 
      group.id === groupId 
        ? { 
            ...group, 
            isJoined: !group.isJoined,
            members: group.isJoined ? group.members - 1 : group.members + 1
          }
        : group
    ));
    
    const group = groups.find(g => g.id === groupId);
    toast({
      title: group?.isJoined ? "Left Group" : "Joined Group!",
      description: group?.isJoined 
        ? `You left ${group.name}` 
        : `Welcome to ${group?.name}!`,
    });
  };

  const handleCreateGroup = () => {
    if (newGroupName.trim() && newGroupBrand.trim()) {
      const newGroup = {
        id: groups.length + 1,
        name: newGroupName,
        brand: newGroupBrand,
        members: 1,
        image: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=300&h=200&fit=crop",
        description: "A new shopping group for exclusive products",
        isJoined: true
      };
      
      setGroups([newGroup, ...groups]);
      setNewGroupName("");
      setNewGroupBrand("");
      setShowCreateForm(false);
      
      toast({
        title: "Group Created!",
        description: `${newGroupName} has been created successfully.`,
      });
    }
  };

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    group.brand.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-pink-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Shopping Groups</h1>
            <p className="text-xl text-gray-600">Join exclusive groups and shop with your community</p>
          </div>

          {/* Search and Create */}
          <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search groups or brands..."
                className="pl-10 border-pink-200 focus:ring-pink-300"
              />
            </div>
            <Button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="social-button bg-gradient-to-r from-pink-500 to-rose-400 hover:from-pink-600 hover:to-rose-500"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create Group
            </Button>
          </div>

          {/* Create Group Form */}
          {showCreateForm && (
            <div className="smooth-card p-6 mb-8 animate-fade-in">
              <h3 className="text-xl font-semibold mb-4">Create New Group</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <Input
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="Group name"
                  className="border-pink-200 focus:ring-pink-300"
                />
                <Input
                  value={newGroupBrand}
                  onChange={(e) => setNewGroupBrand(e.target.value)}
                  placeholder="Brand name"
                  className="border-pink-200 focus:ring-pink-300"
                />
              </div>
              <div className="flex gap-4">
                <Button
                  onClick={handleCreateGroup}
                  className="social-button bg-gradient-to-r from-pink-500 to-rose-400 hover:from-pink-600 hover:to-rose-500"
                >
                  Create Group
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowCreateForm(false)}
                  className="border-pink-200 text-pink-600 hover:bg-pink-50"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Groups Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredGroups.map((group) => (
              <div key={group.id} className="smooth-card overflow-hidden floating-card animate-fade-in">
                <div className="relative">
                  <img 
                    src={group.image} 
                    alt={group.name}
                    className="w-full h-48 object-cover cursor-pointer hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-full p-2">
                    <Lock className="w-4 h-4 text-pink-500" />
                  </div>
                  {group.isJoined && (
                    <div className="absolute top-4 left-4 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                      Joined
                    </div>
                  )}
                </div>
                
                <div className="p-6">
                  <h3 className="text-xl font-semibold mb-2">{group.name}</h3>
                  <p className="text-pink-600 font-medium mb-2">{group.brand}</p>
                  <p className="text-gray-600 text-sm mb-4">{group.description}</p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-gray-500">
                      <Users className="w-4 h-4 mr-1" />
                      <span className="text-sm">{group.members} members</span>
                    </div>
                    <Button 
                      size="sm" 
                      onClick={() => handleJoinGroup(group.id)}
                      variant={group.isJoined ? "outline" : "default"}
                      className={group.isJoined 
                        ? "border-pink-200 text-pink-600 hover:bg-pink-50" 
                        : "social-button bg-gradient-to-r from-pink-500 to-rose-400 hover:from-pink-600 hover:to-rose-500"
                      }
                    >
                      {group.isJoined ? "Leave" : "Join Group"}
                    </Button>
                  </div>
                  
                  {group.isJoined && (
                    <Button 
                      size="sm" 
                      variant="ghost"
                      className="w-full mt-3 text-pink-600 hover:bg-pink-50"
                    >
                      <ShoppingBag className="w-4 h-4 mr-2" />
                      View Products
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {filteredGroups.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">No groups found</h3>
              <p className="text-gray-500">Try searching with different keywords or create a new group.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Groups;
