/**
 * Type definitions for Cobo Agentic Wallet (CAW) integration.
 *
 * These types mirror the CAW REST API request/response structures.
 * API Base URL: https://api.agenticwallet.cobo.com
 */

// ─── Configuration ───────────────────────────────────────────────────────────

export interface CawConfig {
  /** CAW API base URL (default: https://api.agenticwallet.cobo.com) */
  apiUrl: string;
  /** CAW API key (owner-scoped or pact-scoped) */
  apiKey: string;
  /** CAW wallet ID (UUID) */
  walletId: string;
  /** Chain ID for CAW operations (e.g., "SETH" for Sepolia) */
  cawChainId: string;
  /** Token ID for payments (e.g., "SETH" for native ETH, "SETH_USDC" for USDC on Sepolia) */
  cawTokenId: string;
  /** EVM chain ID number (e.g., 11155111 for Sepolia) */
  evmChainId: number;
  /** Network name for x402 payment proofs (e.g., "sepolia") */
  networkName: string;
  /** Explorer URL base (e.g., "https://sepolia.etherscan.io") */
  explorerUrl: string;
  /** Max auto-payment amount in USD (default: 10.00) */
  maxAutoPayment: number;
}

// ─── Wallet ──────────────────────────────────────────────────────────────────

export interface CawWallet {
  wallet_id: string;
  wallet_type: string;
  name: string;
  status: "preparing" | "active" | "frozen" | "deleted";
  address?: string;
  group_type?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateWalletRequest {
  wallet_type: string;
  name: string;
  group_type?: string;
}

// ─── Pacts (Authorization) ───────────────────────────────────────────────────

export type PactStatus =
  | "PENDING_APPROVAL"
  | "ACTIVE"
  | "COMPLETED"
  | "EXPIRED"
  | "REVOKED"
  | "REJECTED";

export interface PactPolicy {
  name: string;
  type: "transfer" | "contract_call";
  rules: {
    effect: "allow";
    when: {
      chain_in?: string[];
      token_in?: Array<{ chain_id: string; token_id: string }>;
      target_in?: string[];
      destination_address_in?: string[];
    };
    deny_if?: {
      amount_gt?: string;
      amount_usd_gt?: string;
      usage_limits?: {
        rolling_24h?: {
          amount_usd_gt?: string;
          tx_count_gt?: number;
        };
      };
    };
    review_if?: {
      amount_usd_gt?: string;
    };
  };
}

export interface PactCompletionCondition {
  type: "time_elapsed" | "transaction_count";
  threshold: string;
}

export interface SubmitPactRequest {
  wallet_id: string;
  intent: string;
  spec: {
    policies: PactPolicy[];
    completion_conditions: PactCompletionCondition[];
  };
}

export interface PactResponse {
  pact_id: string;
  wallet_id: string;
  intent: string;
  status: PactStatus;
  api_key?: string; // Only present when status is ACTIVE
  spec: SubmitPactRequest["spec"];
  created_at: string;
  updated_at: string;
}

// ─── Transfers ───────────────────────────────────────────────────────────────

export interface TransferRequest {
  wallet_id: string;
  chain_id: string;
  token_id: string;
  dst_addr: string;
  amount: string;
  request_id?: string; // Idempotency key
}

export interface ContractCallRequest {
  wallet_id: string;
  chain_id: string;
  contract_addr: string;
  calldata: string;
  value?: string;
  request_id?: string;
  sponsor?: boolean;
}

export interface TransactionResponse {
  request_id: string;
  tx_id: string;
  status: "submitted" | "confirmed" | "failed";
  tx_hash?: string;
  chain_id: string;
  created_at: string;
}

// ─── Faucet ──────────────────────────────────────────────────────────────────

export interface FaucetDepositRequest {
  address: string;
  token_id: string;
}

// ─── API Key ─────────────────────────────────────────────────────────────────

export interface CreateApiKeyRequest {
  wallet_id: string;
  scopes: string[];
  name?: string;
}

export interface ApiKeyResponse {
  api_key_id: string;
  api_key: string; // Only returned once at creation
  scopes: string[];
  created_at: string;
}

// ─── Audit Log ───────────────────────────────────────────────────────────────

export interface AuditLogEntry {
  log_id: string;
  action: string;
  status: "allowed" | "denied" | "pending";
  wallet_id: string;
  details: Record<string, unknown>;
  created_at: string;
}

// ─── x402 Payment ────────────────────────────────────────────────────────────

export interface PaymentRequirements {
  scheme: string;
  network: string;
  chainId: number;
  amount: string;
  token: string;
  recipient: string;
  maxAmountRequired: string;
  resource: string;
  description?: string;
}

export interface PaymentProof {
  txHash: string;
  transactionHash: string;
  network: string;
  chainId: number;
  timestamp: number;
}

export interface X402PaymentResult {
  success: boolean;
  txHash?: string;
  amount?: number;
  currency?: string;
  explorer?: string;
  error?: string;
  policyDenied?: PolicyDenial;
  payment?: {
    amount: number;
    currency: string;
    txHash?: string;
    explorer?: string;
  };
}

export interface PolicyDenial {
  code: string;
  message: string;
  details: Record<string, unknown>;
  suggestion?: string;
}

// ─── Balance ─────────────────────────────────────────────────────────────────

export interface WalletBalance {
  wallet: string;
  network: string;
  balances: Record<string, string>;
  balancesRaw: Record<string, string>;
  maxAutoPayment: number;
  tokenContract: string;
  paymentCurrency: string;
  source: "caw" | "viem";
  cawWalletId?: string;
  pactId?: string;
}

// ─── Error ───────────────────────────────────────────────────────────────────

export class CawApiError extends Error {
  status: number;
  code: string;
  details: Record<string, unknown>;

  constructor(status: number, code: string, message: string, details: Record<string, unknown> = {}) {
    super(message);
    this.name = "CawApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export class CawPolicyDeniedError extends Error {
  denial: PolicyDenial;

  constructor(denial: PolicyDenial) {
    super(`Policy denied: ${denial.code} — ${denial.message}`);
    this.name = "CawPolicyDeniedError";
    this.denial = denial;
  }
}
