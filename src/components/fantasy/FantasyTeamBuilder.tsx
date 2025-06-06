
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Users, Trophy, DollarSign, Star } from 'lucide-react';
import { FormationView } from './FormationView';
import { CardCollectionView } from './CardCollectionView';

interface FantasyCard {
  id: string;
  player_name: string;
  team_name: string;
  position: string;
  rarity: string;
  stats: any;
  value: number;
  chemistry_bonus?: number;
}

const SALARY_CAP = 100000;

export const FantasyTeamBuilder: React.FC = () => {
  const [teamName, setTeamName] = useState('');
  const [availableCards, setAvailableCards] = useState<FantasyCard[]>([]);
  const [selectedCards, setSelectedCards] = useState<{ [key: string]: FantasyCard | null }>({
    igl: null,
    awper: null,
    entry: null,
    support: null,
    lurker: null,
  });
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const calculateTeamValue = () => {
    return Object.values(selectedCards).reduce((total, card) => {
      return total + (card?.value || 0);
    }, 0);
  };

  const calculateChemistryBonus = () => {
    const activeCards = Object.values(selectedCards).filter(card => card !== null) as FantasyCard[];
    const teamCounts: { [team: string]: number } = {};
    
    activeCards.forEach(card => {
      if (card.team_name) {
        teamCounts[card.team_name] = (teamCounts[card.team_name] || 0) + 1;
      }
    });

    let bonus = 0;
    Object.values(teamCounts).forEach(count => {
      if (count >= 2) bonus += count * 5;
      if (count >= 3) bonus += count * 5;
    });

    return bonus;
  };

  const isValidTeam = () => {
    const hasAtLeastOnePlayer = Object.values(selectedCards).some(card => card !== null);
    const withinBudget = calculateTeamValue() <= SALARY_CAP;
    return hasAtLeastOnePlayer && withinBudget && teamName.trim().length > 0;
  };

  const getActivePlayerCount = () => {
    return Object.values(selectedCards).filter(card => card !== null).length;
  };

  const getSalaryRemaining = () => {
    return SALARY_CAP - calculateTeamValue();
  };

  useEffect(() => {
    fetchUserCards();
  }, []);

  const fetchUserCards = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: collection, error } = await supabase
        .from('user_card_collections')
        .select(`
          *,
          nft_cards (
            id,
            player_name,
            team_name,
            position,
            rarity,
            stats,
            game
          )
        `)
        .eq('user_id', user.id);

      if (error) throw error;

      const cards: FantasyCard[] = collection?.map(item => {
        const card = item.nft_cards;
        if (!card) return null;

        const baseValue = calculateCardValue(card.stats, card.rarity);
        
        return {
          id: card.id,
          player_name: card.player_name,
          team_name: card.team_name,
          position: card.position,
          rarity: card.rarity,
          stats: card.stats,
          value: baseValue,
        };
      }).filter(Boolean) as FantasyCard[];

      setAvailableCards(cards);
    } catch (error) {
      console.error('Error fetching cards:', error);
      toast({
        title: "Error",
        description: "Failed to load your cards",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateCardValue = (stats: any, rarity: string): number => {
    if (!stats) return 5000;

    const kdRatio = stats.kd_ratio || 1.0;
    const adr = stats.adr || 70;
    const matches = stats.matches || 10;

    let baseValue = Math.round((kdRatio * 15000) + (adr * 200) + (matches * 10));

    const rarityMultipliers = {
      common: 1.0,
      rare: 1.3,
      epic: 1.6,
      legendary: 2.0,
    };

    baseValue *= rarityMultipliers[rarity as keyof typeof rarityMultipliers] || 1.0;

    return Math.max(5000, Math.min(25000, baseValue));
  };

  const handlePositionSelect = (positionId: string) => {
    setSelectedPosition(selectedPosition === positionId ? null : positionId);
  };

  const handleCardSelect = (card: FantasyCard) => {
    if (!selectedPosition) {
      toast({
        title: "Select Position First",
        description: "Please select a position on the formation view first",
        variant: "destructive",
      });
      return;
    }

    const newValue = calculateTeamValue() + card.value - (selectedCards[selectedPosition]?.value || 0);
    
    if (newValue > SALARY_CAP) {
      toast({
        title: "Budget Exceeded",
        description: "This would exceed your salary cap!",
        variant: "destructive",
      });
      return;
    }

    // Return the previously selected card to available cards
    if (selectedCards[selectedPosition]) {
      setAvailableCards(prev => [...prev, selectedCards[selectedPosition]!]);
    }

    // Set the new card in the position
    setSelectedCards(prev => ({
      ...prev,
      [selectedPosition]: card
    }));

    // Remove the card from available cards
    setAvailableCards(prev => prev.filter(c => c.id !== card.id));

    // Clear position selection
    setSelectedPosition(null);

    toast({
      title: "Player Added",
      description: `${card.player_name} added to ${selectedPosition.toUpperCase()} position`,
    });
  };

  const handleRemovePlayer = (positionId: string) => {
    const card = selectedCards[positionId];
    if (card) {
      setAvailableCards(prev => [...prev, card]);
      setSelectedCards(prev => ({
        ...prev,
        [positionId]: null
      }));
      
      toast({
        title: "Player Removed",
        description: `${card.player_name} removed from lineup`,
      });
    }
  };

  const saveTeam = async () => {
    if (!isValidTeam()) return;

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const activeLineup = Object.entries(selectedCards)
        .filter(([_, card]) => card !== null)
        .map(([position, card]) => ({
          position,
          card_id: card!.id,
          player_name: card!.player_name,
          value: card!.value
        }));

      const formationPositionsData: { [key: string]: string | null } = {};
      Object.entries(selectedCards).forEach(([position, card]) => {
        formationPositionsData[position] = card ? card.id : null;
      });

      const { error } = await supabase
        .from('fantasy_teams')
        .insert({
          user_id: user.id,
          team_name: teamName,
          formation: `${getActivePlayerCount()}-0`,
          active_lineup: activeLineup,
          bench_lineup: [],
          formation_positions: formationPositionsData,
          team_chemistry_bonus: calculateChemistryBonus(),
          total_team_value: calculateTeamValue(),
          salary_used: calculateTeamValue(),
          salary_cap: SALARY_CAP,
        });

      if (error) throw error;

      toast({
        title: "Success!",
        description: `Your fantasy team "${teamName}" has been saved`,
      });

      // Reset form
      setTeamName('');
      setSelectedCards({
        igl: null,
        awper: null,
        entry: null,
        support: null,
        lurker: null,
      });
      setSelectedPosition(null);
      
      // Refetch cards to reset available cards
      fetchUserCards();
      
    } catch (error) {
      console.error('Error saving team:', error);
      toast({
        title: "Error",
        description: "Failed to save your team",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-theme-purple"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Team Configuration Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Fantasy Team Builder
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div>
              <Label htmlFor="teamName">Team Name</Label>
              <Input
                id="teamName"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Enter team name..."
                className="mt-1"
              />
            </div>
            
            <div className="flex flex-col justify-end">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">Players</span>
                <Badge variant="outline">
                  {getActivePlayerCount()}/5
                </Badge>
              </div>
            </div>
            
            <div className="flex flex-col justify-end">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">Budget</span>
                <Badge variant={calculateTeamValue() > SALARY_CAP ? "destructive" : "secondary"}>
                  ${getSalaryRemaining().toLocaleString()} left
                </Badge>
              </div>
            </div>
            
            <div className="flex flex-col justify-end">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">Chemistry</span>
                <Badge variant="outline">
                  <Star className="h-3 w-3 mr-1" />
                  +{calculateChemistryBonus()}
                </Badge>
              </div>
            </div>
          </div>
          
          <Button 
            onClick={saveTeam} 
            disabled={!isValidTeam() || saving}
            className="w-full"
          >
            {saving ? "Saving..." : `Save Team (${getActivePlayerCount()} player${getActivePlayerCount() !== 1 ? 's' : ''})`}
          </Button>
          
          {getActivePlayerCount() === 0 && teamName.trim().length > 0 && (
            <p className="text-sm text-orange-500 mt-2 text-center">
              Add at least 1 player to save your team
            </p>
          )}
        </CardContent>
      </Card>

      {/* Split Pane Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[700px]">
        {/* Left Pane - Formation View */}
        <FormationView
          selectedCards={selectedCards}
          onPositionSelect={handlePositionSelect}
          onRemovePlayer={handleRemovePlayer}
          selectedPosition={selectedPosition}
        />

        {/* Right Pane - Card Collection */}
        <CardCollectionView
          availableCards={availableCards}
          selectedPosition={selectedPosition}
          onCardSelect={handleCardSelect}
          salaryRemaining={getSalaryRemaining()}
        />
      </div>
    </div>
  );
};
