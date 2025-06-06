
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Coins, ExternalLink, Clock, CheckCircle, XCircle } from 'lucide-react';

interface CardMintingStatusProps {
  isNFT: boolean;
  isMinted: boolean;
  mintStatus: 'pending' | 'minting' | 'minted' | 'failed';
  transactionHash?: string;
  onMint?: () => void;
  canMint?: boolean;
  showMintButton?: boolean;
}

export const CardMintingStatus: React.FC<CardMintingStatusProps> = ({
  isNFT,
  isMinted,
  mintStatus,
  transactionHash,
  onMint,
  canMint = false,
  showMintButton = true
}) => {
  const getMintStatusBadge = () => {
    if (!isNFT) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Badge variant="outline" className="text-xs">
                Database Card
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              This card exists in the database only. Connect a wallet to mint as NFT.
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    switch (mintStatus) {
      case 'pending':
        return (
          <Badge variant="outline" className="text-xs flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Pending Mint
          </Badge>
        );
      case 'minting':
        return (
          <Badge variant="outline" className="text-xs flex items-center gap-1 animate-pulse">
            <Coins className="h-3 w-3" />
            Minting...
          </Badge>
        );
      case 'minted':
        return (
          <Badge variant="default" className="text-xs flex items-center gap-1 bg-green-500">
            <CheckCircle className="h-3 w-3" />
            NFT Minted
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive" className="text-xs flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            Mint Failed
          </Badge>
        );
      default:
        return null;
    }
  };

  const getMintButton = () => {
    if (!showMintButton || isNFT || !canMint) return null;

    return (
      <Button
        size="sm"
        variant="outline"
        className="text-xs px-2 py-1 h-auto"
        onClick={onMint}
      >
        <Coins className="h-3 w-3 mr-1" />
        Mint NFT
      </Button>
    );
  };

  const getTransactionLink = () => {
    if (!transactionHash) return null;

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <Button
              size="sm"
              variant="ghost"
              className="text-xs px-1 py-1 h-auto"
              onClick={() => {
                // TODO: Open transaction in blockchain explorer
                console.log('View transaction:', transactionHash);
              }}
            >
              <ExternalLink className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            View transaction on blockchain explorer
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {getMintStatusBadge()}
      {getMintButton()}
      {getTransactionLink()}
    </div>
  );
};
