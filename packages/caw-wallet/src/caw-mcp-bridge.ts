/**
 * MCP Client Bridge for CAW Integration.
 *
 * This module replaces AgentPay's viem-based wallet with CAW
 * when CAW_API_KEY is configured. It provides the same interface
 * as the existing wallet.js/payment.js but routes all fund
 * operations through Cobo Agentic Wallet.
 *
 * Integration point: packages/mcp-client/src/wallet.js
 *
 * When CAW is active:
 * - All payments go through CAW API (not viem private key)
 * - Permission policies are enforced at the CAW layer
 * - Every transaction is audited by CAW
 * - Agent gets a CAW wallet instead of a raw private key wallet
 */

import { CawAgentWallet, getDefaultPolicies } from "./caw-agent-wallet.js";
import type { CawConfig, WalletBalance, X402PaymentResult } from "./types.js";

// ─── Logging ─────────────────────────────────────────────────────────────────

function log(message: string) {
  console.error(`[caw-mcp-bridge] ${message}`);
}

// ─── CAW MCP Bridge ──────────────────────────────────────────────────────────

export class CawMcpBridge {
  private wallet: CawAgentWallet;
  private initialized = false;

  constructor(env: Record<string, string | undefined>) {
    const config = buildCawConfig(env);
    this.wallet = new CawAgentWallet(config);
  }

  /**
   * Initialize the CAW wallet. Must be called before any operations.
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    await this.wallet.initialize();
    this.initialized = true;

    const info = this.wallet.getWalletInfo();
    const pact = this.wallet.getActivePact();

    log(`✓ CAW Wallet initialized`);
    log(`  Wallet ID: ${this.wallet.getConfig().walletId}`);
    log(`  Address: ${this.wallet.getAddress()}`);
    log(`  Network: ${this.wallet.getConfig().networkName}`);
    log(`  Pact ID: ${pact?.pact_id || "none"}`);
    log(`  Pact Status: ${pact?.status || "none"}`);
  }

  /**
   * Get wallet balance. Same interface as wallet.js getWalletBalance().
   */
  async getBalance(): Promise<WalletBalance> {
    this.ensureInitialized();
    return this.wallet.getBalance();
  }

  /**
   * Send tokens. Same interface as wallet.js sendToken().
   */
  async sendToken(to: string, amount: string, memo?: string): Promise<{
    success: boolean;
    to: string;
    amount: number;
    currency: string;
    memo: string | null;
    txHash?: string;
    network: string;
    explorer?: string;
    error?: string;
    policyDenied?: { code: string; message: string; suggestion?: string };
  }> {
    this.ensureInitialized();

    // Parse amount to base units (USDC has 6 decimals)
    const amountToken = parseFloat(amount);
    if (isNaN(amountToken) || amountToken <= 0) {
      return { success: false, to, amount: amountToken, currency: "USDC", memo: memo || null, network: this.wallet.getConfig().networkName, error: "Invalid amount" };
    }

    const amountBaseUnits = Math.floor(amountToken * 1_000_000).toString();

    const result = await this.wallet.makePayment(to, amountBaseUnits);

    if (!result.success) {
      return {
        success: false,
        to,
        amount: amountToken,
        currency: "USDC",
        memo: memo || null,
        network: this.wallet.getConfig().networkName,
        error: result.error,
        policyDenied: result.policyDenied ? {
          code: result.policyDenied.code,
          message: result.policyDenied.message,
          suggestion: result.policyDenied.suggestion,
        } : undefined,
      };
    }

    const config = this.wallet.getConfig();
    return {
      success: true,
      to,
      amount: amountToken,
      currency: "USDC",
      memo: memo || null,
      txHash: result.txHash,
      network: config.networkName,
      explorer: result.txHash ? `${config.explorerUrl}/tx/${result.txHash}` : undefined,
    };
  }

  /**
   * Execute x402 request with automatic CAW payment.
   * Same interface as tools/requests.js x402Request().
   */
  async x402Request(params: {
    url: string;
    method?: string;
    headers?: Record<string, string>;
    body?: unknown;
    maxPayment?: number;
  }): Promise<{
    status?: number;
    paid?: boolean;
    data?: unknown;
    payment?: {
      amount: number;
      currency: string;
      txHash?: string;
      explorer?: string;
    };
    error?: string;
  }> {
    this.ensureInitialized();

    const result = await this.wallet.x402Fetch(params.url, {
      method: params.method || "GET",
      headers: params.headers,
      body: params.body,
      maxPayment: params.maxPayment,
    });

    return {
      status: result.status,
      paid: result.paid,
      data: result.data,
      payment: result.payment,
      error: result.error,
    };
  }

  /**
   * Check if CAW is properly configured.
   */
  isConfigured(): boolean {
    return this.initialized;
  }

  /**
   * Get the agent's wallet address.
   */
  getAddress(): string {
    return this.wallet.getAddress();
  }

  /**
   * Get the active pact info (for audit/display).
   */
  getPactInfo() {
    return this.wallet.getActivePact();
  }

  /**
   * Get audit logs from CAW.
   */
  async getAuditLogs() {
    this.ensureInitialized();
    return this.wallet.getAuditLogs();
  }

  /**
   * Fund wallet from testnet faucet.
   */
  async fundFromFaucet() {
    this.ensureInitialized();
    return this.wallet.fundFromFaucet();
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error("CawMcpBridge not initialized. Call init() first.");
    }
  }
}

// ─── Config Builder ──────────────────────────────────────────────────────────

/**
 * Build CAW config from environment variables.
 *
 * Required:
 * - CAW_API_KEY: Cobo Agentic Wallet API key
 * - CAW_WALLET_ID: Cobo Agentic Wallet ID (UUID)
 *
 * Optional:
 * - CAW_API_URL: API base URL (default: https://api.agenticwallet.cobo.com)
 * - CAW_CHAIN_ID: CAW chain identifier (default: SETH for Sepolia)
 * - CAW_TOKEN_ID: CAW token identifier (default: SETH_USDC for Sepolia USDC)
 * - X402_CHAIN: AgentPay network name (default: sepolia)
 * - MAX_AUTO_PAYMENT: Max auto-payment in USD (default: 10.00)
 */
export function buildCawConfig(env: Record<string, string | undefined>): Partial<CawConfig> & { apiKey: string; walletId: string } {
  const apiKey = env.CAW_API_KEY;
  const walletId = env.CAW_WALLET_ID;

  if (!apiKey || !walletId) {
    throw new Error(
      "CAW integration requires CAW_API_KEY and CAW_WALLET_ID environment variables. " +
      "Get these from: https://agenticwallet.cobo.com"
    );
  }

  const network = env.X402_CHAIN || "sepolia";

  return {
    apiKey,
    walletId,
    apiUrl: env.CAW_API_URL || "https://api.agenticwallet.cobo.com",
    cawChainId: env.CAW_CHAIN_ID,
    cawTokenId: env.CAW_TOKEN_ID,
    networkName: network,
    maxAutoPayment: parseFloat(env.MAX_AUTO_PAYMENT || "10.00"),
  };
}

/**
 * Check if CAW is enabled via environment variables.
 */
export function isCawEnabled(env: Record<string, string | undefined>): boolean {
  return !!(env.CAW_API_KEY && env.CAW_WALLET_ID);
}
