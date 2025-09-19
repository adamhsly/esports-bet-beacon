
import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EnhancedAvatar } from '@/components/ui/enhanced-avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useRewardsTrack } from '@/hooks/useRewardsTrack';
import { LogOut, User, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMemo } from 'react';

const UserMenu: React.FC = () => {
  const { user, signOut } = useAuth();
  const { profile } = useProfile();
  const { free, premium } = useRewardsTrack();

  // Get current avatar frame and border assets
  const currentFrameAsset = useMemo(() => {
    if (!profile?.avatar_frame_id) return null;
    const frameReward = [...free, ...premium].find(
      item => item.id === profile.avatar_frame_id && item.type === 'frame'
    );
    return frameReward?.assetUrl || null;
  }, [profile?.avatar_frame_id, JSON.stringify(free), JSON.stringify(premium)]);

  const currentBorderAsset = useMemo(() => {
    if (!profile?.avatar_border_id) return null;
    const borderReward = [...free, ...premium].find(
      item => item.id === profile.avatar_border_id && 
      item.value && 
      (item.value.toLowerCase().includes('border') || item.value.toLowerCase().includes('pulse'))
    );
    return borderReward?.assetUrl || null;
  }, [profile?.avatar_border_id, JSON.stringify(free), JSON.stringify(premium)]);

  const handleSignOut = async () => {
    await signOut();
  };

  if (!user) return null;

  const initials = user.email?.substring(0, 2).toUpperCase() || 'U';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <EnhancedAvatar
            src={profile?.avatar_url}
            fallback={initials}
            frameUrl={currentFrameAsset}
            borderUrl={currentBorderAsset}
            size="sm"
            className="h-8 w-8"
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 bg-theme-gray-medium border-theme-gray-light" align="end">
        <div className="flex items-center justify-start gap-2 p-2">
          <div className="flex flex-col space-y-1 leading-none">
            <p className="font-medium text-white">{user.email}</p>
          </div>
        </div>
        <DropdownMenuSeparator className="bg-theme-gray-light" />
        <DropdownMenuItem asChild>
          <Link to="/profile" className="text-gray-300 hover:text-white cursor-pointer">
            <User className="mr-2 h-4 w-4" />
            Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/fantasy" className="text-gray-300 hover:text-white cursor-pointer">
            <Settings className="mr-2 h-4 w-4" />
            Fantasy Teams
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-theme-gray-light" />
        <DropdownMenuItem 
          onClick={handleSignOut}
          className="text-gray-300 hover:text-white cursor-pointer"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserMenu;
