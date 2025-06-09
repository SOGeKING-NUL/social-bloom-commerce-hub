
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { User, LogOut, Settings, ShoppingBag, UserCog } from 'lucide-react';

const UserProfileDropdown = () => {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const [initials, setInitials] = useState('');

  useEffect(() => {
    if (profile?.full_name) {
      const names = profile.full_name.split(' ');
      setInitials(
        names
          .map((n) => n.charAt(0))
          .join('')
          .toUpperCase()
          .substring(0, 2)
      );
    } else if (user?.email) {
      setInitials(user.email.charAt(0).toUpperCase());
    } else {
      setInitials('');
    }
  }, [user, profile]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative h-10 w-10 rounded-full"
        >
          <Avatar>
            {profile?.avatar_url ? (
              <AvatarImage src={profile.avatar_url} alt="Profile" />
            ) : (
              <AvatarFallback className="bg-pink-100 text-pink-800">
                {initials}
              </AvatarFallback>
            )}
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>My Account</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate('/dashboard')}>
          <User className="mr-2 h-4 w-4" />
          <span>Profile</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate('/dashboard')}>
          <ShoppingBag className="mr-2 h-4 w-4" />
          <span>Orders</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserProfileDropdown;
