import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { JoinPrivateRound } from './JoinPrivateRound';

export const PrivateRoundHub: React.FC = () => {
  const navigate = useNavigate();
  const [showJoinForm, setShowJoinForm] = useState(false);

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-3">Private Rounds</h1>
        <p className="text-muted-foreground text-lg">
          Create exclusive rounds or join with an invite code
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Join Round Card */}
        <Card className="border-border/50 bg-card hover:border-primary/30 transition-all duration-300">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 rounded-lg bg-primary/10">
                <Lock className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Join Round</CardTitle>
            </div>
            <CardDescription>
              Have an invite code? Join an exclusive round
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!showJoinForm ? (
              <Button 
                onClick={() => setShowJoinForm(true)}
                className="w-full"
                size="lg"
              >
                Enter Code
              </Button>
            ) : (
              <JoinPrivateRound onCancel={() => setShowJoinForm(false)} />
            )}
          </CardContent>
        </Card>

        {/* Create Round Card */}
        <Card className="border-border/50 bg-card hover:border-primary/30 transition-all duration-300">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 rounded-lg bg-primary/10">
                <Plus className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Create Round</CardTitle>
            </div>
            <CardDescription>
              Set up a custom round with your own rules
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => navigate('/fantasy/private/create')}
              className="w-full"
              size="lg"
            >
              Create Private Round
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
