
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
    console.log('🔔 Toggle notification clicked', { 
      user: user?.id, 
      matchId, 
      matchStartTime,
      isSubscribed 
    });

    if (!user) {
      console.log('🔔 User not authenticated, showing toast and redirecting');
      toast({
        title: "Authentication Required",
        description: "Please sign in to set match notifications",
        variant: "default",
      });
      
      // Small delay so user sees the toast before redirect
      setTimeout(() => {
        const currentPath = window.location.pathname;
        window.location.href = `/auth?redirect=${encodeURIComponent(currentPath)}`;
      }, 1000);
      return;
    }

    try {
      setIsLoading(true);
      const action = isSubscribed ? 'unsubscribe' : 'subscribe';
      
      console.log('🔔 Invoking edge function', { action, matchId, matchStartTime });

      const { data, error } = await supabase.functions.invoke('manage-match-notification', {
        body: {
          matchId,
          matchStartTime,
          action
        }
      });

      console.log('🔔 Edge function response', { data, error });

      if (error) {
        console.error('🔔 Edge function error:', error);
        throw new Error(error.message || 'Failed to manage notification');
      }

      if (!data) {
        console.error('🔔 No data returned from edge function');
        throw new Error('No response from server');
      }

      if (typeof data.subscribed !== 'boolean') {
        console.error('🔔 Invalid response structure:', data);
        throw new Error('Invalid server response');
      }

      setIsSubscribed(data.subscribed);
      
      toast({
        title: data.subscribed ? "Notification Set" : "Notification Removed",
        description: data.subscribed 
          ? "You'll receive an email 15 minutes before the match starts"
          : "You won't receive notifications for this match",
      });

    } catch (error: any) {
      console.error('🔔 Error managing notification:', error);
      
      // Provide more specific error messages
      let errorMessage = "Failed to manage notification";
      
      if (error.message?.includes('fetch')) {
        errorMessage = "Network error. Please check your connection and try again.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      console.log('🔔 Toggle notification completed');
    }
  };

  // Debug authentication state
  useEffect(() => {
    console.log('🔔 Authentication state:', { 
      user: user?.id, 
      matchId, 
      matchStartTime,
      isChecking,
      isSubscribed 
    });
  }, [user, matchId, matchStartTime, isChecking, isSubscribed]);

  return {
    isSubscribed,
    isLoading,
    isChecking,
    toggleNotification,
  };
};
