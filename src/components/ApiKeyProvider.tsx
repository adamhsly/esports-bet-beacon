import React, { createContext, useContext } from 'react';

interface ApiKeyContextType {
  sportDevsApiKey: string;
}

// We'll keep using this API key but with the correct authorization format
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
