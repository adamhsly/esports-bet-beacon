import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useWeb3 } from '@/contexts/Web3Context';
import { Wallet, ChevronDown, ExternalLink } from 'lucide-react';

const WalletConnector: React.FC = () => {
  console.log('WalletConnector component rendering - about to call useWeb3');
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { isConnected, currentWallet, userWallets, connectWallet, disconnectWallet, switchWallet, isLoading } = useWeb3();

  console.log('WalletConnector - useWeb3 called successfully, isConnected:', isConnected);

  const handleConnect = async (walletType: string) => {
    const success = await connectWallet(walletType);
    if (success) {
      setIsDialogOpen(false);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (isConnected && currentWallet) {
    return (
      <div className="flex items-center gap-2">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2">
              <Wallet size={16} />
              <span>{formatAddress(currentWallet.address)}</span>
              <Badge variant="secondary" className="text-xs">
                {currentWallet.walletType}
              </Badge>
              <ChevronDown size={14} />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Wallet Management</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-2">Current Wallet</h4>
                <div className="p-3 border rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-mono text-sm">{formatAddress(currentWallet.address)}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {currentWallet.walletType} • {currentWallet.blockchain}
                      </p>
                    </div>
                    {currentWallet.isPrimary && (
                      <Badge variant="default" className="text-xs">Primary</Badge>
                    )}
                  </div>
                </div>
              </div>

              {userWallets.length > 1 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Switch Wallet</h4>
                  <div className="space-y-2">
                    {userWallets
                      .filter(wallet => wallet.address !== currentWallet.address)
                      .map((wallet) => (
                        <Button
                          key={wallet.address}
                          variant="ghost"
                          className="w-full justify-start p-3 h-auto"
                          onClick={() => switchWallet(wallet.address)}
                        >
                          <div className="text-left">
                            <p className="font-mono text-sm">{formatAddress(wallet.address)}</p>
                            <p className="text-xs text-muted-foreground capitalize">
                              {wallet.walletType} • {wallet.blockchain}
                            </p>
                          </div>
                        </Button>
                      ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setIsDialogOpen(false)}
                >
                  <ExternalLink size={14} className="mr-1" />
                  View on Explorer
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    disconnectWallet();
                    setIsDialogOpen(false);
                  }}
                >
                  Disconnect
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button className="bg-theme-purple hover:bg-theme-purple/90">
          <Wallet size={16} className="mr-2" />
          Connect Wallet
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect Your Wallet</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Button
            variant="outline"
            className="w-full justify-start p-4 h-auto"
            onClick={() => handleConnect('metamask')}
            disabled={isLoading}
          >
            <div className="flex items-center">
              <div className="w-8 h-8 bg-orange-500 rounded-full mr-3 flex items-center justify-center">
                <span className="text-white font-bold text-sm">M</span>
              </div>
              <div className="text-left">
                <p className="font-medium">MetaMask</p>
                <p className="text-xs text-muted-foreground">Connect using MetaMask wallet</p>
              </div>
            </div>
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start p-4 h-auto"
            onClick={() => handleConnect('passport')}
            disabled={isLoading}
          >
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-500 rounded-full mr-3 flex items-center justify-center">
                <span className="text-white font-bold text-sm">P</span>
              </div>
              <div className="text-left">
                <p className="font-medium">Immutable Passport</p>
                <p className="text-xs text-muted-foreground">Immutable's native wallet</p>
              </div>
            </div>
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start p-4 h-auto"
            onClick={() => handleConnect('wallet_connect')}
            disabled={isLoading}
          >
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-600 rounded-full mr-3 flex items-center justify-center">
                <span className="text-white font-bold text-sm">W</span>
              </div>
              <div className="text-left">
                <p className="font-medium">WalletConnect</p>
                <p className="text-xs text-muted-foreground">Connect via QR code</p>
              </div>
            </div>
          </Button>
        </div>
        
        <div className="mt-4 p-3 bg-muted rounded-lg">
          <p className="text-xs text-muted-foreground">
            By connecting a wallet, you agree to our terms and conditions. Your wallet address will be linked to your account.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WalletConnector;
