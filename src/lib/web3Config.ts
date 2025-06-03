
// Simple web3 configuration without Immutable SDK for now
// We'll add proper Immutable integration once the SDK is properly installed

export const SUPPORTED_WALLETS = {
  METAMASK: 'metamask',
  PASSPORT: 'passport', 
  WALLET_CONNECT: 'wallet_connect',
} as const;

export type SupportedWallet = typeof SUPPORTED_WALLETS[keyof typeof SUPPORTED_WALLETS];

export const BLOCKCHAIN_NETWORKS = {
  IMMUTABLE: 'immutable',
  ETHEREUM: 'ethereum',
} as const;

export type BlockchainNetwork = typeof BLOCKCHAIN_NETWORKS[keyof typeof BLOCKCHAIN_NETWORKS];

// Basic configuration placeholder
export const web3Config = {
  environment: 'sandbox', // Will be 'production' for mainnet
  chainId: 13371, // Immutable zkEVM Testnet
  rpcUrl: 'https://rpc.testnet.immutable.com',
};
