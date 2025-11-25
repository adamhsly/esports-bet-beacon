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
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-xl">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            Confirm Team Swap
          </AlertDialogTitle>
          <AlertDialogDescription className="text-base">
            You can only swap one team per round. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center gap-4">
            <Card className="flex-1 p-4 bg-card/50">
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Swapping Out</div>
                <div className="font-semibold text-lg">{oldTeam.name}</div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Type: </span>
                  <span className="capitalize">{oldTeam.type}</span>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Current Points: </span>
                  <span className="font-bold text-primary">{oldTeam.currentPoints}</span>
                </div>
              </div>
            </Card>

            <div className="flex-shrink-0">
              <ArrowRight className="w-8 h-8 text-primary" />
            </div>

            <Card className="flex-1 p-4 bg-primary/10 border-primary/20">
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Swapping In</div>
                <div className="font-semibold text-lg">{newTeam.name}</div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Type: </span>
                  <span className="capitalize">{newTeam.type}</span>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Budget: </span>
                  <span className="font-bold">{newTeam.price} CR</span>
                </div>
              </div>
            </Card>
          </div>

          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <div className="font-semibold text-sm">Important Information:</div>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>
                    <strong className="text-foreground">{oldTeam.currentPoints} points</strong> earned by {oldTeam.name} will be preserved
                  </li>
                  <li>
                    {newTeam.name} will start earning points from this moment forward
                  </li>
                  <li>
                    You can only swap <strong className="text-foreground">one team per round</strong>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-primary hover:bg-primary/90">
            Confirm Swap
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
