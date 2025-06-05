import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Users, Trophy, DollarSign, Star } from 'lucide-react';

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

interface FormationPosition {
  id: string;
  name: string;
  position: 'IGL' | 'AWPer' | 'Entry Fragger' | 'Support' | 'Lurker';
  required: boolean;
}

const CS2_POSITIONS: FormationPosition[] = [
  { id: 'igl', name: 'In-Game Leader', position: 'IGL', required: false },
  { id: 'awper', name: 'AWPer', position: 'AWPer', required: false },
  { id: 'entry', name: 'Entry Fragger', position: 'Entry Fragger', required: false },
  { id: 'support', name: 'Support', position: 'Support', required: false },
  { id: 'lurker', name: 'Lurker', position: 'Lurker', required: false },
];

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
  const [benchCards, setBenchCards] = useState<FantasyCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const calculateTeamValue = () => {
    const activeValue = Object.values(selectedCards).reduce((total, card) => {
      return total + (card?.value || 0);
    }, 0);
    const benchValue = benchCards.reduce((total, card) => total + card.value, 0);
    return activeValue + benchValue;
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

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const { source, destination } = result;
    const draggedCard = availableCards.find(card => card.id === result.draggableId);
    if (!draggedCard) return;

    if (destination.droppableId.startsWith('position-')) {
      const positionId = destination.droppableId.replace('position-', '');
      const position = CS2_POSITIONS.find(p => p.id === positionId);
      
      if (position && (draggedCard.position === position.position || draggedCard.position === 'Player')) {
        const currentValue = calculateTeamValue();
        const newValue = currentValue + draggedCard.value - (selectedCards[positionId]?.value || 0);
        
        if (newValue <= SALARY_CAP) {
          if (selectedCards[positionId]) {
            setAvailableCards(prev => [...prev, selectedCards[positionId]!]);
          }
          
          setSelectedCards(prev => ({
            ...prev,
            [positionId]: draggedCard
          }));
          
          setAvailableCards(prev => prev.filter(card => card.id !== draggedCard.id));
        } else {
          toast({
            title: "Budget Exceeded",
            description: "This would exceed your salary cap!",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Invalid Position",
          description: `This player cannot play as ${position?.name}`,
          variant: "destructive",
        });
      }
    }

    if (destination.droppableId === 'bench' && benchCards.length < 3) {
      const newValue = calculateTeamValue() + draggedCard.value;
      if (newValue <= SALARY_CAP) {
        setBenchCards(prev => [...prev, draggedCard]);
        setAvailableCards(prev => prev.filter(card => card.id !== draggedCard.id));
      } else {
        toast({
          title: "Budget Exceeded",
          description: "This would exceed your salary cap!",
          variant: "destructive",
        });
      }
    }
  };

  const removeFromPosition = (positionId: string) => {
    const card = selectedCards[positionId];
    if (card) {
      setAvailableCards(prev => [...prev, card]);
      setSelectedCards(prev => ({
        ...prev,
        [positionId]: null
      }));
    }
  };

  const removeFromBench = (cardId: string) => {
    const card = benchCards.find(c => c.id === cardId);
    if (card) {
      setBenchCards(prev => prev.filter(c => c.id !== cardId));
      setAvailableCards(prev => [...prev, card]);
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

      const benchLineup = benchCards.map(card => ({
        card_id: card.id,
        player_name: card.player_name,
        value: card.value
      }));

      // Convert selectedCards to a serializable format
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
          bench_lineup: benchLineup,
          formation_positions: formationPositionsData,
          team_chemistry_bonus: calculateChemistryBonus(),
          total_team_value: calculateTeamValue(),
          salary_used: calculateTeamValue(),
          salary_cap: SALARY_CAP,
        });

      if (error) throw error;

      toast({
        title: "Success!",
        description: `Your fantasy team with ${getActivePlayerCount()} player${getActivePlayerCount() !== 1 ? 's' : ''} has been saved`,
      });

      setTeamName('');
      setSelectedCards({
        igl: null,
        awper: null,
        entry: null,
        support: null,
        lurker: null,
      });
      setBenchCards([]);
      
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
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Fantasy Team Builder
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Team Configuration */}
              <div className="space-y-4">
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

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Active Players</span>
                    <Badge variant="outline">
                      {getActivePlayerCount()}/5
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Salary Cap</span>
                    <Badge variant={calculateTeamValue() > SALARY_CAP ? "destructive" : "secondary"}>
                      ${calculateTeamValue().toLocaleString()} / ${SALARY_CAP.toLocaleString()}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Chemistry Bonus</span>
                    <Badge variant="outline">
                      <Star className="h-3 w-3 mr-1" />
                      +{calculateChemistryBonus()}
                    </Badge>
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
                  <p className="text-sm text-orange-500">
                    Add at least 1 player to save your team
                  </p>
                )}
              </div>

              {/* Formation */}
              <div className="space-y-4">
                <h3 className="font-semibold">Formation ({getActivePlayerCount()}-0)</h3>
                <div className="space-y-2">
                  {CS2_POSITIONS.map(position => (
                    <Droppable key={position.id} droppableId={`position-${position.id}`}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`
                            min-h-[80px] p-3 border-2 border-dashed rounded-lg
                            ${snapshot.isDraggingOver ? 'border-theme-purple bg-theme-purple/10' : 'border-gray-300'}
                            ${selectedCards[position.id] ? 'bg-theme-gray-dark' : 'bg-gray-50'}
                          `}
                        >
                          <div className="text-xs font-medium text-gray-600 mb-2">
                            {position.name} (Optional)
                          </div>
                          {selectedCards[position.id] ? (
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium text-sm">
                                  {selectedCards[position.id]!.player_name}
                                </div>
                                <div className="text-xs text-gray-500">
                                  ${selectedCards[position.id]!.value.toLocaleString()}
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => removeFromPosition(position.id)}
                              >
                                ✕
                              </Button>
                            </div>
                          ) : (
                            <div className="text-xs text-gray-400">
                              Drag a {position.position} here
                            </div>
                          )}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  ))}
                </div>

                <div>
                  <h4 className="font-medium mb-2">Bench (0-3 players)</h4>
                  <Droppable droppableId="bench">
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`
                          min-h-[100px] p-3 border-2 border-dashed rounded-lg
                          ${snapshot.isDraggingOver ? 'border-theme-purple bg-theme-purple/10' : 'border-gray-300'}
                        `}
                      >
                        {benchCards.length === 0 ? (
                          <div className="text-xs text-gray-400">
                            Drag substitute players here
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {benchCards.map((card, index) => (
                              <div key={card.id} className="flex items-center justify-between text-sm">
                                <span>{card.player_name}</span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => removeFromBench(card.id)}
                                >
                                  ✕
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              </div>

              {/* Available Cards */}
              <div>
                <h3 className="font-semibold mb-4">Available Cards</h3>
                <Droppable droppableId="available">
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="space-y-2 max-h-[600px] overflow-y-auto"
                    >
                      {availableCards.map((card, index) => (
                        <Draggable key={card.id} draggableId={card.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`
                                p-3 border rounded-lg cursor-move
                                ${snapshot.isDragging ? 'shadow-lg bg-white' : 'bg-gray-50'}
                              `}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-medium text-sm">{card.player_name}</div>
                                  <div className="text-xs text-gray-500">
                                    {card.team_name} • {card.position}
                                  </div>
                                  <Badge className="text-xs mt-1" variant="outline">
                                    {card.rarity}
                                  </Badge>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm font-medium">
                                    ${card.value.toLocaleString()}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DragDropContext>
  );
};
