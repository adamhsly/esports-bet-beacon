import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface StarTeamConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
}

export const StarTeamConfirmModal: React.FC<StarTeamConfirmModalProps> = ({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  onCancel,
  confirmText = "Confirm",
  cancelText = "Cancel"
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0F1420] border-border">
        <DialogHeader>
          <DialogTitle className="text-white">{title}</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onCancel}
            className="border-border text-white hover:bg-background/20"
          >
            {cancelText}
          </Button>
          <Button
            onClick={onConfirm}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};