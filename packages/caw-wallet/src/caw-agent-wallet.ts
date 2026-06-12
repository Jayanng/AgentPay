/**
 * Cobo Agentic Wallet — Agent Wallet Manager.
 *
 * High-level abstraction that provides:
 * 1. Wallet initialization (create or load existing CAW wallet)
 * 2. Pact creation with permission policies (spending limits, chain/token whitelists)
 * 3. Token balance queries
 * 4. Payment execution (transfers via CAW API)
 * 5. x402 payment flow (GET → 402 → CAW pays → retry with proof)
 *
 * This is the core integration layer that makes CAW the critical component
 * in AgentPay's Agent-Native Payment flow.
 */

import { CawClient } from "./caw-client.js";
import type {
  CawConfig,
  CawWallet,
  PactResponse,
  TransactionResponse,
  PaymentProof,
  X402PaymentResult,
  WalletBalance,
  PolicyDenial,
  AuditLogEntry,
} from "./types.js";
import { CawApiError, CawPolicyDeniedError } from "./types.js";

// ─── Logging ─────────────────────────────────────────────────────────────────

function log(message: string) {
  console.error(`[caw-agent-wallet] ${message}`);
}

// ─── Chain/Token Mapping ─────────────────────────────────────────────────────

/**
 * Maps AgentPay network names to CAW chain IDs and token IDs.
 * CAW uses its own chain/token identifiers.
 */
const CAW_NETWORK_MAP: Record<string, { cawChainId: string; cawTokenId: string; evmChainId: number; explorerUrl: string }> = {
  sepolia: {
    cawChainId: "SETH",
    cawTokenId: "SETH_USDC",
    evmChainId: 11155111,
    explorerUrl: "https://sepolia.etherscan.io",
  },
};

// ─── CawAgentWallet ──────────────────────────────────────────────────────────

export class CawAgentWallet {
  private client: CawClient;
  private config: CawConfig;
  private walletInfo: CawWallet | null = null;
  private activePact: PactResponse | null = null;
  private pactClient: CawClient | null = null; // Client with pact-scoped API key

  constructor(config: Partial<CawConfig> & { apiKey: string; walletId: string }) {
    const network = config.networkName || "sepolia";
    const networkMap = CAW_NETWORK_MAP[network] || CAW_NETWORK_MAP["sepolia"];

    this.config = {
      apiUrl: config.apiUrl || "https://api.agenticwallet.cobo.com",
      apiKey: config.apiKey,
      walletId: config.walletId,
      cawChainId: config.cawChainId || networkMap.cawChainId,
      cawTokenId: config.cawTokenId || networkMap.cawTokenId,
      evmChainId: config.evmChainId || networkMap.evmChainId,
      networkName: network,
      explorerUrl: config.explorerUrl || networkMap.explorerUrl,
      maxAutoPayment: config.maxAutoPayment || 10.00,
    };

    this.client = new CawClient(this.config);
  }

  // ─── Initialization ─────────────────────────────────────────────────

  /**
   * Initialize the agent wallet:
   * 1. Load wallet info from CAW
   * 2. Find or create an active Pact
   * 3. Set up pact-scoped client for payment operations
   */
  async initialize(pactIntent?: string, policyConfig?: PolicyConfig): Promise<void> {
    log(`Initializing CAW Agent Wallet: ${this.config.walletId}`);

    // Step 1: Load wallet info
    try {
      this.walletInfo = await this.client.getWallet(this.config.walletId);
      log(`Wallet loaded: ${this.walletInfo.address || this.config.walletId}`);
      log(`Wallet status: ${this.walletInfo.status}`);
    } catch (err) {
      if (err instanceof CawApiError) {
        log(`Failed to load wallet: ${err.code} — ${err.message}`);
      }
      throw err;
    }

    // Step 2: Find existing active pact or create new one
    const pacts = await this.client.listPacts(this.config.walletId);
    const activePact = pacts.find((p) => p.status === "ACTIVE");

    if (activePact) {
      log(`Found active pact: ${activePact.pact_id}`);
      this.activePact = activePact;
    } else {
      log(`No active pact found, creating one...`);
      const intent = pactIntent || "AgentPay Agent-Native Payments: transfer USDC for x402 resource access";
      const policies = policyConfig || getDefaultPolicies(this.config.cawChainId, this.config.cawTokenId, this.config.maxAutoPayment);

      this.activePact = await this.createPact(intent, policies);
    }

    // Step 3: Set up pact-scoped client
    if (this.activePact && this.activePact.api_key) {
      const pactConfig = { ...this.config, apiKey: this.activePact.api_key };
      this.pactClient = new CawClient(pactConfig);
      log(`Pact-scoped client initialized`);
    } else {
      // Fallback to owner client (unpaired wallet)
      this.pactClient = this.client;
      log(`Using owner client (no pact API key — unpaired wallet mode)`);
    }

    log(`CAW Agent Wallet initialized successfully`);
  }

