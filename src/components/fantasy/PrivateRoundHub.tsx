import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock, Plus, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { JoinPrivateRound } from './JoinPrivateRound';

export const PrivateRoundHub: React.FC = () => {
  const navigate = useNavigate();
  const [showJoinForm, setShowJoinForm] = useState(false);

  return (
    <div className="mx-2 md:mx-4 my-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Button
            onClick={() => navigate('/fantasy')}
            className="flex items-center gap-2 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-medium"
          >
            <Home className="h-4 w-4" />
            Fantasy
          </Button>
        </div>
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-3 text-[#7a5cff]">Private Rounds</h1>
          <p className="text-white text-lg">
            Create exclusive rounds or join with an invite code
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          {/* Join Round Card */}
          <Card className="relative overflow-hidden border-white/[0.08] bg-gradient-to-br from-[#1e1e2a]/90 to-[#2a2a3a]/90 backdrop-blur-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:border-[#7a5cff]/30 hover:translate-y-[-2px]">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 rounded-lg bg-[#7a5cff]/10">
                  <Lock className="h-6 w-6 text-[#7a5cff]" />
                </div>
                <CardTitle className="text-white">Join Round</CardTitle>
              </div>
              <CardDescription className="text-white">
                Have an invite code? Join an exclusive round
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!showJoinForm ? (
                <Button 
                  onClick={() => setShowJoinForm(true)}
                  className="w-full bg-gradient-to-br from-[#7a5cff] to-[#8e6fff] hover:from-[#6b4de6] hover:to-[#7f5ff0] text-white font-medium shadow-[0_0_12px_rgba(122,92,255,0.3)]"
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
          <Card className="relative overflow-hidden border-white/[0.08] bg-gradient-to-br from-[#1e1e2a]/90 to-[#2a2a3a]/90 backdrop-blur-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:border-[#7a5cff]/30 hover:translate-y-[-2px]">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 rounded-lg bg-[#7a5cff]/10">
                  <Plus className="h-6 w-6 text-[#7a5cff]" />
                </div>
                <CardTitle className="text-white">Create Round</CardTitle>
              </div>
              <CardDescription className="text-white">
                Set up a custom round with your own rules
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => navigate('/fantasy/private/create')}
                className="w-full bg-gradient-to-br from-[#7a5cff] to-[#8e6fff] hover:from-[#6b4de6] hover:to-[#7f5ff0] text-white font-medium shadow-[0_0_12px_rgba(122,92,255,0.3)]"
                size="lg"
              >
                Create Private Round
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
