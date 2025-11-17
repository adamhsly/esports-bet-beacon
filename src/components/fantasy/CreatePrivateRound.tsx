import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, Copy, Check } from 'lucide-react';
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
              <CardTitle className="text-3xl text-foreground">🎉 Round Created!</CardTitle>
              <CardDescription>Share this code with players to invite them</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-white/[0.04] p-6 rounded-lg text-center border border-white/[0.05]">
                <Label className="text-sm text-muted-foreground mb-2 block">Join Code</Label>
                <div className="flex items-center justify-center gap-3">
                  <code className="text-4xl font-mono font-bold tracking-wider text-foreground">
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
                  className="w-full bg-gradient-to-br from-[#7a5cff] to-[#8e6fff] hover:from-[#6b4de6] hover:to-[#7f5ff0] text-white font-medium shadow-[0_0_12px_rgba(122,92,255,0.3)]"
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
        <Card className="relative overflow-hidden border-white/[0.08] bg-gradient-to-br from-[#1e1e2a]/90 to-[#2a2a3a]/90 backdrop-blur-lg shadow-lg">
          <CardHeader>
            <CardTitle className="text-foreground">Create Private Round</CardTitle>
            <CardDescription>Set up a custom round with your own schedule</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="round-name">Round Name *</Label>
                <Input
                  id="round-name"
                  type="text"
                  placeholder="e.g., Weekend Warriors League"
                  value={formData.round_name}
                  onChange={(e) => setFormData({ ...formData, round_name: e.target.value })}
                  disabled={loading}
                  required
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start-date">Start Date & Time *</Label>
                  <Input
                    id="start-date"
                    type="datetime-local"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    disabled={loading}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end-date">End Date & Time *</Label>
                  <Input
                    id="end-date"
                    type="datetime-local"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                disabled={loading}
                className="w-full bg-gradient-to-br from-[#7a5cff] to-[#8e6fff] hover:from-[#6b4de6] hover:to-[#7f5ff0] text-white font-medium shadow-[0_0_12px_rgba(122,92,255,0.3)]"
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
