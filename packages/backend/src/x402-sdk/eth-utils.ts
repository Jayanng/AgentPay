/**
 * Re-export Ethereum utilities from x402-sdk-eth
 * This allows the backend to use the SDK
 */

// Import everything from the SDK source (works with tsx dev mode)
// When building for production, run `pnpm --filter @agentpay/x402-sdk run build` first
// and switch to `../../../x402-sdk-eth/dist/index.mjs`
import * as ethSdk from "../../../x402-sdk-eth/src/index.js";

// Re-export what we need
export const createConnection = ethSdk.createConnection;
export const createPublicClientForNetwork = ethSdk.createPublicClientForNetwork;
export const getRpcEndpoint = ethSdk.getRpcEndpoint;
export const getChainId = ethSdk.getChainId;
export const verifyPaymentTransaction = ethSdk.verifyPaymentTransaction;
export const amountToBaseUnits = ethSdk.amountToBaseUnits;
export const baseUnitsToAmount = ethSdk.baseUnitsToAmount;
export const CHAINS = ethSdk.CHAINS;
export const CHAIN_IDS = ethSdk.CHAIN_IDS;
export const TOKEN_ADDRESSES = ethSdk.TOKEN_ADDRESSES;
export const TOKEN_DECIMALS = ethSdk.TOKEN_DECIMALS;
export const PaymentRequirementsSchema = ethSdk.PaymentRequirementsSchema;
export const PaymentProofSchema = ethSdk.PaymentProofSchema;

// Re-export types
export type PaymentRequirements = {
  scheme: "exact" | "spay" | "upto";
  network: string;
  chainId: number;
  amount: string;
  token: "ETH" | "USDC" | "USDT" | "DAI" | "CRO" | "MNT" ;
  recipient: string;
  memo?: string;
  deadline?: number;
  requestId?: string;
};

export type PaymentProof = {
  transactionHash: string;
  network: string;
  chainId: number;
  requestId?: string;
  timestamp: number;
};

export type Network = "mainnet" | "sepolia" | "base" | "base-sepolia" | "polygon" | "polygon-amoy" | "arbitrum" | "arbitrum-sepolia" | "optimism" | "optimism-sepolia" | "mantle-sepolia" | "cronos" | "cronos-testnet" ;
export type TokenType = "ETH" | "USDC" | "USDT" | "DAI" | "CRO" | "MNT" ;
