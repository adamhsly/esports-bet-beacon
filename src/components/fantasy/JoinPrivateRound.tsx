import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { joinPrivateRound } from '@/lib/privateRoundApi';

interface JoinPrivateRoundProps {
  onCancel?: () => void;
}

export const JoinPrivateRound: React.FC<JoinPrivateRoundProps> = ({ onCancel }) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!code.trim()) {
      toast.error('Please enter a join code');
      return;
    }

    setLoading(true);

    try {
      const response = await joinPrivateRound(code.toUpperCase().trim());
      
      if (response.success && response.round) {
        toast.success('Round found! Redirecting to team selection...');
        // Navigate to the team selection page for this round
        navigate(`/fantasy?roundId=${response.round.id}`);
      }
    } catch (error: any) {
      console.error('Error joining round:', error);
      toast.error(error.message || 'Failed to join round');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="join-code" className="text-white">Private Round Code</Label>
        <Input
          id="join-code"
          type="text"
          placeholder="Enter 8-character code"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          maxLength={8}
          className="uppercase font-mono text-lg tracking-wider text-white placeholder:text-white/50"
          disabled={loading}
        />
      </div>

      <div className="flex gap-2">
        <Button 
          type="submit" 
          disabled={loading || !code.trim()}
          className="flex-1"
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Join Round
        </Button>
        {onCancel && (
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
            disabled={loading}
            className="text-white border-white/20 hover:bg-white/10"
          >
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
};
