
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
  const [oddsApiKey, setOddsApiKeyState] = useState<string | null>(null);
  const [pandaScoreApiKey, setPandaScoreApiKeyState] = useState<string | null>(
    "kYJELuXydUWktzw8lPtGygWUKp7K6nB8pM2k8-sITtzcqLG4OHk" // Default PandaScore API key
  );
  const [showDialog, setShowDialog] = useState(false);
  const [inputOddsApiKey, setInputOddsApiKey] = useState('');
  const [inputPandaScoreApiKey, setInputPandaScoreApiKey] = useState('kYJELuXydUWktzw8lPtGygWUKp7K6nB8pM2k8-sITtzcqLG4OHk');
  const [activeTab, setActiveTab] = useState('odds-api');
  
  useEffect(() => {
    // Check if we have API keys in localStorage
    const storedOddsApiKey = localStorage.getItem('esports_odds_api_key');
    const storedPandaScoreApiKey = localStorage.getItem('esports_pandascore_api_key') || "kYJELuXydUWktzw8lPtGygWUKp7K6nB8pM2k8-sITtzcqLG4OHk";
    
    if (storedOddsApiKey) {
      setOddsApiKeyState(storedOddsApiKey);
    }
    
    if (storedPandaScoreApiKey) {
      setPandaScoreApiKeyState(storedPandaScoreApiKey);
    } else {
      // Store the default PandaScore API key
      localStorage.setItem('esports_pandascore_api_key', "kYJELuXydUWktzw8lPtGygWUKp7K6nB8pM2k8-sITtzcqLG4OHk");
    }
    
    // If no Odds API key, show dialog
    if (!storedOddsApiKey) {
      setShowDialog(true);
    }
  }, []);
  
  const setOddsApiKey = (key: string) => {
    localStorage.setItem('esports_odds_api_key', key);
    setOddsApiKeyState(key);
  };
  
  const setPandaScoreApiKey = (key: string) => {
    localStorage.setItem('esports_pandascore_api_key', key);
    setPandaScoreApiKeyState(key);
  };
  
  const handleSaveApiKey = () => {
    if (activeTab === 'odds-api' && inputOddsApiKey.trim()) {
      setOddsApiKey(inputOddsApiKey.trim());
    }
    
    if (activeTab === 'pandascore-api' && inputPandaScoreApiKey.trim()) {
      setPandaScoreApiKey(inputPandaScoreApiKey.trim());
    }
    
    setShowDialog(false);
  };
  
  const handleSkip = () => {
    setShowDialog(false);
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
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-theme-gray-dark border-theme-gray-light">
          <DialogHeader>
            <DialogTitle className="text-white">API Keys</DialogTitle>
            <DialogDescription>
              We use multiple APIs to fetch esports data. You can configure your API keys below.
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="odds-api" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="odds-api">The Odds API</TabsTrigger>
              <TabsTrigger value="pandascore-api">PandaScore API</TabsTrigger>
            </TabsList>
            
            <TabsContent value="odds-api">
              <div className="my-4">
                <Label htmlFor="oddsApiKey">The Odds API Key</Label>
                <Input 
                  id="oddsApiKey" 
                  placeholder="Enter your API key" 
                  value={inputOddsApiKey} 
                  onChange={(e) => setInputOddsApiKey(e.target.value)}
                  className="bg-theme-gray-medium border-theme-gray-light text-white"
                />
                <p className="text-xs mt-2 text-gray-400">
                  To fetch real esports betting odds, we need an API key from The Odds API.
                  You can get a free API key by signing up at <a href="https://the-odds-api.com/" target="_blank" rel="noopener noreferrer" className="text-theme-purple hover:underline">the-odds-api.com</a>
                </p>
              </div>
            </TabsContent>
            
            <TabsContent value="pandascore-api">
              <div className="my-4">
                <Label htmlFor="pandaScoreApiKey">PandaScore API Key</Label>
                <Input 
                  id="pandaScoreApiKey" 
                  placeholder="Enter your API key" 
                  value={inputPandaScoreApiKey} 
                  onChange={(e) => setInputPandaScoreApiKey(e.target.value)}
                  className="bg-theme-gray-medium border-theme-gray-light text-white"
                />
                <p className="text-xs mt-2 text-gray-400">
                  To fetch real esports match data, we use PandaScore API.
                  A default key is provided, but you can get your own free API key by signing up at <a href="https://pandascore.co/" target="_blank" rel="noopener noreferrer" className="text-theme-purple hover:underline">pandascore.co</a>
                </p>
              </div>
            </TabsContent>
          </Tabs>
          
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={handleSkip} className="border-theme-gray-light text-gray-300">
              Skip (Use Sample Data)
            </Button>
            <Button onClick={handleSaveApiKey} className="bg-theme-purple hover:bg-theme-purple/90">
              Save API Keys
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {children}
    </ApiKeyContext.Provider>
  );
};

export default ApiKeyProvider;
