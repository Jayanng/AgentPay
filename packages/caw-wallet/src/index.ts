/**
 * @agentpay/caw-wallet — Cobo Agentic Wallet (CAW) Integration for AgentPay
 *
 * Agent-Native Payments via x402 protocol, powered by Cobo Agentic Wallet.
 *
 * Architecture:
 * ┌─────────────┐     HTTP 402     ┌─────────────┐     CAW API     ┌─────────────┐
 * │ Agent (MCP)  │ ──────────────→ │ AgentPay    │ ──────────────→ │ Cobo        │
 * │              │ ←────────────── │ x402 Server  │ ←────────────── │ Agentic     │
 * │ CAW Wallet   │   X-PAYMENT    │              │   tx_hash       │ Wallet      │
 * └─────────────┘     proof        └─────────────┘                  └─────────────┘
 *
 * Flow:
 * 1. Agent requests paid resource → gets HTTP 402
 * 2. CAW evaluates permission policies (spending limits, whitelists)
 * 3. CAW executes USDC transfer (if allowed)
 * 4. Agent retries with payment proof → resource served
 *
 * CAW is the CRITICAL component: remove it and no payments can happen.
 * Every fund operation flows through CAW's policy engine.
 *
 * @module @agentpay/caw-wallet
 */

// Core client
export { CawClient } from "./caw-client.js";

// Agent wallet (high-level)
export { CawAgentWallet, getDefaultPolicies } from "./caw-agent-wallet.js";
export type { PolicyConfig } from "./caw-agent-wallet.js";

// MCP bridge (drop-in replacement for viem wallet)
export { CawMcpBridge, buildCawConfig, isCawEnabled } from "./caw-mcp-bridge.js";

// Types
export type {
  CawConfig,
  CawWallet,
  PactStatus,
  PactPolicy,
  PactCompletionCondition,
  SubmitPactRequest,
  PactResponse,
  TransferRequest,
  ContractCallRequest,
  TransactionResponse,
  FaucetDepositRequest,
  CreateApiKeyRequest,
  ApiKeyResponse,
  AuditLogEntry,
  PaymentRequirements,
  PaymentProof,
  X402PaymentResult,
  WalletBalance,
  PolicyDenial,
} from "./types.js";

export { CawApiError, CawPolicyDeniedError } from "./types.js";
