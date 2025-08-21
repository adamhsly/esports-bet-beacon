import { useAuth } from '@/contexts/AuthContext';

export const useAuthUser = () => {
  const { user, session, loading } = useAuth();
  
  return {
    user,
    session,
    loading,
    isAuthenticated: !!user
  };
};