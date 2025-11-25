import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card } from '@/components/ui/card';
import { ArrowRight, AlertTriangle } from 'lucide-react';

interface TeamSwapConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  oldTeam: {
    id: string;
    name: string;
    type: string;
    currentPoints: number;
  };
  newTeam: {
    id: string;
    name: string;
    type: string;
    price: number;
  };
}

export const TeamSwapConfirmModal: React.FC<TeamSwapConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  oldTeam,
  newTeam,
}) => {
  const isOldTeamAmateur = oldTeam.type === 'amateur';
  const isNewTeamAmateur = newTeam.type === 'amateur';

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-xl text-white">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            Confirm Team Swap
          </AlertDialogTitle>
          <AlertDialogDescription className="text-base text-white">
            You can only swap one team per round. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center gap-4">
            <Card className={`flex-1 p-4 ${
              isOldTeamAmateur 
                ? 'bg-orange-500/20 border border-orange-400/30' 
                : 'bg-purple-500/20 border border-purple-400/30'
            }`}>
              <div className="space-y-2">
                <div className="text-sm text-white/70">Swapping Out</div>
                <div className="font-semibold text-lg text-white">{oldTeam.name}</div>
                <div className="text-sm text-white">
                  <span className="text-white/70">Type: </span>
                  <span className="capitalize">{oldTeam.type}</span>
                </div>
                <div className="text-sm text-white">
                  <span className="text-white/70">Current Points: </span>
                  <span className="font-bold text-green-400">{oldTeam.currentPoints}</span>
                </div>
              </div>
            </Card>

            <div className="flex-shrink-0">
              <ArrowRight className="w-8 h-8 text-white" />
            </div>

            <Card className={`flex-1 p-4 ${
              isNewTeamAmateur 
                ? 'bg-orange-500/20 border border-orange-400/30' 
                : 'bg-purple-500/20 border border-purple-400/30'
            }`}>
              <div className="space-y-2">
                <div className="text-sm text-white/70">Swapping In</div>
                <div className="font-semibold text-lg text-white">{newTeam.name}</div>
                <div className="text-sm text-white">
                  <span className="text-white/70">Type: </span>
                  <span className="capitalize">{newTeam.type}</span>
                </div>
                <div className="text-sm text-white">
                  <span className="text-white/70">Budget: </span>
                  <span className="font-bold text-green-400">{newTeam.price} CR</span>
                </div>
              </div>
            </Card>
          </div>

          <div className="bg-gray-900/50 border border-gray-700/50 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <div className="font-semibold text-sm text-white">Important Information:</div>
                <ul className="text-sm text-white space-y-1 list-disc list-inside">
                  <li>
                    <strong className="text-white">{oldTeam.currentPoints} points</strong> earned by {oldTeam.name} will be preserved
                  </li>
                  <li>
                    {newTeam.name} will start earning points from this moment forward
                  </li>
                  <li>
                    You can only swap <strong className="text-white">one team per round</strong>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose} className="text-white">Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-primary hover:bg-primary/90">
            Confirm Swap
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
