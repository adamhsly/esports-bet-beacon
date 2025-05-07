
import React, { createContext, useContext } from 'react';

interface ApiKeyContextType {
  sportDevsApiKey: string;
}

const API_KEY = "GsZ3ovnDw0umMvL5p7SfPA";

const ApiKeyContext = createContext<ApiKeyContextType>({
  sportDevsApiKey: API_KEY,
});

export const useApiKey = () => {
  return useContext(ApiKeyContext);
};

interface ApiKeyProviderProps {
  children: React.ReactNode;
}

const ApiKeyProvider: React.FC<ApiKeyProviderProps> = ({ children }) => {
  // The API key is now hardcoded as requested
  return (
    <ApiKeyContext.Provider 
      value={{ 
        sportDevsApiKey: API_KEY
      }}
    >
      {children}
    </ApiKeyContext.Provider>
  );
};

export default ApiKeyProvider;
