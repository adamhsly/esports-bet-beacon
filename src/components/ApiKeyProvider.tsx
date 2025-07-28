
import React, { createContext, useContext } from 'react';

interface ApiKeyContextType {
  sportDevsApiKey: string;
}

// SECURITY: API key moved to secure edge function - no longer exposed in frontend

const ApiKeyContext = createContext<ApiKeyContextType>({
  sportDevsApiKey: '', // Removed hardcoded key for security
});

export const useApiKey = () => {
  return useContext(ApiKeyContext);
};

interface ApiKeyProviderProps {
  children: React.ReactNode;
}

const ApiKeyProvider: React.FC<ApiKeyProviderProps> = ({ children }) => {
  return (
    <ApiKeyContext.Provider 
      value={{ 
        sportDevsApiKey: '' // API calls should now go through secure edge functions
      }}
    >
      {children}
    </ApiKeyContext.Provider>
  );
};

export default ApiKeyProvider;
