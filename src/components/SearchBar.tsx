
import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X, Loader2 } from 'lucide-react';
import { searchTeams, searchPlayers } from '@/lib/sportDevsApi';
import { useDebounce } from '@/hooks/useDebounce';

interface SearchResult {
  id: string;
  name: string;
  image_url?: string;
  type: 'team' | 'player';
  link: string;
}

export const SearchBar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);
  
  const debouncedQuery = useDebounce(query, 500);
  
  useEffect(() => {
    if (debouncedQuery.length >= 3) {
      fetchSearchResults(debouncedQuery);
    } else {
      setResults([]);
    }
  }, [debouncedQuery]);
  
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  const fetchSearchResults = async (searchQuery: string) => {
    setIsLoading(true);
    try {
      // Search for teams and players in parallel
      const [teams, players] = await Promise.all([
        searchTeams(searchQuery),
        searchPlayers(searchQuery)
      ]);
      
      const teamResults = teams.map((team: any) => ({
        id: team.id,
        name: team.name,
        image_url: team.image_url || '/placeholder.svg',
        type: 'team' as const,
        link: `/team/${team.id}`
      }));
      
      const playerResults = players.map((player: any) => ({
        id: player.id,
        name: player.name,
        image_url: player.image_url || '/placeholder.svg',
        type: 'player' as const,
        link: `/player/${player.id}`
      }));
      
      // Combine results
      const allResults = [...teamResults, ...playerResults];
      
      // Sort results by relevance (exact match first, then contains)
      const sortedResults = allResults.sort((a, b) => {
        const aNameLower = a.name.toLowerCase();
        const bNameLower = b.name.toLowerCase();
        const queryLower = searchQuery.toLowerCase();
        
        if (aNameLower === queryLower && bNameLower !== queryLower) return -1;
        if (bNameLower === queryLower && aNameLower !== queryLower) return 1;
        
        return aNameLower.indexOf(queryLower) - bNameLower.indexOf(queryLower);
      });
      
      // Limit results to top 10
      setResults(sortedResults.slice(0, 10));
      
    } catch (error) {
      console.error('Error searching:', error);
      setResults([]);
    }
    setIsLoading(false);
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    if (e.target.value.length > 0 && !isOpen) {
      setIsOpen(true);
    } else if (e.target.value.length === 0) {
      setIsOpen(false);
    }
  };
  
  const handleClear = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
  };

  return (
    <div className="relative w-full max-w-md" ref={searchRef}>
      <div className="relative">
        <Input
          type="text"
          placeholder="Search teams, players..."
          value={query}
          onChange={handleInputChange}
          className="pl-10 pr-10 py-2 w-full bg-theme-gray-dark border border-theme-gray-medium focus:border-theme-purple"
          onFocus={() => query.length >= 3 && setIsOpen(true)}
        />
        <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        {query.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 text-gray-400 hover:text-white"
            onClick={handleClear}
          >
            <X size={16} />
          </Button>
        )}
      </div>
      
      {isOpen && (
        <div className="absolute mt-1 w-full bg-theme-gray-dark border border-theme-gray-medium rounded-md shadow-lg z-50 max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-theme-purple" />
              <span className="ml-2">Searching...</span>
            </div>
          ) : results.length > 0 ? (
            <div>
              <div className="p-3 border-b border-theme-gray-medium">
                <span className="text-sm text-gray-400">Search results for "{query}"</span>
              </div>
              <ul>
                {results.map((result) => (
                  <li key={`${result.type}-${result.id}`} className="border-b border-theme-gray-medium">
                    <Link
                      to={result.link}
                      className="flex items-center px-4 py-3 hover:bg-theme-gray-medium"
                      onClick={() => setIsOpen(false)}
                    >
                      <img
                        src={result.image_url || '/placeholder.svg'}
                        alt={result.name}
                        className="w-8 h-8 object-cover rounded"
                      />
                      <div className="ml-3">
                        <div className="font-medium">{result.name}</div>
                        <div className="text-xs text-gray-400 capitalize">{result.type}</div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : query.length >= 3 ? (
            <div className="p-4 text-center text-gray-400">
              No results found for "{query}"
            </div>
          ) : (
            <div className="p-4 text-center text-gray-400">
              Type at least 3 characters to search
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
