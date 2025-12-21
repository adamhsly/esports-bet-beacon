import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthUser } from './useAuthUser';
import { toast } from 'sonner';
import { useProfileQuery, type ProfileData } from './useProfileQuery';

/**
 * Extended profile hook that wraps useProfileQuery and adds
 * upload/update functionality. Uses React Query for caching.
 */
export const useProfile = () => {
  const { user, isAuthenticated } = useAuthUser();
  const { profile, loading, refetch, premiumActive, hasPremium } = useProfileQuery();
  const [uploading, setUploading] = useState(false);

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

      // Refetch to update the cache
      await refetch();
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

      // Refetch to update the cache
      await refetch();
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

      // Refetch to update the cache
      await refetch();
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
    refetch,
    // Re-export premium status from useProfileQuery
    premiumActive,
    hasPremium
  };
};

// Re-export the ProfileData type
export type { ProfileData };