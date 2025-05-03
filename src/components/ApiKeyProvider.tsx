
import React, { createContext, useContext, useState, useEffect } from 'react';

interface ApiKeyContextType {
  oddsApiKey: string | null;
  pandaScoreApiKey: string | null;
  setOddsApiKey: (key: string) => void;
  setPandaScoreApiKey: (key: string) => void;
}

const ApiKeyContext = createContext<ApiKeyContextType | undefined>(undefined);

export const useApiKey = () => {
  const context = useContext(ApiKeyContext);
  if (!context) {
    throw new Error('useApiKey must be used within an ApiKeyProvider');
  }
  return context;
};

interface ApiKeyProviderProps {
  children: React.ReactNode;
}

const ApiKeyProvider: React.FC<ApiKeyProviderProps> = ({ children }) => {
  // Default API keys
  const DEFAULT_ODDS_API_KEY = "768be4d279716fba14e362e3e9ce039c";
  const DEFAULT_PANDASCORE_API_KEY = "kYJELuXydUWktzw8lPtGygWUKp7K6nB8pM2k8-sITtzcqLG4OHk";
  
  const [oddsApiKey, setOddsApiKeyState] = useState<string | null>(DEFAULT_ODDS_API_KEY);
  const [pandaScoreApiKey, setPandaScoreApiKeyState] = useState<string | null>(DEFAULT_PANDASCORE_API_KEY);
  
  useEffect(() => {
    // Check if we have API keys in localStorage or set defaults
    const storedOddsApiKey = localStorage.getItem('esports_odds_api_key') || DEFAULT_ODDS_API_KEY;
    const storedPandaScoreApiKey = localStorage.getItem('esports_pandascore_api_key') || DEFAULT_PANDASCORE_API_KEY;
    
    // Set API keys in state and localStorage
    setOddsApiKeyState(storedOddsApiKey);
    localStorage.setItem('esports_odds_api_key', storedOddsApiKey);
    
    setPandaScoreApiKeyState(storedPandaScoreApiKey);
    localStorage.setItem('esports_pandascore_api_key', storedPandaScoreApiKey);
  }, []);
  
  const setOddsApiKey = (key: string) => {
    localStorage.setItem('esports_odds_api_key', key);
    setOddsApiKeyState(key);
  };
  
  const setPandaScoreApiKey = (key: string) => {
    localStorage.setItem('esports_pandascore_api_key', key);
    setPandaScoreApiKeyState(key);
  };
  
  return (
    <ApiKeyContext.Provider 
      value={{ 
        oddsApiKey, 
        pandaScoreApiKey, 
        setOddsApiKey, 
        setPandaScoreApiKey 
      }}
    >
      {children}
    </ApiKeyContext.Provider>
  );
};

export default ApiKeyProvider;
