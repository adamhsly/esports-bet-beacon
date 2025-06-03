
interface Window {
  ethereum?: {
    request: (args: { method: string; params?: any[] }) => Promise<any>;
    isMetaMask?: boolean;
    isConnected?: () => boolean;
    selectedAddress?: string;
    on?: (event: string, callback: (accounts: string[]) => void) => void;
    removeListener?: (event: string, callback: (accounts: string[]) => void) => void;
  };
}
