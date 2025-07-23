import React, { useState } from 'react';
import SearchableNavbar from '@/components/SearchableNavbar';
import Footer from '@/components/Footer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ProtectedRoute from '@/components/ProtectedRoute';
import { RoundSelector } from '@/components/fantasy/RoundSelector';
import { InProgressRounds } from '@/components/fantasy/InProgressRounds';
import { FinishedRounds } from '@/components/fantasy/FinishedRounds';
import { Calendar, Clock, Trophy } from 'lucide-react';

const FantasyPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('join');

  return (
    <div className="min-h-screen bg-background">
      <SearchableNavbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">
            <span className="bg-gradient-to-r from-theme-purple to-theme-green bg-clip-text text-transparent">
              Fantasy Esports
            </span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl">
            Create teams mixing pro and amateur teams. Higher risk, higher reward with amateur teams getting 25% bonus points.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="join" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Join a Round
            </TabsTrigger>
            <TabsTrigger value="in-progress" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              In Progress
            </TabsTrigger>
            <TabsTrigger value="finished" className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Finished
            </TabsTrigger>
          </TabsList>

          <TabsContent value="join">
            <RoundSelector 
              onNavigateToInProgress={() => setActiveTab('in-progress')}
            />
          </TabsContent>

          <TabsContent value="in-progress">
            <ProtectedRoute>
              <InProgressRounds />
            </ProtectedRoute>
          </TabsContent>

          <TabsContent value="finished">
            <ProtectedRoute>
              <FinishedRounds />
            </ProtectedRoute>
          </TabsContent>
        </Tabs>
      </div>

      <Footer />
    </div>
  );
};

export default FantasyPage;