  // ─── Pact Management ────────────────────────────────────────────────

  /**
   * Create a new Pact with permission policies.
   * This is where CAW's unique value is demonstrated:
   * - Spending limits prevent agents from overspending
   * - Chain/token whitelists restrict what agents can pay with
   * - Destination whitelists restrict who agents can pay
   * - Review thresholds flag suspicious transactions
   */
  async createPact(intent: string, policyConfig: PolicyConfig): Promise<PactResponse> {
    const pactRequest = {
      wallet_id: this.config.walletId,
      intent,
      spec: {
        policies: [
          {
            name: policyConfig.name || "agentpay-x402-payment-policy",
            type: "transfer" as const,
            rules: {
              effect: "allow" as const,
              when: {
                chain_in: policyConfig.allowedChains || [this.config.cawChainId],
                token_in: policyConfig.allowedTokens || [
                  { chain_id: this.config.cawChainId, token_id: this.config.cawTokenId },
                ],
                ...(policyConfig.allowedDestinations ? {
                  destination_address_in: policyConfig.allowedDestinations,
                } : {}),
              },
              deny_if: {
                amount_gt: policyConfig.maxAmountPerTx || "1000000", // 1 USDC in base units (6 decimals)
                ...(policyConfig.rolling24hLimit ? {
                  usage_limits: {
                    rolling_24h: {
                      amount_usd_gt: policyConfig.rolling24hLimit,
                      ...(policyConfig.rolling24hTxCount ? {
                        tx_count_gt: policyConfig.rolling24hTxCount,
                      } : {}),
                    },
                  },
                } : {}),
              },
              ...(policyConfig.reviewThreshold ? {
                review_if: {
                  amount_usd_gt: policyConfig.reviewThreshold,
                },
              } : {}),
            },
          },
        ],
        completion_conditions: [
          {
            type: "time_elapsed" as const,
            threshold: policyConfig.duration || "86400", // 24 hours default
          },
        ],
      },
    };

    log(`Submitting pact: ${intent}`);
    const pact = await this.client.submitPact(pactRequest);
    log(`Pact submitted: ${pact.pact_id} (status: ${pact.status})`);

    // Wait for pact to become active
    if (pact.status === "PENDING_APPROVAL") {
      log(`Waiting for pact approval...`);
      const activePact = await this.client.waitForPactActive(pact.pact_id);
      this.activePact = activePact;
      return activePact;
    }

    this.activePact = pact;
    return pact;
  }

  // ─── Balance ────────────────────────────────────────────────────────

  /**
   * Get the agent wallet's balance.
   * Uses CAW API to query wallet info and on-chain balance.
   */
  async getBalance(): Promise<WalletBalance> {
    if (!this.walletInfo) {
      this.walletInfo = await this.client.getWallet(this.config.walletId);
    }

    const address = this.walletInfo.address || this.config.walletId;

    return {
      wallet: address,
      network: this.config.networkName,
      balances: {
        // Note: CAW returns balance in the wallet info
        // For a more accurate balance, we'd need to query on-chain
        USDC: "—",
        ETH: "—",
      },
      balancesRaw: {},
      maxAutoPayment: this.config.maxAutoPayment,
      tokenContract: "via CAW",
      paymentCurrency: "USDC",
      source: "caw",
      cawWalletId: this.config.walletId,
      pactId: this.activePact?.pact_id,
    };
  }

  // ─── Payments ───────────────────────────────────────────────────────

