/**
 * Agent Configuration
 *
 * Loads and validates environment variables for the AI agent.
 * Supports two wallet modes:
 * 1. CAW Mode (Cobo Agentic Wallet) — Set CAW_API_KEY + CAW_WALLET_ID
 * 2. Viem Mode (Private Key) — Set WALLET_PRIVATE_KEY (legacy)
 */
import "dotenv/config";

export interface AgentConfig {
  // LLM
  llmProvider: "anthropic" | "openai" | "google";
  llmModel: string;
  llmApiKey: string;

  // Merchant
  merchantUrl: string;

  // Wallet Mode
  walletMode: "caw" | "viem";

  // Viem Wallet (legacy)
  walletPrivateKey?: `0x${string}`;

  // CAW Wallet (Cobo Agentic Wallet)
  cawApiKey?: string;
  cawWalletId?: string;
  cawApiUrl?: string;
  cawChainId?: string;
  cawTokenId?: string;

  // Chain
  network: string;
  chainId: number;
  rpcUrl: string;
  usdcAddress: `0x${string}`;

  // Behavior
  maxSteps: number;
  autoApprovePayments: boolean;
  verbose: boolean;
}

export function loadConfig(): AgentConfig {
  const provider = (process.env.LLM_PROVIDER || "anthropic") as
    | "anthropic"
    | "openai"
    | "google";

  const apiKeyMap: Record<string, string | undefined> = {
    anthropic: process.env.ANTHROPIC_API_KEY,
    openai: process.env.OPENAI_API_KEY,
    google: process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY,
  };
  const envVarMap: Record<string, string> = {
    anthropic: "ANTHROPIC_API_KEY",
    openai: "OPENAI_API_KEY",
    google: "GOOGLE_GENERATIVE_AI_API_KEY",
  };

  const llmApiKey = apiKeyMap[provider];
  if (!llmApiKey) {
    throw new Error(`Missing API key: set ${envVarMap[provider]}`);
  }

  // Determine wallet mode
  const cawApiKey = process.env.CAW_API_KEY;
  const cawWalletId = process.env.CAW_WALLET_ID;
  const walletMode: "caw" | "viem" = (cawApiKey && cawWalletId) ? "caw" : "viem";

  const walletPrivateKey = process.env.WALLET_PRIVATE_KEY;
  if (walletMode === "viem" && !walletPrivateKey?.startsWith("0x")) {
    throw new Error("WALLET_PRIVATE_KEY must be set (0x-prefixed hex) or set CAW_API_KEY + CAW_WALLET_ID for CAW mode");
  }

  // Network configuration
  const network = process.env.X402_CHAIN || "sepolia";
  const chainConfigs: Record<string, { chainId: number; rpcUrl: string; usdcAddress: string }> = {
    sepolia: { chainId: 11155111, rpcUrl: "https://rpc.sepolia.org", usdcAddress: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238" },
  };

  const chainConfig = chainConfigs[network] || chainConfigs["sepolia"];

  // Default to Sepolia (ETH) testnet for Agent-Native Payments
  if (!chainConfigs[network]) {
    console.warn(`[config] Unknown network "${network}", falling back to Sepolia`);
  }

  return {
    llmProvider: provider,
    llmModel:
      process.env.LLM_MODEL ||
      ({ anthropic: "claude-sonnet-4-20250514", openai: "gpt-4o", google: "gemini-2.0-flash" }[provider] ?? "claude-sonnet-4-20250514"),
    llmApiKey,
    merchantUrl: process.env.MERCHANT_URL || "http://localhost:1337",
    walletMode,
    walletPrivateKey: walletPrivateKey as `0x${string}` | undefined,
    cawApiKey,
    cawWalletId,
    cawApiUrl: process.env.CAW_API_URL || "https://api.agenticwallet.cobo.com",
    cawChainId: process.env.CAW_CHAIN_ID,
    cawTokenId: process.env.CAW_TOKEN_ID,
    network,
    chainId: parseInt(process.env.CHAIN_ID || String(chainConfig.chainId), 10),
    rpcUrl: process.env.RPC_URL || chainConfig.rpcUrl,
    usdcAddress: (process.env.USDC_ADDRESS || chainConfig.usdcAddress) as `0x${string}`,
    maxSteps: parseInt(process.env.MAX_STEPS || "20", 10),
    autoApprovePayments: process.env.AUTO_APPROVE_PAYMENTS === "true",
    verbose: process.env.VERBOSE !== "false",
  };
}
