/**
 * @agentpay/x402-sdk
 * 
 * TypeScript SDK for implementing HTTP 402 payment flows on Ethereum and EVM chains
 * 
 * Supported Networks:
 * - Ethereum (mainnet, sepolia)
 * - Base (base, base-sepolia)
 * - Polygon (polygon, polygon-amoy)
 * - Arbitrum (arbitrum, arbitrum-sepolia)
 * - Optimism (optimism, optimism-sepolia)
 * - Mantle (mantle-sepolia)
 * - Cronos (cronos, cronos-testnet)
 * 
 * Supported Tokens:
 * - ETH (native)
 * - USDC
 * - USDT
 * - DAI
 * - MNT (native token on Mantle)
 * - CRO (native token on Cronos)
 * 
 * @example Client Usage (Node.js)
 * ```typescript
 * import { x402Fetch } from '@agentpay/x402-sdk';
 * 
 * const response = await x402Fetch('https://api.example.com/data', {
 *   network: 'sepolia',
 *   signer: '0x...' // your private key
 * });
 * ```
 * 
 * @example Client Usage (Browser with Wallet)
 * ```typescript
 * import { X402Client } from '@agentpay/x402-sdk';
 * 
 * const client = new X402Client({
 *   network: 'sepolia',
 *   signer: walletAdapter // your connected wallet
 * });
 * 
 * const response = await client.fetch('https://api.example.com/premium');
 * ```
 * 
 * @example Server Usage (Express)
 * ```typescript
 * import { createX402Server } from '@agentpay/x402-sdk';
 * import express from 'express';
 * 
 * const server = createX402Server({
 *   network: 'sepolia',
 *   recipientAddress: '0x...'
 * });
 * 
 * app.get('/premium-data', 
 *   server.requirePayment({
 *     amount: '1.00',
 *     token: 'USDC'
 *   }),
 *   (req, res) => {
 *     res.json({ data: 'premium content' });
 *   }
 * );
 * ```
 */

// Client exports
export {
  X402Client,
  x402Fetch,
  createPaymentProof,
  type X402ClientConfig,
  type X402FetchOptions,
  type X402FetchWrapperOptions,
  type WalletAdapter,
  type Signer,
} from "./client";

// Server exports
export {
  X402Server,
  createX402Server,
  x402Middleware,
  type X402ServerConfig,
  type PaymentOptions,
} from "./server";

// Utilities - All EVM transaction helpers (matching Solana SDK naming)
export {
  // Connection/Client creation
  createConnection, // Primary - matches Solana SDK
  createPublicClientForNetwork, // Alias for viem users
  createWalletClientForNetwork,
  getRpcEndpoint,
  getChainId,
  
  // Transaction creation (unsigned) - exact match with Solana SDK
  createPaymentTransaction,
  createETHPaymentTransaction,
  createTokenPaymentTransaction,
  
  // Transaction signing & sending - exact match with Solana SDK
  signAndSendTransaction,
  sendPaymentTransaction,
  sendETHPayment,
  sendTokenPayment,
  sendTokenPaymentRaw,
  
  // Transaction confirmation & status - exact match with Solana SDK
  waitForTransaction,
  confirmTransaction,
  getTransactionStatus,
  verifyPaymentTransaction, // SECURITY CRITICAL: Use for server-side validation
  
  // Amount conversion - exact match with Solana SDK
  amountToBaseUnits,
  baseUnitsToAmount,
  
  // Constants
  CHAINS,
  CHAIN_IDS,
  TOKEN_ADDRESSES,
  TOKEN_DECIMALS,
  ERC20_ABI,
  
  // Types
  type ETHTransactionRequest,
  type TokenTransactionRequest,
} from "./evm-utils";

// Types
export {
  type PaymentRequirements,
  type PaymentProof,
  type Network,
  type TokenType,
  type PaymentScheme,
  type TransactionStatus,
  type SDKConfig,
  type X402Response,
  PaymentRequirementsSchema,
  PaymentProofSchema,
  NetworkSchema,
  TokenTypeSchema,
  PaymentSchemeSchema,
  TransactionStatusSchema,
  SDKConfigSchema,
  X402Error,
  PaymentRequiredError,
  TransactionFailedError,
  InvalidPaymentProofError,
} from "./x402-types";

// Chain Registry - Centralized chain configuration
export {
  // Types
  type NetworkId,
  type TokenSymbol,
  type NativeTokenSymbol,
  type TokenConfig,
  type ChainMetadata,
  
  // Registry
  CHAIN_REGISTRY,
  
  // Chain definitions
  mantleSepolia,
  cronos,
  cronosTestnet,
  
  // Helper functions
  getSupportedNetworks,
  isValidNetwork,
  getChainMetadata,
  getViemChain,
  getRpcUrl,
  getExplorerUrl,
  getTxExplorerUrl,
  isNativeToken,
  getTokenDecimals,
  getTokenAddress,
  getAvailableTokens,
  getDefaultPaymentToken,
  getCurrencyDisplayName,
  getNetworkByChainId,
  getTestnetNetworks,
  getMainnetNetworks,
} from "./chains";

// Version
export const VERSION = "1.0.0";
