
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ApiKeyContextType {
  apiKey: string | null;
  setApiKey: (key: string) => void;
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
  const [apiKey, setApiKeyState] = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [inputApiKey, setInputApiKey] = useState('');
  
  useEffect(() => {
    // Check if we have an API key in localStorage
    const storedApiKey = localStorage.getItem('esports_odds_api_key');
    if (storedApiKey) {
      setApiKeyState(storedApiKey);
    } else {
      // If not, show dialog to enter API key
      setShowDialog(true);
    }
  }, []);
  
  const setApiKey = (key: string) => {
    localStorage.setItem('esports_odds_api_key', key);
    setApiKeyState(key);
  };
  
  const handleSaveApiKey = () => {
    if (inputApiKey.trim()) {
      setApiKey(inputApiKey.trim());
      setShowDialog(false);
    }
  };
  
  const handleSkip = () => {
    setShowDialog(false);
  };
  
  return (
    <ApiKeyContext.Provider value={{ apiKey, setApiKey }}>
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-theme-gray-dark border-theme-gray-light">
          <DialogHeader>
            <DialogTitle className="text-white">API Key Required</DialogTitle>
            <DialogDescription>
              To fetch real esports betting data, we need an API key from The Odds API.
              You can get a free API key by signing up at <a href="https://the-odds-api.com/" target="_blank" rel="noopener noreferrer" className="text-theme-purple hover:underline">the-odds-api.com</a>
            </DialogDescription>
          </DialogHeader>
          
          <div className="my-4">
            <Label htmlFor="apiKey">API Key</Label>
            <Input 
              id="apiKey" 
              placeholder="Enter your API key" 
              value={inputApiKey} 
              onChange={(e) => setInputApiKey(e.target.value)}
              className="bg-theme-gray-medium border-theme-gray-light text-white"
            />
          </div>
          
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={handleSkip} className="border-theme-gray-light text-gray-300">
              Skip (Use Sample Data)
            </Button>
            <Button onClick={handleSaveApiKey} className="bg-theme-purple hover:bg-theme-purple/90">
              Save API Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {children}
    </ApiKeyContext.Provider>
  );
};

export default ApiKeyProvider;
