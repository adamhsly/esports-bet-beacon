
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface UseMatchNotificationsProps {
  matchId: string;
  matchStartTime: string;
}

export const useMatchNotifications = ({ matchId, matchStartTime }: UseMatchNotificationsProps) => {
  const { user } = useAuth();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  // Check subscription status on mount
  useEffect(() => {
    if (user && matchId) {
      checkSubscriptionStatus();
    } else {
      setIsChecking(false);
    }
  }, [user, matchId]);

  const checkSubscriptionStatus = async () => {
    try {
      setIsChecking(true);
      const { data, error } = await supabase.functions.invoke('manage-match-notification', {
        body: {
          matchId,
          matchStartTime,
          action: 'check'
        }
      });

      if (error) throw error;

      setIsSubscribed(data.subscribed);
    } catch (error) {
      console.error('Error checking subscription status:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const toggleNotification = async () => {
    if (!user) {
      // Redirect to auth page
      const currentPath = window.location.pathname;
      window.location.href = `/auth?redirect=${encodeURIComponent(currentPath)}`;
      return;
    }

    try {
      setIsLoading(true);
      const action = isSubscribed ? 'unsubscribe' : 'subscribe';

      const { data, error } = await supabase.functions.invoke('manage-match-notification', {
        body: {
          matchId,
          matchStartTime,
          action
        }
      });

      if (error) throw error;

      setIsSubscribed(data.subscribed);
      
      toast({
        title: data.subscribed ? "Notification Set" : "Notification Removed",
        description: data.subscribed 
          ? "You'll receive an email 15 minutes before the match starts"
          : "You won't receive notifications for this match",
      });

    } catch (error: any) {
      console.error('Error managing notification:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to manage notification",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isSubscribed,
    isLoading,
    isChecking,
    toggleNotification,
  };
};
