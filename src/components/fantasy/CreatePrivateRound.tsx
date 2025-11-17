import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Copy, Check, Home } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { createPrivateRound, PrivateRoundConfig } from '@/lib/privateRoundApi';

export const CreatePrivateRound: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [createdRound, setCreatedRound] = useState<{ id: string; join_code: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const [formData, setFormData] = useState<PrivateRoundConfig>({
    round_name: '',
    start_date: '',
    end_date: '',
    budget_cap: 50,
    game_source: 'both',
    game_type: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.round_name || !formData.start_date || !formData.end_date) {
      toast.error('Please fill in all required fields');
      return;
    }

    const startDate = new Date(formData.start_date);
    const endDate = new Date(formData.end_date);

    if (endDate <= startDate) {
      toast.error('End date must be after start date');
      return;
    }

    if (endDate <= new Date()) {
      toast.error('End date must be in the future');
      return;
    }

    if (formData.budget_cap && (formData.budget_cap < 30 || formData.budget_cap > 200)) {
      toast.error('Budget cap must be between 30 and 200');
      return;
    }

    setLoading(true);

    try {
      const response = await createPrivateRound(formData);
      
      if (response.success) {
        toast.success('Private round created successfully!');
        setCreatedRound({
          id: response.round.id,
          join_code: response.join_code,
        });
      }
    } catch (error: any) {
      console.error('Error creating round:', error);
      toast.error(error.message || 'Failed to create round');
    } finally {
      setLoading(false);
    }
  };

  const copyCode = async () => {
    if (createdRound?.join_code) {
      await navigator.clipboard.writeText(createdRound.join_code);
      setCopied(true);
      toast.success('Code copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (createdRound) {
    return (
      <div className="mx-2 md:mx-4 my-8">
        <div className="max-w-2xl mx-auto">
          <Card className="relative overflow-hidden border-white/[0.08] bg-gradient-to-br from-[#1e1e2a]/90 to-[#2a2a3a]/90 backdrop-blur-lg shadow-lg">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl text-white">🎉 Round Created!</CardTitle>
              <CardDescription className="text-white">Share this code with players to invite them</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-white/[0.04] p-6 rounded-lg text-center border border-white/[0.05]">
                <Label className="text-sm text-white mb-2 block">Join Code</Label>
                <div className="flex items-center justify-center gap-3">
                  <code className="text-4xl font-mono font-bold tracking-wider text-white">
                    {createdRound.join_code}
                  </code>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={copyCode}
                    className="h-10 w-10"
                  >
                    {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                  </Button>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <Button
                  size="lg"
                  onClick={() => navigate(`/fantasy?roundId=${createdRound.id}`)}
                  className="w-full"
                >
                  Go to Team Selection
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => navigate('/fantasy')}
                  className="w-full"
                >
                  Back to Rounds
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-2 md:mx-4 my-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Button
            onClick={() => navigate('/fantasy')}
            className="flex items-center gap-2 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-medium"
          >
            <Home className="h-4 w-4" />
            Fantasy
          </Button>
        </div>
        <Card className="relative overflow-hidden border-white/[0.08] bg-gradient-to-br from-[#1e1e2a]/90 to-[#2a2a3a]/90 backdrop-blur-lg shadow-lg">
          <CardHeader>
            <CardTitle className="text-white">Create Private Round</CardTitle>
            <CardDescription className="text-white">Set up a custom round with your own schedule</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="round-name" className="text-white">Round Name *</Label>
                <Input
                  id="round-name"
                  type="text"
                  placeholder="e.g., Weekend Warriors League"
                  value={formData.round_name}
                  onChange={(e) => setFormData({ ...formData, round_name: e.target.value })}
                  disabled={loading}
                  required
                  className="h-10 bg-gradient-to-b from-[#2B2F3A] to-[#1B1F28] text-white placeholder-gray-400 border-2 border-transparent hover:border-[#965AFF]/20 focus:border-[#965AFF] focus:shadow-[0_0_20px_rgba(150,90,255,0.4)] transition-all duration-[250ms] before:absolute before:inset-0 before:rounded-xl before:border before:border-white/10 before:pointer-events-none"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start-date" className="text-white">Start Date & Time *</Label>
                  <Input
                    id="start-date"
                    type="datetime-local"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    disabled={loading}
                    required
                    className="h-10 bg-gradient-to-b from-[#2B2F3A] to-[#1B1F28] text-white placeholder-gray-400 border-2 border-transparent hover:border-[#965AFF]/20 focus:border-[#965AFF] focus:shadow-[0_0_20px_rgba(150,90,255,0.4)] transition-all duration-[250ms] before:absolute before:inset-0 before:rounded-xl before:border before:border-white/10 before:pointer-events-none"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end-date" className="text-white">End Date & Time *</Label>
                  <Input
                    id="end-date"
                    type="datetime-local"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    disabled={loading}
                    required
                    className="h-10 bg-gradient-to-b from-[#2B2F3A] to-[#1B1F28] text-white placeholder-gray-400 border-2 border-transparent hover:border-[#965AFF]/20 focus:border-[#965AFF] focus:shadow-[0_0_20px_rgba(150,90,255,0.4)] transition-all duration-[250ms] before:absolute before:inset-0 before:rounded-xl before:border before:border-white/10 before:pointer-events-none"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="budget-cap" className="text-white">Budget Cap</Label>
                  <Input
                    id="budget-cap"
                    type="number"
                    min="30"
                    max="200"
                    placeholder="50"
                    value={formData.budget_cap || ''}
                    onChange={(e) => setFormData({ ...formData, budget_cap: parseInt(e.target.value) || undefined })}
                    disabled={loading}
                    className="h-10 bg-gradient-to-b from-[#2B2F3A] to-[#1B1F28] text-white placeholder-gray-400 border-2 border-transparent hover:border-[#965AFF]/20 focus:border-[#965AFF] focus:shadow-[0_0_20px_rgba(150,90,255,0.4)] transition-all duration-[250ms] before:absolute before:inset-0 before:rounded-xl before:border before:border-white/10 before:pointer-events-none"
                  />
                  <p className="text-xs text-gray-400">Range: 30-200 (default: 50)</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="game-source" className="text-white">Match Source</Label>
                  <Select
                    value={formData.game_source || 'both'}
                    onValueChange={(value: 'pro' | 'amateur' | 'both') => setFormData({ ...formData, game_source: value })}
                    disabled={loading}
                  >
                    <SelectTrigger className="h-10 bg-gradient-to-b from-[#2B2F3A] to-[#1B1F28] text-white border-2 border-transparent hover:border-[#965AFF]/20 focus:border-[#965AFF] focus:shadow-[0_0_20px_rgba(150,90,255,0.4)] transition-all duration-[250ms]">
                      <SelectValue placeholder="Select match type" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1B1F28] border-white/10">
                      <SelectItem value="both" className="text-white hover:bg-white/10">Both (Pro & Amateur)</SelectItem>
                      <SelectItem value="pro" className="text-white hover:bg-white/10">Professional Only</SelectItem>
                      <SelectItem value="amateur" className="text-white hover:bg-white/10">Amateur Only</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-400">Choose match types to include</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="game-type" className="text-white">Game Type (Optional)</Label>
                <Input
                  id="game-type"
                  type="text"
                  placeholder="e.g., cs2, lol, dota2"
                  value={formData.game_type || ''}
                  onChange={(e) => setFormData({ ...formData, game_type: e.target.value })}
                  disabled={loading}
                  className="h-10 bg-gradient-to-b from-[#2B2F3A] to-[#1B1F28] text-white placeholder-gray-400 border-2 border-transparent hover:border-[#965AFF]/20 focus:border-[#965AFF] focus:shadow-[0_0_20px_rgba(150,90,255,0.4)] transition-all duration-[250ms] before:absolute before:inset-0 before:rounded-xl before:border before:border-white/10 before:pointer-events-none"
                />
                <p className="text-xs text-gray-400">Leave empty for all game types</p>
              </div>

              <Button 
                type="submit" 
                disabled={loading}
                className="w-full"
                size="lg"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Round
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
