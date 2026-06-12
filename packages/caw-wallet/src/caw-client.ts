/**
 * Cobo Agentic Wallet (CAW) REST API Client.
 *
 * Wraps all CAW API endpoints needed for Agent-Native Payments:
 * - Wallet creation and management
 * - Pact creation (authorization with permission policies)
 * - Token transfers (the core payment primitive)
 * - Contract calls (for future extensions)
 * - Faucet deposits (testnet funding)
 * - Audit log queries
 *
 * API Docs: https://www.cobo.com/products/agentic-wallet/manual/developer/quickstart-overview
 */

import type {
  CawConfig,
  CawWallet,
  CreateWalletRequest,
  SubmitPactRequest,
  PactResponse,
  TransferRequest,
  ContractCallRequest,
  TransactionResponse,
  FaucetDepositRequest,
  CreateApiKeyRequest,
  ApiKeyResponse,
  AuditLogEntry,
  CawApiError as CawApiErrorType,
} from "./types.js";

import { CawApiError } from "./types.js";

// ─── Logging ─────────────────────────────────────────────────────────────────

function log(message: string) {
  console.error(`[caw-client] ${message}`);
}

// ─── HTTP Helper ─────────────────────────────────────────────────────────────

async function apiRequest<T>(
  apiUrl: string,
  apiKey: string,
  method: "GET" | "POST" | "PUT" | "DELETE",
  path: string,
  body?: unknown
): Promise<T> {
  const url = `${apiUrl}${path}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-API-Key": apiKey,
  };

  const options: RequestInit = {
    method,
    headers,
  };

  if (body && (method === "POST" || method === "PUT")) {
    options.body = JSON.stringify(body);
  }

  log(`${method} ${path}`);

  const response = await fetch(url, options);

  if (!response.ok) {
    let errorBody: Record<string, unknown>;
    try {
      errorBody = await response.json() as Record<string, unknown>;
    } catch {
      errorBody = { message: await response.text() };
    }

    const errorCode = (errorBody.error_code || errorBody.code || "UNKNOWN") as string;
    const errorMessage = (errorBody.message || errorBody.error || `HTTP ${response.status}`) as string;

    throw new CawApiError(
      response.status,
      errorCode,
      errorMessage,
      errorBody
    );
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return response.json() as T;
}

// ─── CAW Client ──────────────────────────────────────────────────────────────

export class CawClient {
  private config: CawConfig;

  constructor(config: CawConfig) {
    this.config = config;
  }

  // ─── Wallet Management ──────────────────────────────────────────────

  /**
   * Create a new agent wallet.
   * POST /api/v1/wallets
   */
  async createWallet(request: CreateWalletRequest): Promise<CawWallet> {
    return apiRequest<CawWallet>(
      this.config.apiUrl,
      this.config.apiKey,
      "POST",
      "/api/v1/wallets",
      request
    );
  }

  /**
   * List all wallets.
   * GET /api/v1/wallets
   */
  async listWallets(): Promise<CawWallet[]> {
    const result = await apiRequest<{ wallets: CawWallet[] }>(
      this.config.apiUrl,
      this.config.apiKey,
      "GET",
      "/api/v1/wallets"
    );
    return result.wallets || [];
  }

  /**
   * Get wallet by ID.
   * GET /api/v1/wallets/{walletId}
   */
  async getWallet(walletId: string): Promise<CawWallet> {
    return apiRequest<CawWallet>(
      this.config.apiUrl,
      this.config.apiKey,
      "GET",
      `/api/v1/wallets/${walletId}`
    );
  }

  // ─── Pact Management ────────────────────────────────────────────────

  /**
   * Submit a new pact (authorization with policies).
   * POST /api/v1/pacts
   *
   * Pacts are the core authorization mechanism in CAW.
   * They define what an agent is allowed to do: which chains,
   * which tokens, spending limits, and destination restrictions.
   */
  async submitPact(request: SubmitPactRequest): Promise<PactResponse> {
    return apiRequest<PactResponse>(
      this.config.apiUrl,
      this.config.apiKey,
      "POST",
      "/api/v1/pacts",
      request
    );
  }

  /**
   * Get pact by ID.
   * GET /api/v1/pacts/{pactId}
   */
  async getPact(pactId: string): Promise<PactResponse> {
    return apiRequest<PactResponse>(
      this.config.apiUrl,
      this.config.apiKey,
      "GET",
      `/api/v1/pacts/${pactId}`
    );
  }

  /**
   * List all pacts.
   * GET /api/v1/pacts
   */
  async listPacts(walletId?: string): Promise<PactResponse[]> {
    const path = walletId
      ? `/api/v1/pacts?wallet_id=${walletId}`
      : "/api/v1/pacts";
    const result = await apiRequest<{ pacts: PactResponse[] }>(
      this.config.apiUrl,
      this.config.apiKey,
      "GET",
      path
    );
    return result.pacts || [];
  }

  /**
   * Revoke a pact.
   * POST /api/v1/pacts/{pactId}/revoke
   */
  async revokePact(pactId: string): Promise<PactResponse> {
    return apiRequest<PactResponse>(
      this.config.apiUrl,
      this.config.apiKey,
      "POST",
      `/api/v1/pacts/${pactId}/revoke`
    );
  }

  /**
   * Wait for a pact to become ACTIVE, then return it (with the scoped API key).
   * Polls every 2 seconds for up to 60 seconds.
   */
  async waitForPactActive(pactId: string, timeoutMs = 60_000): Promise<PactResponse> {
    const start = Date.now();
    const interval = 2_000;

    while (Date.now() - start < timeoutMs) {
      const pact = await this.getPact(pactId);

      if (pact.status === "ACTIVE") {
        log(`Pact ${pactId} is ACTIVE`);
        return pact;
      }

      if (pact.status === "REJECTED") {
        throw new Error(`Pact ${pactId} was rejected`);
      }

      if (pact.status === "EXPIRED" || pact.status === "REVOKED") {
        throw new Error(`Pact ${pactId} is ${pact.status}`);
      }

      log(`Pact ${pactId} status: ${pact.status}, waiting...`);
      await new Promise((resolve) => setTimeout(resolve, interval));
    }

    throw new Error(`Pact ${pactId} did not become ACTIVE within ${timeoutMs}ms`);
  }

  // ─── Transfers ──────────────────────────────────────────────────────

  /**
   * Transfer tokens from the agent's wallet.
   * POST /api/v1/wallets/{walletId}/transfer
   *
   * This is the core payment primitive for Agent-Native Payments.
   * The transfer is evaluated against the active Pact's policies:
   * - Is the chain allowed?
   * - Is the token allowed?
   * - Is the amount within limits?
   * - Is the destination whitelisted?
   */
  async transferTokens(request: TransferRequest): Promise<TransactionResponse> {
    return apiRequest<TransactionResponse>(
      this.config.apiUrl,
      this.config.apiKey,
      "POST",
      `/api/v1/wallets/${request.wallet_id}/transfer`,
      {
        chain_id: request.chain_id,
        token_id: request.token_id,
        dst_addr: request.dst_addr,
        amount: request.amount,
        request_id: request.request_id,
      }
    );
  }

  /**
   * Execute a contract call from the agent's wallet.
   * POST /api/v1/wallets/{walletId}/contract-call
   */
  async contractCall(request: ContractCallRequest): Promise<TransactionResponse> {
    return apiRequest<TransactionResponse>(
      this.config.apiUrl,
      this.config.apiKey,
      "POST",
      `/api/v1/wallets/${request.wallet_id}/contract-call`,
      {
        chain_id: request.chain_id,
        contract_addr: request.contract_addr,
        calldata: request.calldata,
        value: request.value || "0",
        request_id: request.request_id,
        sponsor: request.sponsor || false,
      }
    );
  }

  // ─── Faucet (Testnet) ───────────────────────────────────────────────

  /**
   * Deposit testnet tokens from the faucet.
   * POST /api/v1/faucet/deposit
   *
   * Token IDs for Sepolia:
   *   SETH      — Sepolia ETH
   *   SETH_USDC — Sepolia USDC
   */
  async faucetDeposit(request: FaucetDepositRequest): Promise<TransactionResponse> {
    return apiRequest<TransactionResponse>(
      this.config.apiUrl,
      this.config.apiKey,
      "POST",
      "/api/v1/faucet/deposit",
      request
    );
  }

  // ─── API Keys ───────────────────────────────────────────────────────

  /**
   * Create a new API key.
   * POST /api/v1/api-keys
   */
  async createApiKey(request: CreateApiKeyRequest): Promise<ApiKeyResponse> {
    return apiRequest<ApiKeyResponse>(
      this.config.apiUrl,
      this.config.apiKey,
      "POST",
      "/api/v1/api-keys",
      request
    );
  }

  // ─── Audit Logs ─────────────────────────────────────────────────────

  /**
   * Query audit logs.
   * GET /api/v1/audit-logs
   */
  async getAuditLogs(walletId?: string): Promise<AuditLogEntry[]> {
    const path = walletId
      ? `/api/v1/audit-logs?wallet_id=${walletId}`
      : "/api/v1/audit-logs";
    const result = await apiRequest<{ logs: AuditLogEntry[] }>(
      this.config.apiUrl,
      this.config.apiKey,
      "GET",
      path
    );
    return result.logs || [];
  }

  // ─── SSE Events ─────────────────────────────────────────────────────

  /**
   * Subscribe to real-time events via Server-Sent Events.
   * GET /api/v1/events/stream
   */
  getEventStream(): EventSource | null {
    if (typeof EventSource === "undefined") {
      log("EventSource not available in this environment");
      return null;
    }

    const url = `${this.config.apiUrl}/api/v1/events/stream`;
    const eventSource = new EventSource(url);
    return eventSource;
  }

  // ─── Config Accessors ───────────────────────────────────────────────

  getConfig(): CawConfig {
    return this.config;
  }

  getWalletId(): string {
    return this.config.walletId;
  }

  getChainId(): string {
    return this.config.cawChainId;
  }

  getTokenId(): string {
    return this.config.cawTokenId;
  }
}