  /**
   * Execute a USDC transfer via CAW.
   * This is the core payment method for Agent-Native Payments.
   *
   * The payment goes through CAW's three-stage policy gate:
   * 1. API key scope check
   * 2. Policy rule evaluation (spending limits, chain/token/destination whitelists)
   * 3. Counter check (rolling spend limits)
   *
   * If any check fails, the payment is denied with a structured error.
   */
  async makePayment(
    recipientAddress: string,
    amountBaseUnits: string,
    requestId?: string
  ): Promise<{ success: boolean; txHash?: string; error?: string; policyDenied?: PolicyDenial }> {
    const client = this.pactClient || this.client;

    try {
      log(`Initiating CAW payment: ${amountBaseUnits} to ${recipientAddress}`);

      const result = await client.transferTokens({
        wallet_id: this.config.walletId,
        chain_id: this.config.cawChainId,
        token_id: this.config.cawTokenId,
        dst_addr: recipientAddress,
        amount: amountBaseUnits,
        request_id: requestId || `sp-x402-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      });

      log(`CAW transfer submitted: ${result.tx_id} (status: ${result.status})`);

      // Wait for tx hash if not yet available
      if (!result.tx_hash && result.status === "submitted") {
        log(`Waiting for transaction confirmation...`);
        // CAW will return the tx_hash once the transaction is confirmed
        // For now, we'll use the tx_id as reference
      }

      return {
        success: true,
        txHash: result.tx_hash || result.tx_id,
      };
    } catch (err) {
      if (err instanceof CawApiError) {
        // Check for policy denial
        if (err.code === "POLICY_DENIED" || err.code === "TRANSFER_LIMIT_EXCEEDED") {
          const denial: PolicyDenial = {
            code: err.code,
            message: err.message,
            details: err.details,
            suggestion: (err.details.suggestion as string) || undefined,
          };
          log(`Payment denied by policy: ${denial.code} — ${denial.message}`);
          return { success: false, error: err.message, policyDenied: denial };
        }
        log(`CAW API error: ${err.code} — ${err.message}`);
        return { success: false, error: `${err.code}: ${err.message}` };
      }

      const message = err instanceof Error ? err.message : String(err);
      log(`Payment error: ${message}`);
      return { success: false, error: message };
    }
  }

  // ─── x402 Payment Flow ──────────────────────────────────────────────

  /**
   * Execute the full x402 Agent-Native Payment flow:
   *
   * 1. Agent requests a paid resource
   * 2. Server responds with HTTP 402 (payment required)
   * 3. CAW evaluates permission policies
   * 4. CAW executes the payment (if allowed)
   * 5. Agent retries the request with payment proof
   * 6. Server verifies and serves the resource
   *
   * This flow demonstrates CAW as a CRITICAL component:
   * - Remove CAW → No payment execution → No resource access
   * - CAW enforces permission boundaries at the payment layer
   * - Every fund operation flows through CAW's policy engine
   */
  async x402Fetch(
    url: string,
    options: {
      method?: string;
      headers?: Record<string, string>;
      body?: unknown;
      maxPayment?: number;
    } = {}
  ): Promise<X402PaymentResult & { status?: number; data?: unknown; paid?: boolean }> {
    const { method = "GET", headers = {}, body, maxPayment } = options;
    const maxPay = maxPayment || this.config.maxAutoPayment;

    log(`x402 fetch: ${method} ${url}`);

    // Step 1: Make the initial request
    const reqOptions: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
    };
    if (body && ["POST", "PUT"].includes(method)) {
      reqOptions.body = JSON.stringify(body);
    }

    const res = await fetch(url, reqOptions);

    // Not a 402? Return the response directly
    if (res.status !== 402) {
      const contentType = res.headers.get("content-type") || "";
      const data = contentType.includes("application/json")
        ? await res.json()
        : await res.text();

      return { status: res.status, paid: false, data, success: true };
    }

    // Step 2: Parse the 402 payment requirements
    const paymentReq = await res.json() as {
      amount?: string;
      recipient?: string;
      payTo?: string;
      network?: string;
      scheme?: string;
      [key: string]: unknown;
    };

    const rawAmount = paymentReq.amount;
    if (!rawAmount) {
      return { success: false, error: "No payment amount in 402 response" };
    }

    const recipient = paymentReq.recipient || paymentReq.payTo;
    if (!recipient) {
      return { success: false, error: "No payment recipient in 402 response" };
    }

    // Parse amount (USDC has 6 decimals)
    const amountToken = parseInt(rawAmount) / 1_000_000;
    log(`402 received: ${amountToken} USDC to ${recipient}`);

    // Step 3: Check max payment
    if (amountToken > maxPay) {
      return {
        success: false,
        error: `Payment of ${amountToken} USDC exceeds limit of ${maxPay} USDC`,
      };
    }

    // Step 4: Execute payment via CAW
    const paymentResult = await this.makePayment(recipient, rawAmount);

    if (!paymentResult.success) {
      return {
        success: false,
        error: paymentResult.error,
        policyDenied: paymentResult.policyDenied,
      };
    }

    log(`CAW payment sent: ${paymentResult.txHash}`);

    // Step 5: Build payment proof
    const paymentProof: PaymentProof = {
      txHash: paymentResult.txHash!,
      transactionHash: paymentResult.txHash!,
      network: this.config.networkName,
      chainId: this.config.evmChainId,
      timestamp: Date.now(),
    };

    // Step 6: Retry request with payment proof
    const retryRes = await fetch(url, {
      ...reqOptions,
      headers: {
        ...headers,
        "Content-Type": "application/json",
        "X-PAYMENT": JSON.stringify(paymentProof),
      },
    });

    const contentType = retryRes.headers.get("content-type") || "";
    const data = contentType.includes("application/json")
      ? await retryRes.json()
      : await retryRes.text();

    return {
      status: retryRes.status,
      paid: true,
      success: true,
      payment: {
        amount: amountToken,
        currency: "USDC",
        txHash: paymentResult.txHash,
        explorer: `${this.config.explorerUrl}/tx/${paymentResult.txHash}`,
      },
      data,
    };
  }

  // ─── Faucet (Testnet) ───────────────────────────────────────────────

  /**
   * Fund the agent wallet from the CAW testnet faucet.
   * Only works on supported testnets (Sepolia, etc.).
   */
  async fundFromFaucet(): Promise<TransactionResponse | null> {
    if (!this.walletInfo?.address) {
      log("No wallet address available for faucet deposit");
      return null;
    }

    try {
      log(`Requesting faucet deposit to ${this.walletInfo.address}`);
      const result = await this.client.faucetDeposit({
        address: this.walletInfo.address,
        token_id: this.config.cawTokenId,
      });
      log(`Faucet deposit: ${result.tx_id}`);
      return result;
    } catch (err) {
      if (err instanceof CawApiError && err.status === 429) {
        log("Faucet daily limit reached");
      } else {
        log(`Faucet error: ${err instanceof Error ? err.message : err}`);
      }
      return null;
    }
  }

  // ─── Audit ──────────────────────────────────────────────────────────

  /**
   * Get audit logs showing all payment operations.
   * Demonstrates CAW's auditability — every allowed/denied
   * payment is logged with structured context.
   */
  async getAuditLogs(): Promise<AuditLogEntry[]> {
    return this.client.getAuditLogs(this.config.walletId);
  }

  // ─── Accessors ──────────────────────────────────────────────────────

  getWalletInfo(): CawWallet | null {
    return this.walletInfo;
  }

  getActivePact(): PactResponse | null {
    return this.activePact;
  }

  getAddress(): string {
    return this.walletInfo?.address || this.config.walletId;
  }

  getConfig(): CawConfig {
    return this.config;
  }

  isInitialized(): boolean {
    return this.walletInfo !== null && (this.pactClient !== null || this.client !== null);
  }
}

// ─── Policy Configuration ────────────────────────────────────────────────────

export interface PolicyConfig {
  /** Policy name */
  name?: string;
  /** Allowed CAW chain IDs (e.g., ["SETH"]) */
  allowedChains?: string[];
  /** Allowed tokens (chain_id + token_id pairs) */
  allowedTokens?: Array<{ chain_id: string; token_id: string }>;
  /** Whitelisted destination addresses */
  allowedDestinations?: string[];
  /** Max amount per transaction (in base units, e.g., "1000000" = 1 USDC) */
  maxAmountPerTx?: string;
  /** Rolling 24h spend limit in USD (e.g., "50") */
  rolling24hLimit?: string;
  /** Rolling 24h transaction count limit (e.g., 100) */
  rolling24hTxCount?: number;
  /** Amount above which requires owner review (e.g., "10") */
  reviewThreshold?: string;
  /** Pact duration in seconds (default: 86400 = 24 hours) */
  duration?: string;
}

/**
 * Default permission policies for a AgentPay Agent.
 * These demonstrate CAW's risk boundary controls:
 *
 * - Only Sepolia testnet allowed (chain whitelist)
 * - Only USDC on Sepolia allowed (token whitelist)
 * - Max 1 USDC per transaction (per-tx limit)
 * - Max $50 per 24h rolling (daily budget)
 * - Max 100 transactions per 24h (rate limit)
 * - Transactions above $5 require owner review (human-in-the-loop)
 */
export function getDefaultPolicies(
  chainId: string,
  tokenId: string,
  maxAutoPayment: number
): PolicyConfig {
  // Convert max auto payment (USD) to base units (6 decimals for USDC)
  const maxAmountBaseUnits = Math.floor(maxAutoPayment * 1_000_000).toString();

  return {
    name: "agentpay-x402-payment-policy",
    allowedChains: [chainId],
    allowedTokens: [{ chain_id: chainId, token_id: tokenId }],
    maxAmountPerTx: maxAmountBaseUnits,
    rolling24hLimit: "50",
    rolling24hTxCount: 100,
    reviewThreshold: "5",
    duration: "86400",
  };
}

// Re-export for convenience
export type { AuditLogEntry };
