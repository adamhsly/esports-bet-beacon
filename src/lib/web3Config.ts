
import { config, Environment } from '@imtbl/sdk';

// Immutable configuration for testnet (switch to mainnet for production)
export const immutableConfig = config({
  environment: Environment.SANDBOX, // Use Environment.PRODUCTION for mainnet
  apiKey: '', // This will be set via environment variable later
  publishableKey: '', // This will be set via environment variable later
});

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
