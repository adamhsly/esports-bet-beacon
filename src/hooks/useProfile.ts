import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthUser } from './useAuthUser';
import { toast } from 'sonner';

interface Profile {
  id: string;
  username?: string;
  full_name?: string;
  avatar_url?: string;
  avatar_frame_id?: string;
  avatar_border_id?: string;
  country?: string;
  bio?: string;
  premium_pass?: boolean;
}

export const useProfile = () => {
  const { user, isAuthenticated } = useAuthUser();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchProfile();
    } else {
      setProfile(null);
      setLoading(false);
    }
  }, [isAuthenticated, user]);

  const fetchProfile = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const uploadAvatar = async (file: File): Promise<string | null> => {
    if (!user || !isAuthenticated) {
      toast.error('You must be logged in to upload an avatar');
      return null;
    }

    setUploading(true);

    try {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error('Please upload an image file');
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('File size must be less than 5MB');
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;
      const filePath = `${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { 
          upsert: true,
          contentType: file.type
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setProfile(prev => prev ? { ...prev, avatar_url: publicUrl } : null);
      toast.success('Avatar uploaded successfully!');
      
      return publicUrl;
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast.error(error.message || 'Failed to upload avatar');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const updateAvatarFrame = async (frameId: string) => {
    if (!user || !isAuthenticated) {
      toast.error('You must be logged in to update your avatar frame');
      return false;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_frame_id: frameId })
        .eq('id', user.id);

      if (error) throw error;

      setProfile(prev => prev ? { ...prev, avatar_frame_id: frameId } : null);
      toast.success('Avatar frame updated!');
      return true;
    } catch (error: any) {
      console.error('Error updating avatar frame:', error);
      toast.error(error.message || 'Failed to update avatar frame');
      return false;
    }
  };

  const updateAvatarBorder = async (borderId: string) => {
    if (!user || !isAuthenticated) {
      toast.error('You must be logged in to update your avatar border');
      return false;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_border_id: borderId })
        .eq('id', user.id);

      if (error) throw error;

      setProfile(prev => prev ? { ...prev, avatar_border_id: borderId } : null);
      toast.success('Avatar border updated!');
      return true;
    } catch (error: any) {
      console.error('Error updating avatar border:', error);
      toast.error(error.message || 'Failed to update avatar border');
      return false;
    }
  };

  return {
    profile,
    loading,
    uploading,
    uploadAvatar,
    updateAvatarFrame,
    updateAvatarBorder,
    refetch: fetchProfile
  };
};